"""ImageRotator v2 엔트리 포인트.

PyWebView 창을 띄우고 `backend.api.Api` 를 JS 측에 노출한다.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import webview
from dotenv import load_dotenv

from backend.api import Api

ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_INDEX = ROOT_DIR / "frontend" / "index.html"


def _load_env() -> None:
    """프로젝트 루트의 .env 파일을 로드. 없으면 조용히 패스."""
    env_path = ROOT_DIR / ".env"
    if env_path.exists():
        load_dotenv(env_path)


def _check_config() -> list[str]:
    """필수 환경변수 점검. 누락된 키 이름 리스트 반환."""
    required = ["SUPABASE_URL", "SUPABASE_ANON_KEY"]
    return [key for key in required if not os.getenv(key)]


def main() -> int:
    _load_env()

    missing = _check_config()
    if missing:
        sys.stderr.write(
            "⚠️  환경변수가 누락되었습니다: "
            + ", ".join(missing)
            + "\n.env.example 을 참고해 .env 를 만들어주세요.\n"
        )
        # 개발 편의상 경고만 출력하고 계속 진행
        # (UI 에서 로그인 시점에 다시 명확히 알려줌)

    if not FRONTEND_INDEX.exists():
        sys.stderr.write(f"프론트엔드 파일을 찾을 수 없습니다: {FRONTEND_INDEX}\n")
        return 1

    api = Api()

    window = webview.create_window(
        title="이미지 로테이터 v2",
        url=str(FRONTEND_INDEX),
        js_api=api,
        width=1200,
        height=780,
        min_size=(960, 640),
        resizable=True,
        text_select=True,
    )
    api.attach_window(window)

    debug = bool(os.getenv("IMAGE_ROTATOR_DEBUG"))
    webview.start(debug=debug)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
