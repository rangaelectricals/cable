/**
 * Reusable UI components — stat cards, empty state, page header, table skeleton
 * Uses Lucide icons (loaded via CDN in dashboard.html)
 */

/** Inline Lucide icon helper — use after calling lucide.createIcons() */
function icon(name, cls = '') {
  return `<i data-lucide="${name}" class="w-4 h-4 shrink-0 ${cls}"></i>`;
}

const UI = {
  /** Stat card for dashboard */
  statCard({ icon: iconName, label, value, delta, color = 'primary', onclick = '' }) {
    const colorMap = {
      primary:   { bg: 'bg-indigo-100',  text: 'text-indigo-600' },
      success:   { bg: 'bg-emerald-100', text: 'text-emerald-600' },
      warning:   { bg: 'bg-amber-100',   text: 'text-amber-600' },
      error:     { bg: 'bg-red-100',     text: 'text-red-600' },
      info:      { bg: 'bg-blue-100',    text: 'text-blue-600' },
      neutral:   { bg: 'bg-slate-100',   text: 'text-slate-600' },
      secondary: { bg: 'bg-violet-100',  text: 'text-violet-600' },
    };
    const c = colorMap[color] || colorMap.primary;
    return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200
                cursor-pointer hover:shadow-md hover:-translate-y-0.5
                transition-all duration-150 min-w-0 p-4 flex items-center gap-4"
         ${onclick ? `onclick="${onclick}"` : ''}>
      <div class="w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center shrink-0">
        <i data-lucide="${iconName}" class="w-6 h-6 ${c.text}"></i>
      </div>
      <div class="min-w-0">
        <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">${label}</div>
        <div class="text-2xl font-black ${c.text} leading-tight mt-0.5">${value}</div>
        ${delta !== undefined ? `<div class="text-xs text-slate-400 mt-0.5">${delta}</div>` : ''}
      </div>
    </div>`;
  },

  /** Empty state */
  emptyState(iconName = 'inbox', title = 'No Data', desc = '') {
    // Support both emoji strings and lucide icon names
    const isEmoji = /\p{Emoji}/u.test(iconName);
    const iconEl = isEmoji
      ? `<span class="text-5xl">${iconName}</span>`
      : `<i data-lucide="${iconName}" class="w-14 h-14 text-slate-300"></i>`;
    return `
    <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
      ${iconEl}
      <p class="font-semibold text-slate-500 text-base">${title}</p>
      ${desc ? `<p class="text-sm text-center max-w-xs">${desc}</p>` : ''}
    </div>`;
  },

  /** Page header with title + action slot */
  pageHeader(title, subtitle = '', actionHtml = '') {
    return `
    <div class="flex items-start justify-between flex-wrap gap-3 mb-4">
      <div class="min-w-0">
        <h1 class="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">${title}</h1>
        ${subtitle ? `<p class="text-sm text-slate-500 mt-0.5">${subtitle}</p>` : ''}
      </div>
      ${actionHtml ? `<div class="flex gap-2 flex-wrap shrink-0">${actionHtml}</div>` : ''}
    </div>`;
  },

  /** Section card wrapper */
  card(content, extraClass = '') {
    return `<div class="card bg-white shadow-sm border border-slate-200 ${extraClass}">${content}</div>`;
  },

  /** Standard reusable Skeleton Loader */
  skeletonLoader() {
    return `
    <div class="space-y-6 animate-pulse p-4">
      <div class="h-10 bg-slate-200/80 rounded-xl w-3/4"></div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="h-32 bg-slate-200/80 rounded-2xl"></div>
        <div class="h-32 bg-slate-200/80 rounded-2xl"></div>
        <div class="h-32 bg-slate-200/80 rounded-2xl"></div>
      </div>
      <div class="h-96 bg-slate-200/80 rounded-2xl"></div>
    </div>`;
  },

  /** Table loading skeleton */
  tableSkeleton(rows = 5, cols = 6) {
    const headerCells = Array(cols).fill('<th><div class="skeleton h-4 w-20"></div></th>').join('');
    const bodyRows = Array(rows).fill(`<tr>${Array(cols).fill('<td><div class="skeleton h-4 w-full"></div></td>').join('')}</tr>`).join('');
    return `<div class="overflow-x-auto"><table class="table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
  },

  /** Progress bar row */
  progressRow(label, val, total, colorClass = 'progress-primary') {
    const pct = total ? Math.round((val / total) * 100) : 0;
    return `
    <div class="mb-3">
      <div class="flex justify-between text-sm mb-1">
        <span class="text-slate-600 font-medium">${label}</span>
        <span class="text-slate-400">${val}&nbsp;(${pct}%)</span>
      </div>
      <progress class="progress ${colorClass} h-2" value="${val}" max="${total || 1}"></progress>
    </div>`;
  },

  /** Action badge for scan log */
  actionBadge(action) {
    const map = {
      ACTIVATE:         { cls:'badge-primary',  label:'Activate'          },
      SEND_TO_SITE:     { cls:'badge-warning',  label:'Send to Site'      },
      RETURN_TO_GODOWN: { cls:'badge-success',  label:'Return to Godown'  },
    };
    const a = map[action] || { cls:'badge-ghost', label: action };
    return `<span class="badge ${a.cls} badge-sm font-medium">${a.label}</span>`;
  },

  /** Form field wrapper */
  field(label, inputHtml, required = false) {
    return `
    <div class="form-control w-full">
      <label class="label pb-1">
        <span class="label-text font-medium text-xs uppercase tracking-wide">${label}${required ? ' <span class="text-red-600">*</span>' : ''}</span>
      </label>
      ${inputHtml}
    </div>`;
  },

  /**
   * Pagination widget (DaisyUI join buttons)
   * @param {object} opts
   *   current     - current page (1-based)
   *   totalPages  - total number of pages
   *   total       - total record count
   *   pageSize    - current page size
   *   onPage      - JS expression string called with (newPage)        e.g. 'CablesPage.goToPage'
   *   onSize      - JS expression string called with (newPageSize)    e.g. 'CablesPage.setPageSize'
   */
  pagination({ current, totalPages, total, pageSize, onPage, onSize }) {
    if (!total || totalPages <= 1) {
      // Still show "Showing X of Y" even when no pages
      return `<div class="flex items-center justify-between mt-3 text-xs text-slate-500">
        <span>Showing ${total} record${total !== 1 ? 's' : ''}</span>
        ${onSize ? `<select class="select select-bordered select-xs" onchange="${onSize}(parseInt(this.value))">
          ${[10,20,50,100].map(n => `<option value="${n}"${n===pageSize?' selected':''}>${n}/page</option>`).join('')}
        </select>` : ''}
      </div>`;
    }

    // Smart window: always show at most 5 page buttons
    const delta = 2;
    let lo = Math.max(1, current - delta);
    let hi = Math.min(totalPages, current + delta);
    // Expand window to 5 if near edges
    if (hi - lo < 4) {
      if (lo === 1)         hi = Math.min(totalPages, lo + 4);
      else if (hi === totalPages) lo = Math.max(1, hi - 4);
    }

    const from = (current - 1) * pageSize + 1;
    const to   = Math.min(current * pageSize, total);

    const pages = [];
    for (let p = lo; p <= hi; p++) pages.push(p);

    return `
    <div class="flex flex-wrap items-center justify-between gap-3 mt-4 border-t border-slate-200 pt-3">
      <p class="text-xs text-slate-500">Showing <strong>${from}–${to}</strong> of <strong>${total}</strong></p>
      <div class="flex items-center gap-2">
        <div class="join">
          <button class="join-item btn btn-xs btn-ghost"
            ${current <= 1 ? 'disabled' : `onclick="${onPage}(1)"`} title="First">«</button>
          <button class="join-item btn btn-xs btn-ghost"
            ${current <= 1 ? 'disabled' : `onclick="${onPage}(${current - 1})"`} title="Prev">‹</button>
          ${pages.map(p => `
          <button class="join-item btn btn-xs ${p === current ? 'btn-primary' : 'btn-ghost'}"
            onclick="${onPage}(${p})">${p}</button>`).join('')}
          <button class="join-item btn btn-xs btn-ghost"
            ${current >= totalPages ? 'disabled' : `onclick="${onPage}(${current + 1})"`} title="Next">›</button>
          <button class="join-item btn btn-xs btn-ghost"
            ${current >= totalPages ? 'disabled' : `onclick="${onPage}(${totalPages})"`} title="Last">»</button>
        </div>
        ${onSize ? `<select class="select select-bordered select-xs" title="Rows per page"
            onchange="${onSize}(parseInt(this.value))">
          ${[10,20,50,100].map(n => `<option value="${n}"${n===pageSize?' selected':''}>${n}/page</option>`).join('')}
        </select>` : ''}
      </div>
    </div>`;
  },
};

/**
 * Modal manager — open/close DaisyUI modals
 */
const Modal = {
  open(id)  { const m = document.getElementById(id); if (m) m.showModal(); },
  close(id) { const m = document.getElementById(id); if (m) m.close(); },
};
