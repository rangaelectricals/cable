/**
 * Masters Management Page — mobile-first, Lucide icons
 * Manage: Cable Categories | Core Options | SQMM Options
 */
const MastersPage = {
  _data:      { CATEGORY: [], CORE: [], SQMM: [] },
  _activeTab: 'CATEGORY',
  _pages:     { CATEGORY: 1, CORE: 1, SQMM: 1 },
  _pageSize:  15,

  async render(container) {
    if (!Auth.canEdit()) {
      container.innerHTML = UI.emptyState('lock', 'Access Denied', 'Admin role required.');
      if (window.lucide) lucide.createIcons({ nodes: [container] });
      return;
    }

    container.innerHTML = `
    <div class="space-y-4 page-enter">
      ${UI.pageHeader('Masters',
        'Customise categories, core sizes & SQMM values for cable forms',
        `<button class="btn btn-ghost btn-sm gap-2" onclick="MastersPage.render(document.getElementById('main-content'))">
          <i data-lucide="refresh-cw" class="w-4 h-4"></i>
          <span class="hidden sm:inline">Refresh</span>
        </button>`
      )}

      <!-- Tab buttons — full width on mobile, auto on desktop -->
      <div class="grid grid-cols-3 gap-2 sm:flex sm:w-auto">
        ${[
          { id:'CATEGORY', icon:'tag',    label:'Categories' },
          { id:'CORE',     icon:'layers', label:'Core'       },
          { id:'SQMM',     icon:'ruler',  label:'SQMM'       },
        ].map(t => `
        <button id="mtab-${t.id}"
          onclick="MastersPage.switchTab('${t.id}')"
          class="btn btn-outline btn-sm sm:btn-md gap-2 transition-all"
          id="mtab-${t.id}">
          <i data-lucide="${t.icon}" class="w-4 h-4"></i>
          <span class="text-xs sm:text-sm">${t.label}</span>
        </button>`).join('')}
      </div>

      <!-- Tab content -->
      <div id="masters-content">
        <div class="flex items-center justify-center h-40">
          <span class="loading loading-spinner loading-md text-indigo-600"></span>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <dialog id="modal-master" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box w-full max-w-sm">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </form>
        <h3 class="font-bold text-lg mb-5">Edit Value</h3>
        <form id="form-master-edit" onsubmit="MastersPage.saveEdit(event)">
          <input type="hidden" id="me-id" />
          <input type="hidden" id="me-type" />
          <div class="space-y-3">
            ${UI.field('Value', `<input type="text" id="me-value" class="input input-bordered w-full text-base" required />`, true)}
            ${UI.field('Sort Order <span class="text-slate-400 font-normal text-xs">(lower = first in list)</span>',
              `<input type="number" id="me-order" class="input input-bordered w-full" min="1" placeholder="e.g. 1" />`)}
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" onclick="Modal.close('modal-master')">Cancel</button>
            <button type="submit" id="btn-save-master" class="btn btn-primary gap-2">
              <i data-lucide="save" class="w-4 h-4"></i> Save
            </button>
          </div>
        </form>
      </div>
    </dialog>`;

    Loading.show('Loading masters…');
    try {
      const res  = await API.getMasters();
      const rows = res.data || [];
      this._data.CATEGORY = rows.filter(r => r.type === 'CATEGORY');
      this._data.CORE     = rows.filter(r => r.type === 'CORE');
      this._data.SQMM     = rows.filter(r => r.type === 'SQMM');
    } catch(err) {
      Loading.hide();
      container.innerHTML = `<div class="alert alert-error gap-3">
        <i data-lucide="wifi-off" class="w-5 h-5 shrink-0"></i>
        <span>${Helpers.escape(err.message)}</span></div>`;
      if (window.lucide) lucide.createIcons({ nodes: [container] });
      return;
    }
    Loading.hide();
    this.switchTab('CATEGORY');
    if (window.lucide) lucide.createIcons({ nodes: [container] });
  },

  switchTab(type) {
    this._activeTab = type;

    const colors = { CATEGORY:'primary', CORE:'secondary', SQMM:'accent' };
    ['CATEGORY','CORE','SQMM'].forEach(t => {
      const btn = document.getElementById(`mtab-${t}`);
      if (!btn) return;
      const isActive = t === type;
      btn.className = `btn btn-sm sm:btn-md gap-2 transition-all ${isActive ? `btn-${colors[t]}` : 'btn-outline'}`;
    });
    this._renderTab(type);
    if (window.lucide) lucide.createIcons();
  },

  _renderTab(type) {
    const items  = this._data[type] || [];
    const labels = { CATEGORY:'Cable Categories', CORE:'Core Options', SQMM:'SQMM Values (mm²)' };
    const hints  = {
      CATEGORY: 'e.g. Power Cable, XLPE Cable',
      CORE:     'e.g. 3C, 4C, 3.5C',
      SQMM:     'e.g. 25, 50, 95',
    };
    const tabIcons = { CATEGORY:'tag', CORE:'layers', SQMM:'ruler' };

    const el = document.getElementById('masters-content');
    el.innerHTML = `
    <div class="card bg-white shadow-sm border border-slate-200">
      <div class="card-body p-4 sm:p-6">

        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <i data-lucide="${tabIcons[type]}" class="w-5 h-5 text-indigo-600"></i>
            <div>
              <h2 class="font-bold text-base">${labels[type]}</h2>
              <p class="text-xs text-slate-400">${items.length} items · used in cable form dropdowns</p>
            </div>
          </div>
        </div>

        <!-- Add form — stacked on mobile, inline on sm+ -->
        <form id="form-master-add" onsubmit="MastersPage.add(event)"
              class="flex flex-col sm:flex-row gap-2 mb-5">
          <input type="hidden" id="ma-type" value="${type}" />
          <label class="input input-bordered input-sm flex items-center gap-2 flex-1">
            <i data-lucide="plus-circle" class="w-4 h-4 text-slate-400 shrink-0"></i>
            <input type="text" id="ma-value" class="grow text-sm"
              placeholder="${hints[type]}" required autocomplete="off" />
          </label>
          <input type="number" id="ma-order" class="input input-bordered input-sm w-full sm:w-24"
            placeholder="Order" min="1" title="Sort order" />
          <button type="submit" class="btn btn-primary btn-sm w-full sm:w-auto gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i> Add
          </button>
        </form>

        <!-- MOBILE: 2-col rectangular grid -->
        <div id="masters-chips-${type}" class="sm:hidden grid grid-cols-2 gap-3 mb-3"></div>

        <!-- ── DESKTOP: table ── -->
        <div class="hidden sm:block overflow-x-auto">
          <table class="table table-sm table-zebra">
            <thead class="bg-slate-100 text-xs uppercase tracking-wide">
              <tr>
                <th class="w-8">#</th>
                <th>Value</th>
                <th class="w-24">Order</th>
                <th class="w-24">Actions</th>
              </tr>
            </thead>
            <tbody id="masters-tbody-${type}"></tbody>
          </table>
        </div>

        <div id="masters-pag-${type}" class="pt-2"></div>
      </div>
    </div>`;

    this._renderRows(type, items);
    setTimeout(() => document.getElementById('ma-value')?.focus(), 60);
    if (window.lucide) lucide.createIcons({ nodes: [el] });
  },

  _renderRows(type, items) {
    const sorted     = [...items].sort((a,b) => Number(a.sortOrder||999)-Number(b.sortOrder||999));
    const total      = sorted.length;
    const page       = this._pages[type] || 1;
    const pageSize   = this._pageSize;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const rowStart   = (page - 1) * pageSize;
    const paged      = sorted.slice(rowStart, rowStart + pageSize);

    // ── Mobile 2-col rectangular grid ──────────────────────────────────────
    const chipsEl = document.getElementById(`masters-chips-${type}`);
    if (chipsEl) {
      if (!paged.length) {
        chipsEl.innerHTML = `
          <div class="col-span-2 bg-white border border-slate-200 rounded-xl py-8 text-center">
            <p class="text-sm text-slate-400">No items yet. Use the form above to add.</p>
          </div>`;
      } else {
        chipsEl.innerHTML = paged.map((item, idx) => `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">

          <!-- Value area -->
          <div class="px-3 py-3 flex-1">
            <div class="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              #${item.sortOrder||idx+1}
            </div>
            <div class="font-semibold text-sm leading-snug break-all">${Helpers.escape(item.value)}</div>
          </div>

          <!-- Action row -->
          <div class="border-t border-base-100 grid grid-cols-2 divide-x divide-base-100">
            <button class="py-2 flex items-center justify-center gap-1 text-[11px] font-medium
              text-slate-500 hover:bg-white hover:text-indigo-600 transition-colors"
              onclick="MastersPage.openEdit('${item.id}','${Helpers.escape(item.type)}','${Helpers.escape(item.value)}',${item.sortOrder||''})">
              <i data-lucide="pencil" class="w-3 h-3"></i> Edit
            </button>
            <button class="py-2 flex items-center justify-center gap-1 text-[11px] font-medium
              text-slate-500 hover:bg-white hover:text-red-600 transition-colors"
              onclick="MastersPage.delete('${item.id}','${Helpers.escape(item.value)}','${item.type}')">
              <i data-lucide="trash-2" class="w-3 h-3"></i> Del
            </button>
          </div>
        </div>`).join('');
        if (window.lucide) lucide.createIcons({ nodes: [chipsEl] });
      }
    }

    // ── Desktop table rows ────────────────────────────────────────────────────
    const tbody = document.getElementById(`masters-tbody-${type}`);
    const pagEl = document.getElementById(`masters-pag-${type}`);
    if (tbody) {
      if (!paged.length) {
        tbody.innerHTML = `<tr><td colspan="4">${UI.emptyState('inbox','No items yet','Use the form above to add your first value')}</td></tr>`;
      } else {
        tbody.innerHTML = paged.map((item, i) => `
        <tr class="hover group">
          <td class="text-slate-400 text-xs">${rowStart+i+1}</td>
          <td><span class="font-medium text-sm">${Helpers.escape(item.value)}</span></td>
          <td class="text-xs text-slate-500">${item.sortOrder || '—'}</td>
          <td>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button class="btn btn-ghost btn-xs btn-square" title="Edit"
                onclick="MastersPage.openEdit('${item.id}','${Helpers.escape(item.type)}','${Helpers.escape(item.value)}',${item.sortOrder||''})">
                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
              </button>
              <button class="btn btn-ghost btn-xs btn-square text-red-600" title="Delete"
                onclick="MastersPage.delete('${item.id}','${Helpers.escape(item.value)}','${item.type}')">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>`).join('');
        if (window.lucide) lucide.createIcons({ nodes: [tbody] });
      }
    }

    // Pagination
    if (pagEl) {
      pagEl.innerHTML = UI.pagination({
        current: page, totalPages, total, pageSize,
        onPage: `MastersPage.goToPage.bind(MastersPage,'${type}')`,
        onSize: `MastersPage.setPageSize.bind(MastersPage)`,
      });
    }
  },

  goToPage(type, page)  { this._pages[type] = page; this._renderRows(type, this._data[type]); },
  setPageSize(size)     {
    this._pageSize = size;
    Object.keys(this._pages).forEach(k => this._pages[k] = 1);
    this._renderRows(this._activeTab, this._data[this._activeTab]);
  },

  async add(e) {
    e.preventDefault();
    const type  = document.getElementById('ma-type').value;
    const value = document.getElementById('ma-value').value.trim();
    const order = parseInt(document.getElementById('ma-order').value) || 999;
    if (!value) return;

    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';

    try {
      const res = await API.addMaster(type, value, order);
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> Add';
      if (window.lucide) lucide.createIcons({ nodes: [btn] });

      if (res.success) {
        Toast.show('success', 'Added', `"${value}" added to ${type}`);
        this._data[type].push(res.data);
        this._renderRows(type, this._data[type]);
        document.getElementById('ma-value').value = '';
        document.getElementById('ma-order').value = '';
        document.getElementById('ma-value').focus();
      } else { Toast.show('error','Failed', res.message); }
    } catch(err) {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> Add';
      if (window.lucide) lucide.createIcons({ nodes: [btn] });
      Toast.show('error','Error', err.message);
    }
  },

  openEdit(id, type, value, order) {
    document.getElementById('me-id').value    = id;
    document.getElementById('me-type').value  = type;
    document.getElementById('me-value').value = value;
    document.getElementById('me-order').value = order || '';
    Modal.open('modal-master');
    setTimeout(() => { document.getElementById('me-value')?.select(); }, 100);
    if (window.lucide) lucide.createIcons({ nodes: [document.getElementById('modal-master')] });
  },

  async saveEdit(e) {
    e.preventDefault();
    const id    = document.getElementById('me-id').value;
    const type  = document.getElementById('me-type').value;
    const value = document.getElementById('me-value').value.trim();
    const order = parseInt(document.getElementById('me-order').value) || 999;
    if (!value) return;

    const btn = document.getElementById('btn-save-master');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';

    try {
      const res = await API.updateMaster(id, value, order);
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Save';
      if (window.lucide) lucide.createIcons({ nodes: [btn.parentElement] });

      if (res.success) {
        Toast.show('success','Updated', 'Value updated successfully.');
        Modal.close('modal-master');
        const idx = this._data[type].findIndex(x => String(x.id) === String(id));
        if (idx >= 0) {
          this._data[type][idx].value     = value;
          this._data[type][idx].sortOrder = order;
        }
        this._renderRows(type, this._data[type]);
      } else { Toast.show('error','Failed', res.message); }
    } catch(err) {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Save';
      Toast.show('error','Error', err.message);
    }
  },

  async delete(id, value, type) {
    if (!confirm(`Delete "${value}" from ${type}?\n\nExisting cables using this value will NOT be affected.`)) return;
    try {
      const res = await API.deleteMaster(id);
      if (res.success) {
        Toast.show('success','Deleted', `"${value}" removed.`);
        this._data[type] = this._data[type].filter(x => String(x.id) !== String(id));
        this._renderRows(type, this._data[type]);
      } else { Toast.show('error','Failed', res.message); }
    } catch(err) { Toast.show('error','Error', err.message); }
  },
};

// ── MastersCache — used by CablesPage dropdowns ───────────────────────────────
const MastersCache = {
  _loaded:      false,
  _categories:  [],
  _cores:       [],
  _sqmms:       [],

  async load(forceRefresh = false) {
    if (this._loaded && !forceRefresh) return;
    try {
      const res  = await API.getMasters();
      const rows = res.data || [];
      const sort = arr => arr.sort((a,b) => Number(a.sortOrder||999)-Number(b.sortOrder||999)).map(r => r.value);
      this._categories = sort(rows.filter(r => r.type === 'CATEGORY'));
      this._cores      = sort(rows.filter(r => r.type === 'CORE'));
      this._sqmms      = sort(rows.filter(r => r.type === 'SQMM'));
      this._loaded     = true;
    } catch {
      this._categories = CABLE_CATEGORIES;
      this._cores      = CORE_OPTIONS;
      this._sqmms      = SQMM_OPTIONS;
      this._loaded     = true;
    }
  },

  categories() { return this._categories.length ? this._categories : CABLE_CATEGORIES; },
  cores()      { return this._cores.length      ? this._cores      : CORE_OPTIONS;     },
  sqmms()      { return this._sqmms.length      ? this._sqmms      : SQMM_OPTIONS;     },
};
