/**
 * 이미지 풀 UI + 드래그 앤 드롭 영역.
 * Phase 1: 드롭/선택 이벤트만 잡아 토스트로 확인. 실제 업로드는 Phase 4.
 */
(function () {
  "use strict";

  const state = {
    companyId: null,
    images: [],
  };

  function init() {
    const addBtn = document.getElementById("btn-add-image");
    const grid = document.getElementById("pool-grid");

    addBtn.addEventListener("click", handlePick);

    grid.addEventListener("dragover", (e) => {
      e.preventDefault();
      grid.classList.add("dragover");
    });
    grid.addEventListener("dragleave", () => {
      grid.classList.remove("dragover");
    });
    grid.addEventListener("drop", (e) => {
      e.preventDefault();
      grid.classList.remove("dragover");
      const files = Array.from(e.dataTransfer?.files || []);
      handleDrop(files);
    });
  }

  function setCompany(company) {
    state.companyId = company ? company.id : null;
    state.images = [];
    render();
  }

  function setImages(list) {
    state.images = list;
    render();
    updateStat();
  }

  function updateStat() {
    const countEl = document.getElementById("stat-count");
    if (countEl) countEl.textContent = state.images.length;
  }

  function render() {
    const grid = document.getElementById("pool-grid");
    // "+" 버튼은 유지, 기존 썸네일만 제거
    grid.querySelectorAll(".pool-thumb").forEach((el) => el.remove());

    state.images.forEach((img) => {
      const thumb = document.createElement("div");
      thumb.className = "pool-thumb";
      thumb.title = img.filename || "";

      const imgEl = document.createElement("img");
      imgEl.src = img.thumbnail_url || img.preview_url || "";
      imgEl.alt = img.filename || "";
      thumb.appendChild(imgEl);

      const x = document.createElement("button");
      x.className = "remove";
      x.textContent = "×";
      x.addEventListener("click", () => handleRemove(img));
      thumb.appendChild(x);

      grid.appendChild(thumb);
    });
  }

  async function handlePick() {
    if (!state.companyId) {
      window.Modals.toast("먼저 업체를 선택하세요", { type: "error" });
      return;
    }
    if (!window.AppApi.hasBridge()) {
      window.Modals.toast("PyWebView 환경에서만 가능합니다", { type: "error" });
      return;
    }
    const files = await window.AppApi.pickImageFiles();
    if (!files || files.length === 0) return;
    window.Modals.toast(`${files.length}개 파일 선택됨 (업로드는 Phase 4)`);
    // TODO(Phase 4): Supabase Storage 업로드 + pool_images insert
  }

  function handleDrop(files) {
    if (!state.companyId) {
      window.Modals.toast("먼저 업체를 선택하세요", { type: "error" });
      return;
    }
    if (files.length === 0) return;
    window.Modals.toast(`${files.length}개 파일 드롭됨 (업로드는 Phase 4)`);
    // TODO(Phase 4)
  }

  function handleRemove(_img) {
    // TODO(Phase 4)
    window.Modals.toast("삭제 기능은 Phase 4에서 연결됩니다");
  }

  window.Images = { init, setCompany, setImages };
})();
