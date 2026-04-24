"""Supabase Auth 래퍼.

- sign_in / sign_up / sign_out / restore_session / get_current_user
- 모든 함수는 JSON-직렬화 가능한 dict (``AuthResult``) 를 반환한다.
- Supabase 예외는 한국어 친화 메시지로 변환한다.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Optional, TypedDict

from . import token_store
from .supabase_client import ConfigError, get_client

log = logging.getLogger(__name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LEN = 6


class AuthResult(TypedDict):
    ok: bool
    error: Optional[str]
    user_id: Optional[str]
    email: Optional[str]
    needs_confirmation: bool


# ---------------------------------------------------------------------
# 내부 헬퍼
# ---------------------------------------------------------------------

def _err(msg: str) -> AuthResult:
    return {
        "ok": False,
        "error": msg,
        "user_id": None,
        "email": None,
        "needs_confirmation": False,
    }


def _ok(user_id: str, email: str, needs_confirmation: bool = False) -> AuthResult:
    return {
        "ok": True,
        "error": None,
        "user_id": user_id,
        "email": email,
        "needs_confirmation": needs_confirmation,
    }


def _friendly_error(exc: Exception) -> str:
    msg = str(exc)
    lower = msg.lower()
    if "invalid login credentials" in lower or "invalid_credentials" in lower:
        return "이메일 또는 비밀번호가 올바르지 않습니다."
    if "email not confirmed" in lower:
        return "이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해주세요."
    if "user already registered" in lower or "already been registered" in lower:
        return "이미 가입된 이메일입니다."
    if "password should be at least" in lower or "weak password" in lower:
        return f"비밀번호가 너무 짧습니다 (최소 {MIN_PASSWORD_LEN}자)."
    if "unable to validate email" in lower or "invalid email" in lower:
        return "이메일 형식이 올바르지 않습니다."
    if any(x in lower for x in ("network", "connection", "timeout", "nameresolution", "getaddrinfo")):
        return "네트워크 오류입니다. 인터넷 연결을 확인해주세요."
    if "rate limit" in lower or "too many" in lower:
        return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
    return f"인증 오류: {msg}"


def _validate_credentials(email: str, password: str) -> Optional[str]:
    email = email.strip()
    if not email or not EMAIL_RE.match(email):
        return "이메일 형식이 올바르지 않습니다."
    if len(password) < MIN_PASSWORD_LEN:
        return f"비밀번호는 최소 {MIN_PASSWORD_LEN}자 이상이어야 합니다."
    return None


def _persist_from_response(resp: Any, fallback_email: str) -> Optional[AuthResult]:
    """AuthResponse 에서 session/user 를 꺼내 키링에 저장하고 AuthResult 반환."""
    session = getattr(resp, "session", None)
    user = getattr(resp, "user", None)
    if user is None:
        return None
    user_id = getattr(user, "id", None) or ""
    user_email = getattr(user, "email", None) or fallback_email

    if session is None:
        # 이메일 확인이 필요한 회원가입 케이스
        return _ok(user_id, user_email, needs_confirmation=True)

    token_store.save_session({
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "email": user_email,
        "user_id": user_id,
    })
    return _ok(user_id, user_email)


# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------

def sign_in(email: str, password: str) -> AuthResult:
    email = (email or "").strip()
    invalid = _validate_credentials(email, password or "")
    if invalid:
        return _err(invalid)
    try:
        client = get_client()
    except ConfigError as exc:
        return _err(str(exc))
    try:
        resp = client.auth.sign_in_with_password({"email": email, "password": password})
    except Exception as exc:
        log.warning("sign_in 실패: %s", exc)
        return _err(_friendly_error(exc))
    result = _persist_from_response(resp, fallback_email=email)
    return result if result is not None else _err("로그인에 실패했습니다.")


def sign_up(email: str, password: str) -> AuthResult:
    email = (email or "").strip()
    invalid = _validate_credentials(email, password or "")
    if invalid:
        return _err(invalid)
    try:
        client = get_client()
    except ConfigError as exc:
        return _err(str(exc))
    try:
        resp = client.auth.sign_up({"email": email, "password": password})
    except Exception as exc:
        log.warning("sign_up 실패: %s", exc)
        return _err(_friendly_error(exc))
    result = _persist_from_response(resp, fallback_email=email)
    return result if result is not None else _err("회원가입에 실패했습니다.")


def restore_session() -> AuthResult:
    """저장된 refresh_token 으로 세션 복원.

    성공 시 갱신된 토큰을 다시 저장한다. 실패 시 저장된 세션을 폐기한다.
    """
    stored = token_store.load_session()
    if not stored:
        return _err("저장된 세션이 없습니다.")
    try:
        client = get_client()
    except ConfigError as exc:
        return _err(str(exc))

    # 먼저 set_session 으로 현재 토큰 적용 시도, 실패하면 refresh
    resp = None
    try:
        resp = client.auth.set_session(stored["access_token"], stored["refresh_token"])
    except Exception as exc:
        log.info("set_session 실패, refresh 시도: %s", exc)

    needs_refresh = resp is None or getattr(resp, "session", None) is None
    if needs_refresh:
        try:
            resp = client.auth.refresh_session(stored["refresh_token"])
        except Exception as exc:
            log.warning("refresh_session 실패: %s", exc)
            token_store.clear_session()
            return _err("세션이 만료되었습니다. 다시 로그인해주세요.")

    result = _persist_from_response(resp, fallback_email=stored["email"])
    if result is None:
        token_store.clear_session()
        return _err("세션 복원에 실패했습니다. 다시 로그인해주세요.")
    return result


def sign_out() -> AuthResult:
    """로컬 토큰 삭제 + 가능하면 서버 세션 무효화."""
    try:
        client = get_client()
        client.auth.sign_out()
    except ConfigError:
        pass
    except Exception as exc:
        # 네트워크 문제 등으로 실패해도 로컬 로그아웃은 강행
        log.info("서버 sign_out 실패 (로컬 로그아웃은 진행): %s", exc)
    token_store.clear_session()
    return {
        "ok": True,
        "error": None,
        "user_id": None,
        "email": None,
        "needs_confirmation": False,
    }


def get_current_user() -> AuthResult:
    """현재 클라이언트에 세션이 있는지 확인."""
    try:
        client = get_client()
    except ConfigError as exc:
        return _err(str(exc))
    try:
        resp = client.auth.get_user()
    except Exception as exc:
        return _err(_friendly_error(exc))
    user = getattr(resp, "user", None)
    if user is None:
        return _err("로그인되지 않았습니다.")
    return _ok(user.id, user.email or "")
