/**
 * 얇은 모달 & 토스트 헬퍼. 어떤 UI 라이브러리도 쓰지 않는다.
 */
(function () {
  "use strict";

  const modalRoot = () => document.getElementById("modal-root");
  const toastRoot = () => document.getElementById("toast-root");

  /**
   * 일반 모달을 연다.
   * @param {Object} opts
   * @param {string} opts.title
   * @param {HTMLElement|string} opts.body  innerHTML 또는 element
   * @param {Array<{label:string, variant?:string, value?:any}>} [opts.actions]
   *   버튼 정의. 클릭 시 Promise resolve.
   * @returns {Promise<any>} 클릭된 버튼의 value (또는 backdrop 클릭 시 undefined)
   */
  function openModal({ title, body, actions = [{ label: "닫기" }] }) {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop";

      const modal = document.createElement("div");
      modal.className = "modal";

      const h = document.createElement("h3");
      h.textContent = title;
      modal.appendChild(h);

      const bodyEl = document.createElement("div");
      if (typeof body === "string") {
        bodyEl.innerHTML = body;
      } else if (body instanceof HTMLElement) {
        bodyEl.appendChild(body);
      }
      modal.appendChild(bodyEl);

      const actionsEl = document.createElement("div");
      actionsEl.className = "actions";
      actions.forEach((a) => {
        const btn = document.createElement("button");
        btn.className = "btn" + (a.variant ? " " + a.variant : "");
        btn.textContent = a.label;
        btn.addEventListener("click", () => {
          cleanup();
          resolve(a.value);
        });
        actionsEl.appendChild(btn);
      });
      modal.appendChild(actionsEl);

      backdrop.appendChild(modal);
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) {
          cleanup();
          resolve(undefined);
        }
      });

      function cleanup() {
        backdrop.remove();
        document.removeEventListener("keydown", onKey);
      }
      function onKey(e) {
        if (e.key === "Escape") {
          cleanup();
          resolve(undefined);
        }
      }
      document.addEventListener("keydown", onKey);

      modalRoot().appendChild(backdrop);
    });
  }

  /**
   * 입력 프롬프트 (이름 입력 등에 사용).
   */
  async function promptInput({ title, label, placeholder = "", initial = "" }) {
    const container = document.createElement("div");

    const row = document.createElement("div");
    row.className = "form-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.value = initial;
    row.appendChild(lab);
    row.appendChild(input);
    container.appendChild(row);

    const ok = await openModal({
      title,
      body: container,
      actions: [
        { label: "취소", value: null },
        { label: "확인", variant: "primary", value: true },
      ],
    });
    return ok ? input.value.trim() : null;
  }

  async function confirm({ title, message, okLabel = "확인", cancelLabel = "취소", danger = false }) {
    const p = document.createElement("p");
    p.textContent = message;
    const res = await openModal({
      title,
      body: p,
      actions: [
        { label: cancelLabel, value: false },
        { label: okLabel, variant: danger ? "danger" : "primary", value: true },
      ],
    });
    return res === true;
  }

  /**
   * 토스트 (자동 소멸).
   */
  function toast(message, { type = "info", duration = 2400 } = {}) {
    const root = toastRoot();
    if (!root) return;
    const el = document.createElement("div");
    el.className = "toast" + (type === "error" ? " error" : type === "ok" ? " ok" : "");
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity 0.2s";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 200);
    }, duration);
  }

  window.Modals = { openModal, promptInput, confirm, toast };
})();
