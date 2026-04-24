/**
 * 로그인 / 회원가입 뷰 제어.
 *
 * - 폼 submit → 현재 모드(signin|signup)에 따라 AppApi 호출
 * - 토글 버튼으로 모드 전환
 * - 에러/안내 메시지 표시
 * - 성공 시 `onAuthenticated({ user_id, email })` 콜백
 */
(function () {
  "use strict";

  const state = {
    mode: "signin", // 'signin' | 'signup'
    busy: false,
    onAuthenticated: null,
  };

  // --- helpers -------------------------------------------------------
  function $(id) { return document.getElementById(id); }

  function setBusy(busy) {
    state.busy = busy;
    const form = $("auth-form");
    if (!form) return;
    form.querySelectorAll("input, button").forEach((el) => {
      el.disabled = busy;
    });
    const primary = $("btn-auth-primary");
    if (primary) {
      primary.textContent = busy
        ? (state.mode === "signup" ? "가입 중…" : "로그인 중…")
        : (state.mode === "signup" ? "회원가입" : "로그인");
    }
  }

  function showError(msg) {
    const el = $("auth-error");
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  function showInfo(msg) {
    const el = $("auth-info");
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  function updateModeUI() {
    const subtitle = $("auth-subtitle");
    const primary = $("btn-auth-primary");
    const toggle = $("btn-auth-toggle");
    const passwordInput = document.querySelector('#auth-form input[name="password"]');

    if (state.mode === "signup") {
      if (subtitle) subtitle.textContent = "새 계정을 만듭니다";
      if (primary) primary.textContent = "회원가입";
      if (toggle) toggle.textContent = "이미 계정이 있으신가요? 로그인";
      if (passwordInput) passwordInput.autocomplete = "new-password";
    } else {
      if (subtitle) subtitle.textContent = "계정으로 로그인하세요";
      if (primary) primary.textContent = "로그인";
      if (toggle) toggle.textContent = "계정이 없으신가요? 회원가입";
      if (passwordInput) passwordInput.autocomplete = "current-password";
    }
    showError(null);
    showInfo(null);
  }

  function toggleMode() {
    state.mode = state.mode === "signin" ? "signup" : "signin";
    updateModeUI();
  }

  // --- actions -------------------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault();
    if (state.busy) return;

    const form = e.currentTarget;
    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      showError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    showError(null);
    showInfo(null);
    setBusy(true);
    try {
      const fn = state.mode === "signup" ? "signUp" : "signIn";
      const result = await window.AppApi[fn](email, password);
      if (!result || !result.ok) {
        showError((result && result.error) || "알 수 없는 오류가 발생했습니다.");
        return;
      }
      if (result.needs_confirmation) {
        showInfo(
          `${result.email || email} 로 인증 메일을 보냈습니다.\n` +
          "받은 편지함에서 링크를 클릭한 뒤 로그인해주세요."
        );
        state.mode = "signin";
        updateModeUI();
        // 비밀번호 필드만 비우기
        form.password.value = "";
        return;
      }
      window.Modals.toast(
        state.mode === "signup" ? "가입 완료! 환영합니다." : "로그인되었습니다.",
        { type: "ok" }
      );
      if (typeof state.onAuthenticated === "function") {
        state.onAuthenticated({
          user_id: result.user_id,
          email: result.email,
        });
      }
    } catch (err) {
      console.error(err);
      showError("네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.");
    } finally {
      setBusy(false);
    }
  }

  // --- public API ----------------------------------------------------
  function init({ onAuthenticated }) {
    state.onAuthenticated = onAuthenticated;
    const form = $("auth-form");
    const toggle = $("btn-auth-toggle");
    if (form) form.addEventListener("submit", handleSubmit);
    if (toggle) toggle.addEventListener("click", toggleMode);
    updateModeUI();
  }

  function reset() {
    const form = $("auth-form");
    if (form) form.reset();
    showError(null);
    showInfo(null);
    state.mode = "signin";
    updateModeUI();
  }

  function focus() {
    const emailInput = document.querySelector('#auth-form input[name="email"]');
    if (emailInput) emailInput.focus();
  }

  window.Auth = { init, reset, focus };
})();
