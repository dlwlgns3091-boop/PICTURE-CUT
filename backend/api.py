"""JS ↔ Python 브릿지.

PyWebView의 ``js_api`` 로 노출되는 public 메서드들을 담당한다.
Phase 1 시점에는 헬스체크와 환경 점검만 구현되어 있고, 후속 Phase
에서 인증/업체/이미지/실행 메서드가 붙는다.
"""
from __future__ import annotations

import os
import platform
from typing import Any, Optional

import webview


class Api:
    """PyWebView JS 브릿지.

    JS 쪽에서는 ``pywebview.api.<method>(...)`` 로 호출한다. 모든 메서드는
    직렬화 가능한 dict/primitive 만 반환한다.
    """

    def __init__(self) -> None:
        self._window: Optional[webview.Window] = None

    # ------------------------------------------------------------------
    # 내부 유틸
    # ------------------------------------------------------------------
    def attach_window(self, window: webview.Window) -> None:
        """메인 윈도우를 연결한다. 파일 다이얼로그에 필요."""
        self._window = window

    # ------------------------------------------------------------------
    # Public API (JS 에서 호출)
    # ------------------------------------------------------------------
    def ping(self) -> dict[str, Any]:
        """헬스체크. JS 에서 로드 직후 호출해 브릿지 동작 확인."""
        return {
            "ok": True,
            "python": platform.python_version(),
            "platform": platform.system(),
        }

    def get_env_status(self) -> dict[str, Any]:
        """Supabase 환경변수 유무를 반환. UI 에서 초기 설정 안내용."""
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_ANON_KEY", "")
        return {
            "has_url": bool(url),
            "has_key": bool(key),
            "url_preview": (url[:32] + "…") if len(url) > 32 else url,
        }

    def pick_directory(self, initial: Optional[str] = None) -> Optional[str]:
        """폴더 선택 다이얼로그. 취소 시 None."""
        if self._window is None:
            return None
        result = self._window.create_file_dialog(
            webview.FOLDER_DIALOG,
            directory=initial or "",
        )
        if not result:
            return None
        # pywebview 는 튜플을 반환할 수도, 문자열을 반환할 수도 있음
        return result[0] if isinstance(result, (list, tuple)) else str(result)

    def pick_image_files(self) -> list[str]:
        """이미지 파일 다중 선택. 취소 시 빈 리스트."""
        if self._window is None:
            return []
        result = self._window.create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=True,
            file_types=("이미지 파일 (*.jpg;*.jpeg;*.png;*.webp)", "모든 파일 (*.*)"),
        )
        if not result:
            return []
        return list(result)
