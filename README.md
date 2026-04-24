# 이미지 로테이터 v2

블로그 포스팅용 이미지 자동 변형 도구. PyWebView 기반 데스크톱 앱 +
Supabase 백엔드(이미지/이력 클라우드 저장).

---

## 📦 현재 상태 (Phase 2 완료)

- ✅ 프로젝트 구조 / 빌드 설정
- ✅ Supabase 스키마 (`supabase/schema.sql`)
- ✅ PyWebView 창 + JS↔Python 브릿지
- ✅ HTML/CSS/JS 기본 레이아웃 (사이드바 · 상세 · 모달 · 토스트)
- ✅ Supabase Auth 로그인/회원가입/로그아웃
- ✅ Keyring 기반 자동 로그인
- ⏳ 업체 CRUD (Phase 3)
- ⏳ 이미지 업로드 (Phase 4)
- ⏳ 실행 로직 (Phase 5)
- ⏳ 설정 (Phase 6)

---

## 🛠 초기 설정

### 1. Supabase 프로젝트 생성 (5분)

1. [supabase.com](https://supabase.com) 가입 (무료)
2. `New project` → 이름 자유 (예: `image-rotator`)
3. 리전: **Northeast Asia (Seoul)** 권장
4. 데이터베이스 비밀번호 설정 (별도 보관)
5. 프로비저닝 완료까지 2~3분 대기

### 2. 스키마 초기화

- Supabase 대시보드 → **SQL Editor** → `New query`
- 이 저장소의 [`supabase/schema.sql`](supabase/schema.sql) 내용을 전부
  붙여넣고 **Run**
- "Success. No rows returned" 같은 메시지 확인

> 이 스크립트는 **재실행 안전** (IF NOT EXISTS / DROP POLICY IF EXISTS).

### 3. Storage 버킷 생성

- **Storage** → `New bucket`
- 이름: `image-pool`
- **Public bucket 체크 해제** (반드시 Private)
- `Create bucket`

### 4. API 키 확인

- **Project Settings → API**
- `Project URL` 과 `anon` public key 를 복사

### 5. 로컬 환경 구성

```bash
cp .env.example .env
```

`.env` 를 열어 다음을 채운다:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
```

### 6. 실행

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

---

## 🗂 프로젝트 구조

```
.
├── main.py                 # 엔트리 포인트 (PyWebView 실행)
├── backend/
│   ├── __init__.py
│   ├── api.py              # JS↔Python 브릿지 (ping, file dialog, auth 등)
│   ├── auth.py             # Supabase Auth 래퍼 (sign_in/up/out/restore)
│   ├── supabase_client.py  # Supabase 클라이언트 싱글턴
│   └── token_store.py      # OS Keyring 토큰 저장
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── api.js          # pywebview.api 래퍼
│       ├── modals.js       # 모달/토스트 헬퍼
│       ├── auth.js         # 로그인/회원가입 폼 제어
│       ├── companies.js    # 업체 리스트 UI
│       ├── images.js       # 이미지 풀 UI + 드래그앤드롭
│       └── app.js          # 부트 플로우 / 뷰 전환
├── supabase/
│   └── schema.sql          # DB 스키마 + RLS + Storage 정책
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## 🧭 Phase 로드맵

| Phase | 내용 | 상태 |
|------|-----|-----|
| 1 | 기반 세팅 (스키마, 뼈대 UI, 브릿지) | ✅ |
| 2 | Supabase 인증 + Keyring 토큰 저장 | ✅ |
| 3 | 업체 CRUD (Supabase 연동) | 예정 |
| 4 | 이미지 풀 업로드/삭제 | 예정 |
| 5 | 실행 로직 (랜덤 선택 + 변형 + 이력) | 예정 |
| 6 | 설정 화면 (변형 강도/분할 수 등) | 예정 |
| 7 | 에러 처리/로딩/키보드 단축키 | 예정 |
| 8 | (선택) PyInstaller 배포 빌드 | 예정 |

---

## 🔐 보안 메모

- `SUPABASE_ANON_KEY` 는 public key 이지만, RLS 로 본인 데이터만
  접근하도록 막혀 있으므로 클라이언트에 두어도 안전합니다.
- `.env` 는 `.gitignore` 에 포함되어 커밋되지 않습니다.
- 로그인 후 발급되는 access/refresh 토큰은 OS Keyring
  (Windows Credential Locker / macOS Keychain / Linux Secret Service) 에
  저장됩니다. 앱 재실행 시 refresh_token 으로 자동 복원합니다.

### Supabase 인증 설정 팁

- 대시보드 → **Authentication → Providers → Email** 이 기본 활성화되어 있어야
  로그인/회원가입이 동작합니다.
- **Authentication → URL Configuration → Site URL** 은 데스크톱 앱이라
  큰 영향 없지만, 초기 프로젝트 값 그대로 두어도 무방합니다.
- 이메일 확인(Email Confirmations) 옵션이 켜져 있으면 회원가입 후 메일
  인증이 필요합니다. 앱이 "인증 메일을 확인해주세요" 안내를 표시합니다.
- 개발 편의상 이메일 확인을 끄려면 **Authentication → Providers → Email →
  Confirm email** 를 OFF 하면 됩니다.
