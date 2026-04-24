/**
 * 앱 엔트리 - 뷰 전환 / 업체 선택 시 상세 영역 갱신 / 브릿지 헬스체크.
 */
(function () {
  "use strict";

  const views = {
    login: () => document.getElementById("view-login"),
    main: () => document.getElementById("view-main"),
  };

  const detail = {
    empty: () => document.getElementById("detail-empty"),
    body: () => document.getElementById("detail-body"),
    name: () => document.getElementById("company-name"),
    outputDir: () => document.getElementById("input-output-dir"),
    statRecent: () => document.getElementById("stat-recent"),
  };

  function showView(name) {
    Object.keys(views).forEach((k) => {
      views[k]().hidden = k !== name;
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
    // Phase 4 에서 실제 이미지 로드로 교체
    window.Images.setImages([]);
  }

  async function bootEnv() {
    const statusMsg = document.getElementById("status-msg");
    const statusEnv = document.getElementById("status-env");

    if (!window.AppApi.hasBridge()) {
      // 브라우저로 직접 열었을 때 안내
      statusMsg.textContent = "⚠️ 브릿지 미연결";
      statusEnv.textContent = "PyWebView 로 실행해 주세요";
      return;
    }

    try {
      const ping = await window.AppApi.ping();
      statusMsg.textContent = `준비됨 (Python ${ping.python} / ${ping.platform})`;

      const env = await window.AppApi.getEnvStatus();
      if (!env.has_url || !env.has_key) {
        statusEnv.textContent = "⚠️ .env 미설정 (SUPABASE_URL/KEY)";
        statusEnv.style.color = "var(--danger)";
      } else {
        statusEnv.textContent = "Supabase: " + env.url_preview;
      }
    } catch (e) {
      statusMsg.textContent = "브릿지 오류";
      console.error(e);
    }
  }

  function wireTopbar() {
    document
      .getElementById("btn-settings")
      .addEventListener("click", () => {
        window.Modals.toast("설정 화면은 Phase 6에서 제공됩니다");
      });
    document
      .getElementById("btn-logout")
      .addEventListener("click", () => {
        window.Modals.toast("로그아웃은 Phase 2에서 제공됩니다");
      });
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
          cur.name = name;
          // mock: 리스트 재렌더를 위해 selectedId 유지한 채 setCompanies 호출
          window.Companies.setCompanies(
            // @ts-ignore
            (window.__mockList = window.__mockList || [])
          );
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

  function start() {
    showView("main"); // Phase 1: 로그인 스킵
    window.Companies.init({
      onSelect: (company) => showDetail(company),
    });
    window.Images.init();
    wireTopbar();
    wireDetailActions();
    showDetail(null);
    bootEnv();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
