/**
 * Loading overlay using DaisyUI modal/spinner
 */
const Loading = (() => {
  let _el = null;
  function show(msg = 'Loading…') {
    if (_el) return;
    _el = document.createElement('div');
    _el.className = 'fixed inset-0 bg-white/70 backdrop-blur-sm z-[9999] flex items-center justify-center';
    _el.innerHTML = `
      <div class="card bg-white shadow-xl p-8 flex flex-col items-center gap-4">
        <span class="loading loading-spinner loading-lg text-indigo-600"></span>
        <p class="text-sm text-slate-600">${Helpers.escape(msg)}</p>
      </div>`;
    document.body.appendChild(_el);
  }
  function hide() {
    if (_el) { _el.remove(); _el = null; }
  }
  return { show, hide };
})();
