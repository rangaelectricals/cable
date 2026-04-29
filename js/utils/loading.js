/**
 * Loading overlay using DaisyUI modal/spinner
 */
const Loading = (() => {
  let _el = null;
  function show(msg = 'Loading…') {
    if (_el) return;
    _el = document.createElement('div');
    _el.className = 'fixed inset-0 bg-base-100/70 backdrop-blur-sm z-[9999] flex items-center justify-center';
    _el.innerHTML = `
      <div class="card bg-base-100 shadow-xl p-8 flex flex-col items-center gap-4">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="text-sm text-base-content/70">${Helpers.escape(msg)}</p>
      </div>`;
    document.body.appendChild(_el);
  }
  function hide() {
    if (_el) { _el.remove(); _el = null; }
  }
  return { show, hide };
})();
