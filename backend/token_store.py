"""OS Keyring 기반 세션 토큰 저장.

Windows → Credential Locker, macOS → Keychain, Linux → Secret Service.
헤드리스 환경에서 백엔드가 없어도 에러 없이 동작하도록 감싼다.
"""
from __future__ import annotations

import json
import logging
from typing import Optional, TypedDict

import keyring
import keyring.errors

SERVICE_NAME = "image-rotator-v2"
KEY_USERNAME = "supabase-session"

log = logging.getLogger(__name__)


class StoredSession(TypedDict):
    access_token: str
    refresh_token: str
    email: str
    user_id: str


def save_session(session: StoredSession) -> bool:
    """세션을 키링에 저장. 실패 시 False."""
    try:
        keyring.set_password(SERVICE_NAME, KEY_USERNAME, json.dumps(session))
        return True
    except keyring.errors.KeyringError as exc:
        log.warning("Keyring 저장 실패: %s", exc)
        return False


def load_session() -> Optional[StoredSession]:
    """저장된 세션 로드. 없거나 파싱 실패 시 None."""
    try:
        raw = keyring.get_password(SERVICE_NAME, KEY_USERNAME)
    except keyring.errors.KeyringError as exc:
        log.warning("Keyring 조회 실패: %s", exc)
        return None
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        log.warning("저장된 세션이 손상되어 폐기합니다.")
        clear_session()
        return None
    required = ("access_token", "refresh_token", "email", "user_id")
    if not all(k in data and isinstance(data[k], str) for k in required):
        clear_session()
        return None
    return data  # type: ignore[return-value]


def clear_session() -> None:
    """저장된 세션 삭제. 원래 없었어도 조용히 통과."""
    try:
        keyring.delete_password(SERVICE_NAME, KEY_USERNAME)
    except keyring.errors.PasswordDeleteError:
        pass
    except keyring.errors.KeyringError as exc:
        log.warning("Keyring 삭제 실패: %s", exc)
