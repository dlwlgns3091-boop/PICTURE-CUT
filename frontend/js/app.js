/**
 * 앱 엔트리 - 뷰 전환 / 업체 선택 시 상세 영역 갱신 / 인증 부트 플로우.
 *
 * 부트 순서:
 *   1) view-boot 표시
 *   2) 브릿지 대기 + env 점검
 *   3) restore_session 시도
 *      - 성공 → 메인 진입
 *      - 실패 → 로그인 뷰
 */
(function () {
  "use strict";

  const views = {
    boot:  () => document.getElementById("view-boot"),
    login: () => document.getElementById("view-login"),
    main:  () => document.getElementById("view-main"),
  };

  const detail = {
    empty:      () => document.getElementById("detail-empty"),
    body:       () => document.getElementById("detail-body"),
    name:       () => document.getElementById("company-name"),
    outputDir:  () => document.getElementById("input-output-dir"),
    statRecent: () => document.getElementById("stat-recent"),
  };

  const session = {
    user_id: null,
    email: null,
  };

  // -----------------------------------------------------------------
  // 뷰 전환
  // -----------------------------------------------------------------
  function showView(name) {
    Object.keys(views).forEach((k) => {
      const el = views[k]();
      if (el) el.hidden = k !== name;
    });
  }

  function showDetail(company) {
    if (!company) {
      detail.empty().hidden = false;
      detail.body().hidden = true;
      return;
    }
    detail.empty().hidden = true;
    detail.body().hidden = false;
    detail.name().textContent = company.name;
    detail.outputDir().value = company.default_output_dir || "";
    detail.statRecent().textContent = "—";

    window.Images.setCompany(company);
    window.Images.setImages([]);
  }

  // -----------------------------------------------------------------
  // 메인 진입 / 이탈
  // -----------------------------------------------------------------
  function enterMain({ user_id, email }) {
    session.user_id = user_id;
    session.email = email;
    const userEl = document.getElementById("current-user");
    if (userEl) userEl.textContent = email || "";
    showView("main");
    // Phase 3 에서 실제 업체 목록 로드로 교체
    window.Companies.setCompanies([]);
    showDetail(null);
    updateStatusBar();
  }

  function enterLogin() {
    session.user_id = null;
    session.email = null;
    const userEl = document.getElementById("current-user");
    if (userEl) userEl.textContent = "";
    window.Auth.reset();
    showView("login");
    setTimeout(() => window.Auth.focus(), 50);
  }

  // -----------------------------------------------------------------
  // 상태바
  // -----------------------------------------------------------------
  async function updateStatusBar() {
    const statusMsg = document.getElementById("status-msg");
    const statusEnv = document.getElementById("status-env");
    if (!window.AppApi.hasBridge()) {
      if (statusMsg) statusMsg.textContent = "⚠️ 브릿지 미연결";
      if (statusEnv) statusEnv.textContent = "PyWebView 로 실행해 주세요";
      return;
    }
    try {
      const ping = await window.AppApi.ping();
      if (statusMsg) {
        statusMsg.textContent = `준비됨 (Python ${ping.python} / ${ping.platform})`;
      }
      const env = await window.AppApi.getEnvStatus();
      if (statusEnv) {
        if (!env.has_url || !env.has_key) {
          statusEnv.textContent = "⚠️ .env 미설정";
          statusEnv.style.color = "var(--danger)";
        } else {
          statusEnv.textContent = "Supabase: " + env.url_preview;
          statusEnv.style.color = "";
        }
      }
    } catch (e) {
      console.error(e);
      if (statusMsg) statusMsg.textContent = "브릿지 오류";
    }
  }

  // -----------------------------------------------------------------
  // 상단 바 / 상세 액션
  // -----------------------------------------------------------------
  function wireTopbar() {
    document
      .getElementById("btn-settings")
      .addEventListener("click", () => {
        window.Modals.toast("설정 화면은 Phase 6에서 제공됩니다");
      });

    document
      .getElementById("btn-logout")
      .addEventListener("click", handleLogout);
  }

  async function handleLogout() {
    const ok = await window.Modals.confirm({
      title: "로그아웃",
      message: "로그아웃 하시겠습니까?",
      okLabel: "로그아웃",
    });
    if (!ok) return;
    try {
      await window.AppApi.signOut();
    } catch (e) {
      console.warn("sign_out 경고:", e);
    }
    window.Modals.toast("로그아웃되었습니다", { type: "ok" });
    enterLogin();
  }

  function wireDetailActions() {
    document
      .getElementById("btn-pick-dir")
      .addEventListener("click", async () => {
        if (!window.AppApi.hasBridge()) {
          window.Modals.toast("PyWebView 환경에서만 가능합니다", { type: "error" });
          return;
        }
        const dir = await window.AppApi.pickDirectory();
        if (dir) {
          detail.outputDir().value = dir;
          window.Modals.toast("폴더 선택됨 (저장은 Phase 5)");
        }
      });

    document
      .getElementById("btn-run")
      .addEventListener("click", () => {
        window.Modals.toast("실행 로직은 Phase 5에서 연결됩니다");
      });

    document
      .getElementById("btn-rename")
      .addEventListener("click", async () => {
        const cur = window.Companies.getSelected();
        if (!cur) return;
        const name = await window.Modals.promptInput({
          title: "업체 이름 변경",
          label: "새 이름",
          initial: cur.name,
        });
        if (name && name !== cur.name) {
          window.Modals.toast("이름 변경은 Phase 3에서 영속화됩니다");
        }
      });

    document
      .getElementById("btn-delete")
      .addEventListener("click", async () => {
        const cur = window.Companies.getSelected();
        if (!cur) return;
        const ok = await window.Modals.confirm({
          title: "업체 삭제",
          message: `'${cur.name}' 을(를) 삭제할까요? 이미지와 이력도 함께 삭제됩니다.`,
          danger: true,
          okLabel: "삭제",
        });
        if (!ok) return;
        window.Modals.toast("삭제 로직은 Phase 3에서 연결됩니다");
      });
  }

  // -----------------------------------------------------------------
  // 부트
  // -----------------------------------------------------------------
  async function boot() {
    showView("boot");

    // 공통 UI 초기화 (뷰와 무관하게 한 번)
    window.Companies.init({
      onSelect: (company) => showDetail(company),
    });
    window.Images.init();
    wireTopbar();
    wireDetailActions();
    window.Auth.init({
      onAuthenticated: (s) => enterMain(s),
    });

    // 브릿지 없는 환경 (브라우저 직접 열기 등)
    if (!window.AppApi.hasBridge()) {
      try { await window.AppApi.ready; } catch (_) { /* ignore */ }
    }

    // env 점검
    let env;
    try {
      env = await window.AppApi.getEnvStatus();
    } catch (e) {
      console.error(e);
      enterLogin();
      return;
    }

    if (!env || !env.has_url || !env.has_key) {
      window.Modals.toast("Supabase 환경변수(.env)가 설정되지 않았습니다", {
        type: "error",
        duration: 5000,
      });
      enterLogin();
      return;
    }

    // 자동 로그인 시도
    try {
      const restored = await window.AppApi.restoreSession();
      if (restored && restored.ok) {
        enterMain({
          user_id: restored.user_id,
          email: restored.email,
        });
        return;
      }
    } catch (e) {
      console.warn("세션 복원 실패:", e);
    }

    enterLogin();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
