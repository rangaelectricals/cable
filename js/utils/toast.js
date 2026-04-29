/**
 * Toast notification system — Lucide icons + DaisyUI alert classes
 */
const Toast = (() => {
  const iconMap = {
    success: 'check-circle-2',
    error:   'x-circle',
    warning: 'alert-triangle',
    info:    'info',
  };

  function show(type = 'info', title = '', message = '', duration = 4000) {
    let wrap = document.getElementById('toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id        = 'toast-wrap';
      wrap.className = 'toast toast-top toast-end z-[100]';
      document.body.appendChild(wrap);
    }

    const alertClass = {
      success: 'alert-success',
      error:   'alert-error',
      warning: 'alert-warning',
      info:    'alert-info',
    }[type] || 'alert-info';

    const lucideIcon = iconMap[type] || 'info';

    const el = document.createElement('div');
    el.className = `alert ${alertClass} shadow-lg gap-3 py-3 min-w-64 max-w-xs text-sm`;
    el.innerHTML = `
      <i data-lucide="${lucideIcon}" class="w-5 h-5 shrink-0"></i>
      <div class="flex-1 min-w-0">
        <div class="font-semibold leading-tight">${Helpers.escape(title)}</div>
        ${message ? `<div class="text-xs opacity-75 mt-0.5 truncate">${Helpers.escape(String(message).slice(0,120))}</div>` : ''}
      </div>
      <button class="btn btn-xs btn-ghost btn-circle shrink-0"
        onclick="this.parentElement.remove()">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>`;

    wrap.appendChild(el);
    if (window.lucide) lucide.createIcons({ nodes: [el] });

    setTimeout(() => {
      el.style.opacity    = '0';
      el.style.transform  = 'translateX(8px)';
      el.style.transition = 'opacity .3s, transform .3s';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  return { show };
})();
