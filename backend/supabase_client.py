"""Supabase 클라이언트 싱글턴 팩토리.

``get_client()`` 는 `.env` 의 SUPABASE_URL / SUPABASE_ANON_KEY 로 초기화된
싱글턴을 반환한다. 환경변수가 없으면 ``ConfigError`` 발생.
"""
from __future__ import annotations

import os
from typing import Optional

from supabase import Client, create_client


class ConfigError(RuntimeError):
    """환경변수 누락 등 설정 오류."""


_client: Optional[Client] = None


def get_client() -> Client:
    """Supabase 클라이언트를 반환 (처음 호출 시 생성)."""
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL", "").strip()
        key = os.getenv("SUPABASE_ANON_KEY", "").strip()
        if not url or not key:
            raise ConfigError(
                "SUPABASE_URL / SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다. "
                ".env 파일을 확인해주세요."
            )
        _client = create_client(url, key)
    return _client


def reset_client() -> None:
    """클라이언트 재생성 (로그아웃/env 변경 시)."""
    global _client
    _client = None
