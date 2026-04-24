/**
 * 업체 리스트 렌더링 & 선택.
 * Phase 1: 메모리 상의 mock 데이터로 동작. Phase 3 에서 Supabase 연동.
 */
(function () {
  "use strict";

  const state = {
    companies: [],
    selectedId: null,
    onSelect: null,
  };

  function init({ onSelect }) {
    state.onSelect = onSelect;
    render();

    document
      .getElementById("btn-add-company")
      .addEventListener("click", handleAdd);
  }

  function setCompanies(list) {
    state.companies = list;
    if (state.selectedId && !list.find((c) => c.id === state.selectedId)) {
      state.selectedId = null;
      state.onSelect && state.onSelect(null);
    }
    render();
  }

  function getSelected() {
    return state.companies.find((c) => c.id === state.selectedId) || null;
  }

  function select(id) {
    state.selectedId = id;
    render();
    state.onSelect && state.onSelect(getSelected());
  }

  function render() {
    const ul = document.getElementById("company-list");
    ul.innerHTML = "";
    state.companies.forEach((c) => {
      const li = document.createElement("li");
      li.textContent = "🏢 " + c.name;
      if (c.id === state.selectedId) li.classList.add("active");
      li.addEventListener("click", () => select(c.id));
      ul.appendChild(li);
    });
  }

  async function handleAdd() {
    const name = await window.Modals.promptInput({
      title: "새 업체 추가",
      label: "업체명",
      placeholder: "예: 연세위드치과 2층",
    });
    if (!name) return;
    // Phase 1: mock 추가. 실제 저장은 Phase 3 에서 교체.
    const id = "local-" + Date.now();
    state.companies.push({
      id,
      name,
      default_output_dir: null,
    });
    select(id);
    window.Modals.toast(`'${name}' 추가됨 (로컬 임시)`, { type: "ok" });
  }

  window.Companies = { init, setCompanies, getSelected, select };
})();
