/**
 * PyWebView bridge 래퍼.
 *
 * window.pywebview.api 는 창 로드 후 비동기로 채워지므로,
 * 이 래퍼는 준비 상태를 기다렸다가 호출한다.
 *
 * 후속 Phase에서 Supabase 관련 메서드가 추가되면
 * 여기서 얇은 wrapper 를 제공한다.
 */
(function () {
  "use strict";

  let readyResolve;
  const ready = new Promise((resolve) => {
    readyResolve = resolve;
  });

  function markReady() {
    if (window.pywebview && window.pywebview.api) {
      readyResolve(window.pywebview.api);
    }
  }

  // pywebviewready 이벤트 (공식 방식)
  window.addEventListener("pywebviewready", markReady);

  // 폴백: 약간 뒤에 수동 체크
  window.addEventListener("DOMContentLoaded", () => {
    if (window.pywebview && window.pywebview.api) {
      markReady();
    }
  });

  /**
   * 브릿지 준비를 기다린 뒤 호출 가능한 api 객체 반환.
   */
  async function getApi() {
    return await ready;
  }

  /**
   * 브릿지가 주입된 환경인지 간단 판별 (개발 시 브라우저로 열린 경우 false).
   */
  function hasBridge() {
    return !!(window.pywebview && window.pywebview.api);
  }

  window.AppApi = {
    ready,
    getApi,
    hasBridge,

    async ping() {
      const api = await getApi();
      return api.ping();
    },

    async getEnvStatus() {
      const api = await getApi();
      return api.get_env_status();
    },

    async pickDirectory(initial) {
      const api = await getApi();
      return api.pick_directory(initial || null);
    },

    async pickImageFiles() {
      const api = await getApi();
      return api.pick_image_files();
    },

    async signIn(email, password) {
      const api = await getApi();
      return api.sign_in(email, password);
    },

    async signUp(email, password) {
      const api = await getApi();
      return api.sign_up(email, password);
    },

    async signOut() {
      const api = await getApi();
      return api.sign_out();
    },

    async restoreSession() {
      const api = await getApi();
      return api.restore_session();
    },

    async getCurrentUser() {
      const api = await getApi();
      return api.get_current_user();
    },
  };
})();
