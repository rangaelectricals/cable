/**
 * Cable Inventory page
 * Mobile: card view   |   Desktop (lg+): table view
 * Server-side pagination + filters
 */
const CablesPage = {
  _products:   [],
  _allProducts: [],
  _page:       1,
  _pageSize:   20,
  _total:      0,
  _totalPages: 1,
  _filters:    { search:'', status:'', category:'', core:'', sqmm:'', eventType:'' },
  _sortBy:     'createdAt',
  _sortDir:    'desc',
  _isSpecMode: false,
  _selectedCables: new Set(),

  async render(container) {
    const q = localStorage.getItem('global_search_term');
    if (q) {
      this._filters.search = q;
      localStorage.removeItem('global_search_term');
      const gInput = document.getElementById('global-command-search');
      if (gInput) gInput.value = q;
    }
    container.innerHTML = UI.skeletonLoader();
    await MastersCache.load();
    await this._fetchPage(container, true);
  },

  async _fetchPage(container, buildShell = false) {
    try {
      const params = {
        page: this._page, pageSize: this._pageSize,
        sortBy: this._sortBy, sortDir: this._sortDir,
        ...Object.fromEntries(Object.entries(this._filters).filter(([,v]) => v)),
       };
      const [res, allRes] = await Promise.all([
        API.getProducts(params),
        API.getProducts({ pageSize: 9999, page: 1 }),
      ]);
      this._products    = res.data       || [];
      this._allProducts = allRes.data    || [];
      this._total       = res.total      || 0;
      this._totalPages  = res.totalPages || Math.ceil(this._total / this._pageSize) || 1;
      this._page        = res.page       || 1;
      this._pageSize    = res.pageSize   || this._pageSize;

      // Dynamically update DOM stats cards if buildShell is false
      if (!buildShell) {
        const elTotal = document.getElementById('cable-overall-total');
        const elGodown = document.getElementById('cable-overall-godown');
        const elSite = document.getElementById('cable-overall-site');
        const elActive = document.getElementById('cable-overall-active');
        if (elTotal) elTotal.textContent = `${this._allProducts.length} listed`;
        if (elGodown) elGodown.textContent = `${this._allProducts.filter(p => p.status === 'IN_GODOWN').length} cables`;
        if (elSite) elSite.textContent = `${this._allProducts.filter(p => p.status === 'SENT_TO_SITE').length} cables`;
        if (elActive) elActive.textContent = `${this._allProducts.filter(p => String(p.activated) === 'true').length} activated`;
      }
    } catch(err) {
      if (buildShell) container.innerHTML =
        `<div class="alert alert-error"><i data-lucide="wifi-off" class="w-5 h-5"></i><span>${Helpers.escape(err.message)}</span></div>`;
      else Toast.show('error','Load Error', err.message);
      if (window.lucide && container) lucide.createIcons({ nodes: [container] });
      return;
    }

    const canEdit   = Auth.canEdit();
    const canDelete = Auth.canDelete();
    const categories = MastersCache.categories();
    const cores      = MastersCache.cores();
    const sqmms      = MastersCache.sqmms();

    if (buildShell) {
      container.innerHTML = `
      <div class="space-y-4 page-enter">
        ${UI.pageHeader('Cable Inventory',
          `<span id="cable-total-count">${this._total}</span> cables total`,
          `<div class="flex gap-2">
            <div class="dropdown dropdown-end">
              <button tabindex="0" class="btn btn-ghost btn-sm gap-2">
                <i data-lucide="file-down" class="w-4 h-4"></i>
                <span class="hidden sm:inline">Export</span>
                <i data-lucide="chevron-down" class="w-3 h-3 opacity-50"></i>
              </button>
               <ul tabindex="0" class="dropdown-content z-[10] menu p-2 shadow-2xl bg-white border border-slate-100 rounded-2xl w-52 mt-2">
                <li>
                  <a onclick="CablesPage.exportExcel()" class="flex items-center gap-3 py-3">
                    <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i></div>
                    <div class="flex flex-col"><span class="text-[11px] font-black uppercase tracking-widest">Excel Report</span><span class="text-[9px] text-slate-400">Formatted Spreadsheet</span></div>
                  </a>
                </li>
                <li>
                  <a onclick="CablesPage.exportPDF()" class="flex items-center gap-3 py-3">
                    <div class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center"><i data-lucide="file-text" class="w-4 h-4"></i></div>
                    <div class="flex flex-col"><span class="text-[11px] font-black uppercase tracking-widest">PDF Document</span><span class="text-[9px] text-slate-400">Pro Quality PDF</span></div>
                  </a>
                </li>
                <li>
                  <a onclick="CablesPage.downloadAllQRs()" class="flex items-center gap-3 py-3">
                    <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><i data-lucide="image" class="w-4 h-4"></i></div>
                    <div class="flex flex-col"><span class="text-[11px] font-black uppercase tracking-widest">QR Images (ZIP)</span><span class="text-[9px] text-slate-400">Export all QR codes as ZIP</span></div>
                  </a>
                </li>
                <li>
                  <a onclick="CablesPage.printSelectedQRs()" class="flex items-center gap-3 py-3">
                    <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><i data-lucide="printer" class="w-4 h-4"></i></div>
                    <div class="flex flex-col"><span class="text-[11px] font-black uppercase tracking-widest">Print QR Labels</span><span class="text-[9px] text-slate-400">Printable QR PDF</span></div>
                  </a>
                </li>
              </ul>
            </div>
            ${canEdit ? `
            <button class="btn btn-outline btn-sm gap-2" onclick="CablesPage.openBulkUpload()">
              <i data-lucide="upload" class="w-4 h-4"></i>
              <span class="hidden xs:inline">Bulk</span>
            </button>
            <button class="btn btn-primary btn-sm gap-2" onclick="CablesPage.openAdd()">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span class="hidden xs:inline">Add</span>
            </button>` : ''}
          </div>`
        )}

        <!-- Quick stats cards -->
        <div id="cable-quick-stats" class="grid grid-cols-1 sm:grid-cols-4 gap-3 animate-fadeIn">
          <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-3">
            <div class="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <i data-lucide="box" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="text-[10px] font-black uppercase text-indigo-400">Total Cables</div>
              <div id="cable-overall-total" class="text-lg font-black text-indigo-700 leading-tight">${this._allProducts.length} listed</div>
            </div>
          </div>

          <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <i data-lucide="warehouse" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="text-[10px] font-black uppercase text-emerald-400">In Godown</div>
              <div id="cable-overall-godown" class="text-lg font-black text-emerald-700 leading-tight">${this._allProducts.filter(p => p.status === 'IN_GODOWN').length} cables</div>
            </div>
          </div>

          <div class="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
            <div class="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
              <i data-lucide="truck" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="text-[10px] font-black uppercase text-amber-400">Sent to Site</div>
              <div id="cable-overall-site" class="text-lg font-black text-amber-700 leading-tight">${this._allProducts.filter(p => p.status === 'SENT_TO_SITE').length} cables</div>
            </div>
          </div>

          <div class="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
            <div class="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
              <i data-lucide="shield-check" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="text-[10px] font-black uppercase text-rose-400">Active Status</div>
              <div id="cable-overall-active" class="text-lg font-black text-rose-700 leading-tight">${this._allProducts.filter(p => String(p.activated) === 'true').length} activated</div>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div class="py-3 px-4">
            <div class="flex flex-wrap gap-2 items-center">
              <label class="input input-bordered input-sm flex items-center gap-2 flex-1 min-w-0">
                <i data-lucide="search" class="w-4 h-4 text-slate-400 shrink-0"></i>
                <input type="text" id="cable-search" class="grow min-w-0 text-sm"
                  placeholder="NO / Cable No / QR / Site…"
                  value="${Helpers.escape(this._filters.search)}"
                  oninput="CablesPage._onFilter()" />
              </label>
              
              <select id="cable-status" class="select select-bordered select-sm min-w-36"
                      onchange="CablesPage._onFilter()">
                <option value="">All Status</option>
                <option value="IN_GODOWN"    ${this._filters.status==='IN_GODOWN'   ?'selected':''}>In Godown</option>
                <option value="SENT_TO_SITE" ${this._filters.status==='SENT_TO_SITE'?'selected':''}>Sent to Site</option>
              </select>

              <select id="cable-event" class="select select-bordered select-sm min-w-36"
                      onchange="CablesPage._onFilter()">
                <option value="">All Order Types</option>
                <option value="DAILY"   ${this._filters.eventType==='DAILY'?'selected':''}>Daily</option>
                <option value="EVENT"   ${this._filters.eventType==='EVENT'?'selected':''}>Event</option>
                <option value="MONTHLY" ${this._filters.eventType==='MONTHLY'?'selected':''}>Monthly</option>
              </select>

              <select id="cable-cat" class="select select-bordered select-sm min-w-36"
                      onchange="CablesPage._onFilter()">
                <option value="">All Categories</option>
                ${categories.map(c => `<option value="${Helpers.escape(c)}"
                  ${this._filters.category===c?'selected':''}>${Helpers.escape(c)}</option>`).join('')}
              </select>
              <select id="cable-core" class="select select-bordered select-sm min-w-24"
                      onchange="CablesPage._onFilter()">
                <option value="">All Cores</option>
                ${cores.map(c => `<option value="${Helpers.escape(c)}"
                  ${this._filters.core===c?'selected':''}>${Helpers.escape(c)}</option>`).join('')}
              </select>
              <select id="cable-sqmm" class="select select-bordered select-sm min-w-24"
                      onchange="CablesPage._onFilter()">
                <option value="">All SQMM</option>
                ${sqmms.map(s => `<option value="${Helpers.escape(s)}"
                  ${this._filters.sqmm===s?'selected':''}>${Helpers.escape(s)} mm²</option>`).join('')}
              </select>

              ${this._isSpecMode ? `
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100">
                  <i data-lucide="info" class="w-3.5 h-3.5 text-indigo-500"></i>
                  <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                    Drill-down: ${Helpers.escape(this._filters.category)} | ${Helpers.escape(this._filters.core)}C
                  </span>
                </div>
              ` : ''}

              <button class="btn btn-ghost btn-sm text-red-600 gap-1 px-2" onclick="CablesPage.clearFilters()" title="Clear Filters">
                <i data-lucide="filter-x" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- ── MOBILE CARD VIEW (hidden on lg+) ────────────────────────── -->
        <div id="cables-cards" class="lg:hidden flex flex-col gap-3"></div>

        <!-- ── DESKTOP TABLE VIEW (hidden on mobile) ──────────────────────── -->
        <div class="hidden lg:block card no-hover bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full table table-zebra border-collapse border border-slate-200 table-auto">
              <thead class="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                <tr>
                  <th class="py-3 px-4 w-12 border-r border-slate-200">#</th>
                  <th class="py-3 px-2 w-8 border-r border-slate-200 text-center">
                    <input type="checkbox" id="cable-select-all" class="checkbox checkbox-xs" onchange="CablesPage.toggleSelectAll(this)" />
                  </th>

                  <th class="py-3 px-4 cursor-pointer hover:text-slate-900 group w-[320px] border-r border-slate-200" onclick="CablesPage._onSort('category')">
                    <div class="flex items-center gap-1">Category / Specs ${this._getSortIcon('category')}</div>
                  </th>
                  <th class="py-3 px-4 cursor-pointer hover:text-slate-900 group w-16 border-r border-slate-200" onclick="CablesPage._onSort('quantity')">
                    <div class="flex items-center gap-1">Qty ${this._getSortIcon('quantity')}</div>
                  </th>
                  <th class="py-3 px-4 cursor-pointer hover:text-slate-900 group w-32 border-r border-slate-200" onclick="CablesPage._onSort('status')">
                    <div class="flex items-center gap-1">Status ${this._getSortIcon('status')}</div>
                  </th>
                  <th class="py-3 px-4 w-48 border-r border-slate-200">Site / Person</th>
                  <th class="py-3 px-4 w-28 border-r border-slate-200">Order Type</th>
                  <th class="py-3 px-4 cursor-pointer hover:text-slate-900 group w-28 border-r border-slate-200" onclick="CablesPage._onSort('dateOut')">
                    <div class="flex items-center gap-1">Date Out ${this._getSortIcon('dateOut')}</div>
                  </th>
                  <th class="py-3 px-4 text-center w-20 border-r border-slate-200">Active</th>
                  <th class="py-3 px-4 pr-4 w-24">Actions</th>
                </tr>
              </thead>
              <tbody id="cables-body"></tbody>
            </table>
          </div>
          <div id="cables-pagination-desktop" class="px-4 pb-3"></div>
        </div>

        <!-- Mobile pagination -->
        <div id="cables-pagination-mobile" class="lg:hidden"></div>
      </div>

      <!-- ── ADD / EDIT MODAL ────────────────────────────────────────────── -->
      <dialog id="modal-cable" class="modal modal-bottom sm:modal-middle">
        <div class="modal-box w-full max-w-lg">
          <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </form>
          <h3 id="modal-cable-title" class="font-bold text-lg mb-5">Add Cable</h3>
          <form id="form-cable" onsubmit="CablesPage.save(event)">
            <input type="hidden" id="f-cable-id" />
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              ${UI.field('NO', `<input type="text" id="f-no" class="input input-bordered w-full" placeholder="e.g. 1" />`)}
              <div class="sm:col-span-2">
                ${UI.field('Cable No', `<input type="text" id="f-cableNo" class="input input-bordered w-full" placeholder="CBL-001" required />`, true)}
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              ${UI.field('Category', `<select id="f-category" class="select select-bordered w-full" required>
                <option value="">Select…</option>
                ${categories.map(c=>`<option value="${Helpers.escape(c)}">${Helpers.escape(c)}</option>`).join('')}
              </select>`, true)}
              ${UI.field('Core', `<select id="f-core" class="select select-bordered w-full" required>
                <option value="">Select…</option>
                ${cores.map(c=>`<option value="${Helpers.escape(c)}">${Helpers.escape(c)}</option>`).join('')}
              </select>`, true)}
              ${UI.field('SQMM (mm²)', `<select id="f-sqmm" class="select select-bordered w-full" required>
                <option value="">Select…</option>
                ${sqmms.map(s=>`<option value="${Helpers.escape(s)}">${Helpers.escape(s)} mm²</option>`).join('')}
              </select>`, true)}
              ${UI.field('Meter (Length)', `<input type="number" id="f-meter" class="input input-bordered w-full" placeholder="500" min="1" required />`, true)}
              ${UI.field('Quantity', `<input type="number" id="f-qty" class="input input-bordered w-full" value="1" min="1" />`)}
            </div>
            <div class="mt-3">
              ${UI.field('Remarks', `<input type="text" id="f-remarks" class="input input-bordered w-full" placeholder="Optional…" />`)}
            </div>
            <div class="modal-action mt-5">
              <button type="button" class="btn btn-ghost" onclick="Modal.close('modal-cable')">Cancel</button>
              <button type="submit" id="btn-save-cable" class="btn btn-primary gap-2">
                <i data-lucide="save" class="w-4 h-4"></i> Save Cable
              </button>
            </div>
          </form>
        </div>
      </dialog>

      <!-- ── QR CODE MODAL ───────────────────────────────────────────────── -->
      <dialog id="modal-barcode" class="modal modal-bottom sm:modal-middle">
        <div class="modal-box w-full max-w-sm text-center">
          <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </form>
          <h3 class="font-bold text-lg mb-4">Cable QR Code</h3>
          <div id="barcode-content"></div>
          <div id="barcode-actions" class="flex justify-center gap-2 mt-4"></div>
        </div>
      </dialog>

      <!-- ── CABLE DETAIL MODAL ─────────────────────────────────────────── -->
      <dialog id="modal-cable-detail" class="modal modal-bottom sm:modal-middle">
        <div class="modal-box w-full max-w-md">
          <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </form>
          <h3 class="font-bold text-lg">Cable Details</h3>
          <div id="cable-detail-content" class="mt-4 space-y-1"></div>
          <div class="modal-action mt-5">
            <button class="btn btn-ghost btn-sm" onclick="Modal.close('modal-cable-detail')">Close</button>
            <button id="btn-detail-barcode" class="btn btn-outline btn-sm gap-2">
              <i data-lucide="qr-code" class="w-4 h-4"></i> QR Code
            </button>
            <button id="btn-detail-edit" class="btn btn-primary btn-sm gap-2" style="display:none">
              <i data-lucide="pencil" class="w-4 h-4"></i> Edit
            </button>
          </div>
        </div>
      </dialog>

      <!-- ── BULK UPLOAD MODAL ───────────────────────────────────────────── -->
      <dialog id="modal-bulk" class="modal modal-bottom sm:modal-middle">
        <div class="modal-box w-full max-w-2xl">
          <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </form>
          <h3 class="font-bold text-lg">Bulk Upload Cables</h3>
          <p class="text-sm text-slate-500 mt-1">Upload a CSV file with multiple cables at once (max 2000 rows).</p>

          <!-- Step 1: Choose file -->
          <div id="bulk-step-1" class="mt-5 space-y-4">
            <div class="bg-slate-100 rounded-xl p-4 flex items-center gap-3">
              <i data-lucide="file-spreadsheet" class="w-9 h-9 text-indigo-600 shrink-0"></i>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm">Required columns</div>
                <div class="font-mono text-xs text-slate-500 mt-0.5 truncate">
                  no*, cableNo, category, core, sqmm, meter, quantity*, remarks*
                </div>
              </div>
              <button class="btn btn-outline btn-xs shrink-0 gap-1.5" onclick="Helpers.downloadTemplate()">
                <i data-lucide="download" class="w-3.5 h-3.5"></i> Template
              </button>
            </div>

            <!-- Drop zone -->
            <label id="bulk-dropzone"
              class="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300
                     rounded-xl p-10 cursor-pointer hover:border-primary hover:bg-indigo-50 transition-colors"
              for="bulk-file-input">
              <i data-lucide="upload-cloud" class="w-12 h-12 text-slate-300"></i>
              <div class="text-center">
                <div class="font-semibold text-sm">Drop CSV file here</div>
                <div class="text-xs text-slate-400 mt-0.5">or click to browse</div>
              </div>
              <input type="file" id="bulk-file-input" accept=".csv,.txt"
                class="hidden" onchange="CablesPage._onBulkFileSelect(this)" />
            </label>
          </div>

          <!-- Step 2: Preview -->
          <div id="bulk-step-2" class="hidden mt-4">
            <div class="flex items-center justify-between mb-3">
              <div class="text-sm font-semibold">
                Preview — <span id="bulk-valid-count" class="text-emerald-600">0</span> valid
                <span id="bulk-skip-badge" class="badge badge-warning badge-xs ml-2 hidden">
                  <span id="bulk-skip-count">0</span> warnings
                </span>
              </div>
              <button class="btn btn-ghost btn-xs gap-1.5" onclick="CablesPage._bulkReset()">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Reset
              </button>
            </div>
            <div class="max-h-56 overflow-auto border border-slate-200 rounded-xl">
              <table class="table table-xs table-zebra">
                <thead class="bg-slate-100 text-xs uppercase sticky top-0">
                  <tr>
                    <th>#</th><th>NO</th><th>Cable No</th><th>Category</th>
                    <th>Core</th><th>SQMM</th><th>Meter</th><th>Qty</th><th>Status</th>
                  </tr>
                </thead>
                <tbody id="bulk-preview-body"></tbody>
              </table>
            </div>
            <div id="bulk-error-list" class="mt-2 hidden">
              <div class="text-xs font-bold text-red-600 mb-1">Issues found:</div>
              <ul id="bulk-errors" class="text-xs text-red-600 list-disc list-inside space-y-0.5 max-h-20 overflow-auto"></ul>
            </div>
          </div>

          <!-- Step 3: Result -->
          <div id="bulk-step-3" class="hidden mt-4">
            <div class="flex flex-col items-center gap-3 py-4">
              <div class="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <i data-lucide="check-circle-2" class="w-9 h-9 text-emerald-600"></i>
              </div>
              <div id="bulk-result-text" class="text-sm text-center"></div>
            </div>
          </div>

          <div class="modal-action">
            <button class="btn btn-ghost" onclick="Modal.close('modal-bulk'); CablesPage._bulkReset()">
              Close
            </button>
            <button id="btn-bulk-upload" class="btn btn-primary gap-2 hidden"
              onclick="CablesPage._bulkConfirm()">
              <i data-lucide="upload" class="w-4 h-4"></i>
              Upload <span id="bulk-upload-count">0</span> Cables
            </button>
          </div>
        </div>
      </dialog>`;
    } else {
      const el = document.getElementById('cable-total-count');
      if (el) el.textContent = this._total;
    }

    this._renderTable();
    this._renderCards();
    this._renderPagination();
    if (window.lucide && container) lucide.createIcons({ nodes: [container] });
  },

  // ── Desktop table rows ────────────────────────────────────────────────────
  _renderTable() {
    const body = document.getElementById('cables-body');
    if (!body) return;
    const rowStart = (this._page - 1) * this._pageSize;
    if (!this._products.length) {
      body.innerHTML = `<tr><td colspan="9">
        ${UI.emptyState('package',
          this._total===0?'No cables yet':'No cables match filter',
          this._total===0?'Click "+ Add Cable" to register the first cable':'Clear filters to see all')}
      </td></tr>`;
      if (window.lucide) lucide.createIcons({ nodes: [body] });
      return;
    }
    body.innerHTML = this._products.map((p, i) => {
      const isSite = p.status === 'SENT_TO_SITE';
      const rowClass = isSite ? 'row-status-site' : 'row-status-godown';
      
      return `
    <tr class="group transition-all duration-300 ${rowClass}">
      <!-- 1. Index -->
      <td class="pl-4">
        <div class="text-slate-400 text-[10px] font-black w-6 h-6 rounded-lg bg-slate-100/50 flex items-center justify-center">${rowStart+i+1}</div>
      </td>
      <td class="text-center border-r border-slate-200">
        <input type="checkbox" data-cable-id="${p.id}" class="checkbox checkbox-xs cable-row-select" ${this._selectedCables.has(p.id)?'checked':''} onchange="CablesPage.toggleSelectRow(this)" />
      </td>

      <td>
        <div class="font-black text-slate-900 text-[14px] uppercase tracking-tight">${Helpers.escape(p.category)}</div>
        <div class="mt-2 flex items-center gap-2 flex-wrap">
          <span class="inline-flex items-center px-2 py-1 rounded-md bg-white text-slate-900 font-black text-[13px] border-2 border-slate-200 shadow-sm min-w-[28px] justify-center">
            ${p.no ? `${Helpers.escape(p.no)}` : '—'}
          </span>
          <span class="text-[17px] font-black text-indigo-700 uppercase tracking-tighter">
            ${Helpers.escape(p.core)} / ${Helpers.escape(p.sqmm)}mm²
          </span>
          <span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          <span class="text-[16px] font-black text-emerald-600 bg-white px-3 py-1 rounded-md border-2 border-emerald-200 shadow-sm uppercase tracking-widest">
            ${p.meter}m
          </span>
        </div>
      </td>
      <!-- 4. Qty -->
      <td class="font-bold text-slate-600 text-xs">${p.quantity||1}</td>
      <!-- 5. Status -->
      <td>${Helpers.statusBadge(p.status)}</td>
      <!-- 6. Site / Person -->
      <td>
        ${p.siteName ? `
          <div class="flex flex-col">
            <span class="text-xs font-black text-slate-700 leading-none">${Helpers.escape(p.siteName)}</span>
            <span class="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
              <i data-lucide="user" class="w-2.5 h-2.5"></i> ${Helpers.escape(p.personAssigned || '—')}
            </span>
          </div>
        ` : '<span class="text-slate-300 text-xs font-medium italic">Available</span>'}
      </td>
      <!-- 7. Order Type -->
      <td>
        ${p.siteName ? `
          <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-black uppercase tracking-tighter
            ${p.eventType === 'MONTHLY' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 
              p.eventType === 'EVENT' ? 'bg-pink-100 text-pink-700 border border-pink-200' : 
              'bg-blue-100 text-blue-700 border border-blue-200'}">
            ${Helpers.escape(p.eventType || 'DAILY')}
          </span>
        ` : '<span class="text-slate-200 text-xs">—</span>'}
      </td>
      <!-- 8. Date Out -->
      <td class="text-[10px] font-black text-slate-500 uppercase tracking-tight">
        ${p.dateOut ? `${Helpers.formatDate(p.dateOut)} <span class="text-amber-600 block sm:inline font-bold">(${Math.max(0, Math.ceil(Math.abs(new Date() - new Date(p.dateOut)) / (1000 * 60 * 60 * 24)))}d aging)</span>` : '—'}
      </td>
      <!-- 9. Active -->
      <td class="text-center">
        ${(String(p.activated)==='true'||p.activated===true)
          ? `<i data-lucide="check-circle" class="w-4 h-4 text-indigo-500 mx-auto"></i>`
          : `<i data-lucide="circle" class="w-4 h-4 text-slate-200 mx-auto"></i>`}
      </td>
      <!-- 10. Actions -->
      <td class="pr-4 text-right">
        <div class="flex items-center justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
          ${p.status === 'IN_GODOWN' ? `
          <button class="btn btn-ghost btn-xs btn-square text-amber-600 hover:bg-amber-100 border-none" title="Send to Site"
            onclick="CablesPage.quickAction('SEND_TO_SITE', '${Helpers.escape(p.cableNo)}')">
            <i data-lucide="truck" class="w-4 h-4"></i>
          </button>` : ''}
          ${p.status === 'SENT_TO_SITE' ? `
          <button class="btn btn-ghost btn-xs btn-square text-blue-600 hover:bg-blue-100 border-none" title="Site to Site Transfer"
            onclick="CablesPage.quickAction('SITE_TO_SITE', '${Helpers.escape(p.cableNo)}')">
            <i data-lucide="repeat" class="w-4 h-4"></i>
          </button>
          <button class="btn btn-ghost btn-xs btn-square text-emerald-600 hover:bg-emerald-100 border-none" title="Return to Godown (Close)"
            onclick="CablesPage.quickAction('RETURN_TO_GODOWN', '${Helpers.escape(p.cableNo)}')">
            <i data-lucide="warehouse" class="w-4 h-4"></i>
          </button>` : ''}
          <div class="divider divider-horizontal mx-0 w-1 opacity-20"></div>
          <button class="btn btn-ghost btn-xs btn-square hover:bg-slate-200 border-none" title="QR Code"
            onclick="CablesPage.viewBarcode('${p.id}')">
            <i data-lucide="qr-code" class="w-4 h-4"></i>
          </button>
          ${Auth.canEdit() ? `<button class="btn btn-ghost btn-xs btn-square hover:bg-slate-200 border-none" title="Edit"
            onclick="CablesPage.openEdit('${p.id}')">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>` : ''}
          ${Auth.canDelete() ? `<button class="btn btn-ghost btn-xs btn-square text-red-600 hover:bg-red-100 border-none" title="Delete"
            onclick="CablesPage.delete('${p.id}','${Helpers.escape(p.cableNo)}')">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>` : ''}
        </div>
      </td>
    </tr>`;
    }).join('');
    if (window.lucide) lucide.createIcons({ nodes: [body] });
  },

  // ── Mobile card view (full-width, premium) ───────────────────────────────
  _renderCards() {
    const wrap = document.getElementById('cables-cards');
    if (!wrap) return;

    if (!this._products.length) {
      wrap.innerHTML = `
        <div class="rounded-2xl bg-white border border-slate-200 shadow-sm">
          ${UI.emptyState('package',
            this._total===0 ? 'No cables yet' : 'No match',
            this._total===0 ? 'Tap "+ Add Cable" to begin' : 'Try clearing filters')}
        </div>`;
      if (window.lucide) lucide.createIcons({ nodes: [wrap] });
      return;
    }

    wrap.innerHTML = this._products.map(p => {
      const isActive = String(p.activated)==='true' || p.activated===true;
      const isSite   = p.status === 'SENT_TO_SITE';

      const cardBg = isSite ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200';
      const statusBarColor = isSite ? 'from-amber-400 to-orange-500' : 'from-emerald-400 to-teal-500';

      return `
      <div class="rounded-2xl overflow-hidden shadow-sm border ${cardBg} transition-all duration-300 relative">
        <div class="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${statusBarColor}"></div>

        <div class="flex items-center justify-between px-4 pl-6 pt-4 pb-2 cursor-pointer"
             onclick="CablesPage.viewDetail('${p.id}')">
          <div class="min-w-0 flex-1">
            <div class="text-base font-black text-slate-900 leading-tight truncate uppercase tracking-tighter">REF #${p.no || '—'}</div>
          </div>
          <div class="shrink-0 scale-90 origin-right">
            ${Helpers.statusBadge(p.status)}
          </div>
        </div>

        <div class="px-4 pl-6 pb-4 cursor-pointer" onclick="CablesPage.viewDetail('${p.id}')">
          <div class="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] mb-2 opacity-60">${Helpers.escape(p.category)}</div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center px-2 py-1 rounded-lg bg-white text-slate-900 font-black text-[13px] border-2 border-slate-100 shadow-sm min-w-[28px] justify-center">
              ${p.no ? `${Helpers.escape(p.no)}` : '—'}
            </span>
            <span class="text-[15px] font-black text-indigo-700 uppercase tracking-tighter">
              ${Helpers.escape(p.core)} / ${Helpers.escape(p.sqmm)}mm²
            </span>
            <span class="w-1.5 h-1.5 rounded-full bg-slate-200 mx-0.5"></span>
            <span class="text-[15px] font-black text-emerald-600 bg-emerald-50/50 px-2.5 py-1 rounded-lg border-2 border-emerald-100/50 shadow-sm uppercase tracking-tight">
              ${p.meter}m
            </span>
          </div>
        </div>

        <div class="mx-4 ml-6 border-t border-slate-100/50"></div>

        <div class="px-4 pl-6 py-3 flex items-center justify-between gap-4 cursor-pointer" onclick="CablesPage.viewDetail('${p.id}')">
          <div class="min-w-0 flex-1">
            ${p.siteName ? `
              <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Site Details</div>
              <div class="flex items-center gap-2 flex-wrap">
                <div class="text-sm font-black text-amber-700 uppercase tracking-tight">${Helpers.escape(p.siteName)}</div>
                <div class="text-[10px] text-slate-500 font-bold flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-slate-100 shadow-xs">
                  <i data-lucide="user" class="w-2.5 h-2.5"></i> ${Helpers.escape(p.personAssigned || '—')}
                </div>
                <div class="text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full border shadow-xs
                  ${p.eventType === 'MONTHLY' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                    p.eventType === 'EVENT' ? 'bg-pink-50 text-pink-700 border-pink-200' : 
                    'bg-blue-50 text-blue-700 border-blue-200'}">
                  ${Helpers.escape(p.eventType || 'DAILY')}
                </div>
              </div>
            ` : `
              <div class="text-[9px] font-black uppercase tracking-widest text-emerald-500 opacity-60">Status</div>
              <div class="text-xs font-bold text-slate-400 mt-0.5 italic">GODOWN INVENTORY</div>
            `}
          </div>
          <div class="shrink-0">
             ${isActive
                ? `<span class="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-black uppercase tracking-widest shadow-sm">Active</span>`
                : `<span class="inline-flex items-center px-2 py-1 rounded-md bg-slate-50 text-slate-400 border border-slate-100 text-[9px] font-black uppercase tracking-widest">Inactive</span>`}
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 p-3 pl-6 bg-slate-50/50 border-t border-slate-100">
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
            ${p.dateOut ? `Out: ${Helpers.formatDate(p.dateOut)} <span class="text-amber-600 font-bold ml-1">(${Math.max(0, Math.ceil(Math.abs(new Date() - new Date(p.dateOut)) / (1000 * 60 * 60 * 24)))} days aging)</span>` : 'In Godown'}
          </div>
          <div class="flex gap-2">
            ${p.status === 'IN_GODOWN' ? `
            <button class="btn btn-ghost btn-xs bg-white shadow-sm border-slate-200 text-amber-600"
              onclick="CablesPage.quickAction('SEND_TO_SITE', '${Helpers.escape(p.cableNo)}')">
              <i data-lucide="truck" class="w-3.5 h-3.5"></i> <span class="ml-1 text-[10px] font-black uppercase">Send</span>
            </button>` : `
            <button class="btn btn-ghost btn-xs bg-white shadow-sm border-slate-200 text-emerald-600"
              onclick="CablesPage.quickAction('RETURN_TO_GODOWN', '${Helpers.escape(p.cableNo)}')">
              <i data-lucide="warehouse" class="w-3.5 h-3.5"></i> <span class="ml-1 text-[10px] font-black uppercase">Return</span>
            </button>`}
            <button class="btn btn-ghost btn-xs bg-white shadow-sm border-slate-200"
              onclick="CablesPage.viewDetail('${p.id}')">
              <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      </div>`;
    }).join('');


    if (window.lucide) lucide.createIcons({ nodes: [wrap] });
  },

  // ── Pagination ────────────────────────────────────────────────────────────

  _renderPagination() {
    const opts = {
      current: this._page, totalPages: this._totalPages,
      total: this._total, pageSize: this._pageSize,
      onPage: 'CablesPage.goToPage', onSize: 'CablesPage.setPageSize',
    };
    const d = document.getElementById('cables-pagination-desktop');
    const m = document.getElementById('cables-pagination-mobile');
    if (d) d.innerHTML = UI.pagination(opts);
    if (m) m.innerHTML = UI.pagination({ ...opts, onPage:'CablesPage.goToPage', onSize:'CablesPage.setPageSize' });
  },

  _getSortIcon(col) {
    if (this._sortBy !== col) return '<i data-lucide="chevrons-up-down" class="w-3 h-3 opacity-20 group-hover:opacity-100 transition-opacity"></i>';
    return this._sortDir === 'asc' 
      ? '<i data-lucide="chevron-up" class="w-3 h-3 text-indigo-600"></i>' 
      : '<i data-lucide="chevron-down" class="w-3 h-3 text-indigo-600"></i>';
  },

  async _onSort(col) {
    if (this._sortBy === col) {
      this._sortDir = (this._sortDir === 'asc') ? 'desc' : 'asc';
    } else {
      this._sortBy = col;
      this._sortDir = 'asc';
    }
    this._page = 1;
    Loading.show();
    const container = document.getElementById('main-content');
    await this._fetchPage(container, false);
    Loading.hide();
  },

  _filterTimer: null,
  _onFilter() {
    clearTimeout(this._filterTimer);
    this._filterTimer = setTimeout(async () => {
      this._filters = {
        search:    (document.getElementById('cable-search')?.value  || '').trim(),
        status:    (document.getElementById('cable-status')?.value  || '').trim(),
        category:  (document.getElementById('cable-cat')?.value     || '').trim(),
        core:      (document.getElementById('cable-core')?.value    || '').trim(),
        sqmm:      (document.getElementById('cable-sqmm')?.value    || '').trim(),
        eventType: (document.getElementById('cable-event')?.value   || '').trim(),
      };
      this._page = 1;
      const container = document.getElementById('main-content');
      await this._fetchPage(container, false);
    }, 350);
  },

  async goToPage(page) {
    this._page = page;
    Loading.show();
    const container = document.getElementById('main-content');
    await this._fetchPage(container, false);
    Loading.hide();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async setPageSize(size) {
    this._pageSize = size; this._page = 1;
    Loading.show();
    const container = document.getElementById('main-content');
    await this._fetchPage(container, false);
    Loading.hide();
  },

  async clearFilters() {
    this._filters = { search:'', status:'', category:'', core:'', sqmm:'', eventType:'' };
    this._sortBy = 'createdAt';
    this._sortDir = 'desc';
    this._isSpecMode = false;
    this._page = 1;
    const container = document.getElementById('main-content');
    if (container) await this.render(container);
  },

  openAdd() {
    document.getElementById('modal-cable-title').textContent = 'Add New Cable';
    document.getElementById('f-cable-id').value = '';
    document.getElementById('form-cable').reset();
    Modal.open('modal-cable');
    if (window.lucide) lucide.createIcons({ nodes: [document.getElementById('modal-cable')] });
  },

  openEdit(id) {
    const p = this._products.find(p => String(p.id) === String(id));
    if (!p) return;
    document.getElementById('modal-cable-title').textContent = 'Edit Cable';
    document.getElementById('f-cable-id').value  = p.id;
    document.getElementById('f-no').value        = p.no || '';
    document.getElementById('f-cableNo').value   = p.cableNo;
    document.getElementById('f-category').value  = p.category;
    document.getElementById('f-core').value      = p.core;
    document.getElementById('f-sqmm').value      = p.sqmm;
    document.getElementById('f-meter').value     = p.meter;
    document.getElementById('f-qty').value       = p.quantity || 1;
    document.getElementById('f-remarks').value   = p.remarks || '';
    Modal.open('modal-cable');
    if (window.lucide) lucide.createIcons({ nodes: [document.getElementById('modal-cable')] });
  },

  async save(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-cable');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Saving…';
    const id   = document.getElementById('f-cable-id').value;
    const data = {
      no:       document.getElementById('f-no').value.trim(),
      cableNo:  document.getElementById('f-cableNo').value.trim(),
      category: document.getElementById('f-category').value,
      core:     document.getElementById('f-core').value,
      sqmm:     document.getElementById('f-sqmm').value,
      meter:    parseFloat(document.getElementById('f-meter').value),
      quantity: parseInt(document.getElementById('f-qty').value) || 1,
      remarks:  document.getElementById('f-remarks').value.trim(),
    };
    try {
      const res = id ? await API.updateProduct(id, data) : await API.addProduct(data);
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Save Cable';
      if (res.success) {
        Toast.show('success', id ? 'Cable Updated' : 'Cable Added', `${data.cableNo} saved.`);
        Modal.close('modal-cable');
        
        // Refresh based on active page
        const titleEl = document.getElementById('header-page-title');
        const isSpecDetail = titleEl && titleEl.textContent === 'Specification Details';
        
        if (isSpecDetail && window.SpecDetailsPage) {
           await SpecDetailsPage._fetchPage(null, false);
        } else {
           if (!id) this._page = 1;
           await this._fetchPage(null, false);
        }
      } else { Toast.show('error','Save Failed', res.message); }
    } catch(err) {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Save Cable';
      Toast.show('error','Error', err.message);
    }
    if (window.lucide) lucide.createIcons({ nodes: [btn.parentElement] });
  },

  async delete(id, cableNo) {
    if (!Auth.requireRole('SUPER_ADMIN')) return;
    if (!confirm(`Delete "${cableNo}"?\nThis cannot be undone.`)) return;
    try {
      const res = await API.deleteProduct(id);
      if (res.success) {
        Toast.show('success','Deleted', `${cableNo} removed.`);
        if (this._products.length === 1 && this._page > 1) this._page--;
        await this._fetchPage(null, false);
      } else { Toast.show('error','Delete Failed', res.message); }
    } catch(err) { Toast.show('error','Error', err.message); }
  },

  viewBarcode(id) {
    const p = this._products.find(p => String(p.id) === String(id));
    if (!p) return;
    document.getElementById('barcode-content').innerHTML = `
      <div class="bg-white p-4 rounded-2xl border border-slate-200 inline-flex items-center justify-center shadow-sm min-h-[200px] min-w-[200px]">
        <img id="bc-img" class="max-w-full rounded-lg" style="width:200px; height:200px;" 
             alt="QR Code" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" />
      </div>
      <div class="mt-4 space-y-4">
        <div class="text-sm text-slate-500">
          <strong>${Helpers.escape(p.cableNo)}</strong><br/>
          <span class="text-xs">${Helpers.escape(p.category)} · ${Helpers.escape(p.core)}/${Helpers.escape(p.sqmm)}mm²</span><br/>
          <code class="text-xs text-slate-400">${Helpers.escape(p.barcode)}</code>
        </div>
        <div class="divider text-[10px] uppercase tracking-widest opacity-30">QR Size</div>
        <div class="flex flex-col gap-2">
          <select id="bc-size-select" class="select select-bordered select-sm w-full">
            <option value="256">Small (256px)</option>
            <option value="512" selected>Medium (512px)</option>
            <option value="1024">Large (1024px)</option>
          </select>
          <button class="btn btn-primary btn-sm w-full gap-2" onclick="CablesPage.downloadBarcode('${p.id}')">
            <i data-lucide="download" class="w-4 h-4"></i> Download QR PNG
          </button>
        </div>
      </div>`;
    document.getElementById('barcode-actions').innerHTML =
      `<button class="btn btn-ghost btn-sm" onclick="Modal.close('modal-barcode')">Close</button>
       <button class="btn btn-outline btn-sm gap-2" onclick="window.print()">
         <i data-lucide="printer" class="w-4 h-4"></i> Print Label
       </button>`;
    Modal.open('modal-barcode');
    
    // Generate QR and update img src
    Barcode.generate('bc-img', p.barcode);
    
    if (window.lucide) lucide.createIcons({ nodes: [document.getElementById('modal-barcode')] });
  },

  async downloadBarcode(id) {
    const p = this._products.find(p => String(p.id) === String(id));
    if (!p) return;
    const size = parseInt(document.getElementById('bc-size-select').value);
    
    Toast.show('info', 'Preparing...', 'Generating high quality QR');
    await Barcode.downloadPNG(p, { size });
    Toast.show('success', 'Downloaded', 'QR Code PNG saved.');
  },

  async exportExcel() {
    if (!this._total) { Toast.show('warning','No Data','Nothing to export.'); return; }
    Loading.show('Preparing Styled Excel...');
    try {
      const params = { pageSize: 9999, page: 1, sortBy: this._sortBy, sortDir: this._sortDir,
        ...Object.fromEntries(Object.entries(this._filters).filter(([,v]) => v)) };
      const res = await API.getProducts(params);
      Loading.hide();
      if (!res.data?.length) return;

      const workbook = new ExcelJS.Workbook();
      
      // 1. Create Master Sheet
      const masterSheet = workbook.addWorksheet('All Inventory');
      const cols = [
        { header: '#',           key: 'index',    width: 6 },
        { header: 'NO',          key: 'no',       width: 6 },
        { header: 'CABLE NO',    key: 'cableNo',  width: 18 },
        { header: 'CATEGORY',    key: 'category', width: 20 },
        { header: 'CORE',        key: 'core',     width: 8 },
        { header: 'SQMM',        key: 'sqmm',     width: 8 },
        { header: 'METER',       key: 'meter',    width: 10 },
        { header: 'QTY',         key: 'quantity', width: 8 },
        { header: 'STATUS',      key: 'status',   width: 18 },
        { header: 'SITE NAME',   key: 'siteName', width: 25 },
        { header: 'PERSON',      key: 'person',   width: 20 },
        { header: 'DATE OUT',    key: 'dateOut',  width: 15 },
        { header: 'ORDER TYPE',  key: 'eventType', width: 14 },
        { header: 'AGING',       key: 'aging',    width: 14 },
        { header: 'REMARKS',     key: 'remarks',  width: 30 }
      ];

      const applyStyles = (ws) => {
        ws.columns = cols;
        const headerRow = ws.getRow(1);
        headerRow.height = 30;
        headerRow.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
          cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFF' }, size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
      };

      const addDataRows = (ws, items) => {
        items.forEach((p, i) => {
          const row = ws.addRow({
            index:    i + 1,
            no:       p.no || '',
            cableNo:  p.cableNo,
            category: p.category,
            core:     p.core,
            sqmm:     p.sqmm,
            meter:    p.meter,
            quantity: p.quantity || 1,
            status:   p.status.replace(/_/g, ' '),
            siteName: p.siteName || 'GODOWN',
            person:   p.personAssigned || '—',
            dateOut:  p.dateOut ? Helpers.formatDate(p.dateOut) : '—',
            eventType: p.status === 'IN_GODOWN' ? '—' : (p.eventType || '—'),
            aging:    p.dateOut ? `${Math.max(0, Math.ceil(Math.abs(new Date() - new Date(p.dateOut)) / (1000 * 60 * 60 * 24)))} days` : '—',
            remarks:  p.remarks || ''
          });
          row.height = 24;
          row.eachCell(cell => {
            cell.font = { name: 'Arial', size: 9 };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
            cell.border = {
               top: { style: 'thin', color: { argb: 'E2E8F0' } },
               bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
               left: { style: 'thin', color: { argb: 'E2E8F0' } },
               right: { style: 'thin', color: { argb: 'E2E8F0' } }
            };
            if (i % 2 === 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
            }
          });
          ['index', 'no', 'core', 'sqmm', 'meter', 'quantity'].forEach(key => {
            row.getCell(key).alignment = { horizontal: 'center', vertical: 'middle' };
          });
          const statusCell = row.getCell('status');
          if (statusCell.value === 'SENT TO SITE') {
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
            statusCell.font = { name: 'Arial', bold: true, color: { argb: '92400E' }, size: 9 };
          } else if (statusCell.value === 'IN GODOWN') {
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
            statusCell.font = { name: 'Arial', bold: true, color: { argb: '065F46' }, size: 9 };
          }
        });
      };

      applyStyles(masterSheet);
      addDataRows(masterSheet, res.data);

      // 2. Create Event Type sheets (DAILY, EVENT, and MONTHLY)
      const deployedItems = res.data.filter(p => p.status === 'SENT_TO_SITE');
      const dailyItems = deployedItems.filter(p => (p.eventType || '').toString().trim().toUpperCase() === 'DAILY');
      const eventItems = deployedItems.filter(p => (p.eventType || '').toString().trim().toUpperCase() === 'EVENT');
      const monthlyItems = deployedItems.filter(p => (p.eventType || '').toString().trim().toUpperCase() === 'MONTHLY');
      
      const dailySheet = workbook.addWorksheet('Daily Orders');
      applyStyles(dailySheet);
      if (dailyItems.length > 0) addDataRows(dailySheet, dailyItems);
      
      const eventSheet = workbook.addWorksheet('Event Orders');
      applyStyles(eventSheet);
      if (eventItems.length > 0) addDataRows(eventSheet, eventItems);
      
      const monthlySheet = workbook.addWorksheet('Monthly Orders');
      applyStyles(monthlySheet);
      if (monthlyItems.length > 0) addDataRows(monthlySheet, monthlyItems);

      // 3. Group by Category + Core/SQMM for separate sheets
      const groups = {};
      res.data.forEach(p => {
        const cat = (p.category || '').toString().trim().toUpperCase().replace(/S$/, '');
        const key = `${cat}_${p.core}_${p.sqmm}`.substring(0, 31); // Excel limit
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      });

      Object.entries(groups).forEach(([name, items]) => {
        // Also ensure duplicate worksheet names doesn't crash Excel if trailing 'S' removal maps to same
        const safeName = name.replace(/[\/*?\[\]:]/g, '-');
        try {
          const ws = workbook.addWorksheet(safeName);
          applyStyles(ws);
          addDataRows(ws, items);
        } catch(e) {
          // Fallback if worksheet name somehow overlaps
          const ws = workbook.addWorksheet(safeName + '-' + Math.floor(Math.random() * 100));
          applyStyles(ws);
          addDataRows(ws, items);
        }
      });

      // Write to buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `cables_report_${new Date().toISOString().slice(0,10)}.xlsx`;
      link.click();
      
      Toast.show('success','Excel Exported',`${res.data.length} cables saved (with Event Types).`);
    } catch(err) { Loading.hide(); Toast.show('error','Excel Error', err.message); }
  },

  async exportPDF() {
    if (!this._total) { Toast.show('warning','No Data','Nothing to export.'); return; }
    Loading.show('Preparing PDF...');
    try {
      const params = { pageSize: 9999, page: 1, sortBy: this._sortBy, sortDir: this._sortDir,
        ...Object.fromEntries(Object.entries(this._filters).filter(([,v]) => v)) };
      const res = await API.getProducts(params);
      Loading.hide();
      if (!res.data?.length) return;

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

      // Add Header
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('CABLE INVENTORY REPORT', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
      doc.text(`Total Records: ${res.data.length}`, 14, 33);

      const tableData = res.data.map((p, i) => [
        i + 1,
        p.cableNo,
        `${p.category}\n(${p.core}/${p.sqmm}mm²)`,
        p.meter + 'm',
        p.status.replace(/_/g, ' '),
        p.siteName || '—',
        p.personAssigned || '—',
        p.dateOut ? Helpers.formatDate(p.dateOut) : '—',
        p.eventType || '—',
        p.dateOut ? `${Math.max(0, Math.ceil(Math.abs(new Date() - new Date(p.dateOut)) / (1000 * 60 * 60 * 24)))}d aging` : '—'
      ]);

      doc.autoTable({
        startY: 40,
        head: [['#', 'Cable No', 'Category/Specs', 'Meter', 'Status', 'Site Name', 'Person', 'Date Out', 'Order Type', 'Aging']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7, textColor: [50, 50, 50] },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { fontStyle: 'bold', cellWidth: 20 },
          2: { cellWidth: 32 },
          3: { fontStyle: 'bold', textColor: [5, 150, 105], cellWidth: 15 }, // emerald-600
          4: { fontStyle: 'bold', cellWidth: 22 },
          5: { cellWidth: 25 },
          6: { cellWidth: 20 },
          7: { cellWidth: 18 },
          8: { cellWidth: 18 },
          9: { fontStyle: 'bold', textColor: [217, 119, 6], cellWidth: 18 } // amber-600
        },
        alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
        margin: { top: 40 },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
        }
      });

      doc.save(`cables_report_${new Date().toISOString().slice(0,10)}.pdf`);
      Toast.show('success','PDF Exported',`${res.data.length} cables saved to PDF.`);
    } catch(err) { Loading.hide(); Toast.show('error','PDF Error', err.message); }
  },

  async downloadAllQRs() {
    if (!this._total) { Toast.show('warning','No Data','Nothing to export.'); return; }
    Loading.show('Preparing QR Codes...');
    try {
      if (typeof JSZip === 'undefined') {
        Loading.show('Loading compression tools...');
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
        Loading.show('Preparing QR Codes...');
      }

      if (typeof QRious === 'undefined') {
        Loading.show('Loading QR generator...');
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
        Loading.show('Preparing QR Codes...');
      }

      const params = { pageSize: 9999, page: 1, sortBy: this._sortBy, sortDir: this._sortDir,
        ...Object.fromEntries(Object.entries(this._filters).filter(([,v]) => v)) };
      const res = await API.getProducts(params);
      if (!res.data?.length) { Loading.hide(); return; }

      const zip = new JSZip();

      for (const p of res.data) {
        const dataUrl = await Barcode.generatePNGDataURL(p);
        if (dataUrl) {
          const base64Data = dataUrl.split(',')[1];
          const fileName = `${p.category || 'INV'}_${p.core || ''}_${p.sqmm || ''}mm2_${p.meter || 0}M_${p.cableNo}.png`.replace(/[\s\/]/g, '_');
          zip.file(fileName, base64Data, { base64: true });
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `qr_codes_${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();

      Loading.hide();
      Toast.show('success', 'ZIP Created', `Downloaded all QR codes as a ZIP.`);
    } catch (err) { Loading.hide(); Toast.show('error', 'Export Error', err.message); }
  },

  toggleSelectAll(el) {
    const checked = el.checked;
    this._selectedCables.clear();
    const cbs = document.querySelectorAll('.cable-row-select');
    cbs.forEach(cb => {
      cb.checked = checked;
      const id = cb.getAttribute('data-cable-id');
      if (checked && id) this._selectedCables.add(id);
    });
  },

  toggleSelectRow(el) {
    const id = el.getAttribute('data-cable-id');
    if (el.checked) {
      this._selectedCables.add(id);
    } else {
      this._selectedCables.delete(id);
      const allCb = document.getElementById('cable-select-all');
      if (allCb) allCb.checked = false;
    }
  },

  async printSelectedQRs() {
    let list = [];
    if (this._selectedCables.size > 0) {
      list = this._allProducts.filter(p => this._selectedCables.has(p.id));
    } else {
      const confirmAll = confirm('No cables selected. Generate QR labels for all cables on the current page?');
      if (!confirmAll) return;
      list = this._products;
    }

    if (!list || !list.length) {
      Toast.show('warning', 'No Data', 'Please select cables to print.');
      return;
    }

    Loading.show('Generating QR Label PDF...');
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4'); // portrait

      // Page configuration
      const marginX = 15;
      const marginY = 15;
      const labelW = 56;
      const labelH = 62;
      const gapX = 6;
      const gapY = 6;
      const cols = 3;
      const rows = 4;
      const labelsPerPage = cols * rows;

      let idx = 0;
      for (const p of list) {
        if (idx > 0 && idx % labelsPerPage === 0) {
          doc.addPage();
        }

        const pageIdx = idx % labelsPerPage;
        const col = pageIdx % cols;
        const row = Math.floor(pageIdx / cols);

        const x = marginX + col * (labelW + gapX);
        const y = marginY + row * (labelH + gapY);

        // Draw label box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, labelW, labelH, 3, 3, 'FD');

        // Draw top header inside label
        doc.setFillColor(79, 70, 229); // indigo-600
        doc.roundedRect(x, y, labelW, 8, 3, 3, 'F');
        // Overwrite bottom part of rounded header
        doc.rect(x, y + 5, labelW, 3, 'F');

        // Header text
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.text(`CABLETRACK [${p.no || 'N/A'}]`, x + labelW / 2, y + 5, { align: 'center' });

        // Fetch / Generate QR
        const dataUrl = await Barcode.generatePNGDataURL(p);
        if (dataUrl) {
          doc.addImage(dataUrl, 'PNG', x + (labelW - 30) / 2, y + 10, 30, 30);
        }

        // Add Product Details
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85); // slate-700
        doc.setFont('Helvetica', 'bold');
        doc.text(`Cable No: ${p.cableNo}`, x + labelW / 2, y + 44, { align: 'center' });

        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.setFont('Helvetica', 'normal');
        doc.text(`${p.category}`, x + labelW / 2, y + 49, { align: 'center' });

        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFont('Helvetica', 'bold');
        doc.text(`${p.core}C / ${p.sqmm}mm²  —  ${p.meter}M`, x + labelW / 2, y + 55, { align: 'center' });

        idx++;
      }

      doc.save(`cable_qr_labels_${new Date().toISOString().slice(0, 10)}.pdf`);
      Loading.hide();
      Toast.show('success', 'PDF Saved', 'QR Label PDF downloaded successfully!');
    } catch (err) {
      Loading.hide();
      console.error(err);
      Toast.show('error', 'Print Error', err.message);
    }
  },

  quickAction(mode, cableNo) {
    App.navigateTo('scan').then(() => {
      setTimeout(() => {
        if (window.ScanPage) {
          ScanPage.setMode(mode);
          ScanPage.setInputMode('SCAN');
          const inp = document.getElementById('scan-input');
          if (inp) {
            inp.value = cableNo;
            inp.focus();
            Toast.show('info', mode.replace(/_/g,' '), 'Fill in the details and click Scan to process.');
          }
        }
      }, 150);
    });
  },

  // ── Cable detail view ─────────────────────────────────────────────────────
  viewDetail(id) {
    const p = this._products.find(p => String(p.id) === String(id));
    if (!p) return;
    const isActive = String(p.activated) === 'true' || p.activated === true;
    const fields = [
      { label:'NO',          value: p.no || '—',               bold: true },
      { label:'Cable No',    value: p.cableNo,                 bold: true },
      { label:'QR Code / ID',value: p.barcode,                  mono: true },
      { label:'Category',    value: p.category                             },
      { label:'Core',        value: p.core                                 },
      { label:'SQMM',        value: p.sqmm ? `${p.sqmm} mm²` : '—'       },
      { label:'Meter',       value: p.meter ? `${p.meter} m` : '—'        },
      { label:'Quantity',    value: p.quantity || 1                        },
      { label:'Status',      value: Helpers.statusBadge(p.status), html: true },
      { label:'Activated',   value: isActive ? '<span class="badge badge-success badge-sm">Yes</span>' : '<span class="badge badge-ghost badge-sm">No</span>', html: true },
      { label:'Site',        value: p.siteName        || '—'               },
      { label:'Person',      value: p.personAssigned  || '—'               },
      { label:'Date Out',    value: Helpers.formatDate(p.dateOut)          },
      { label:'Date In',     value: Helpers.formatDate(p.dateIn)           },
      { label:'Remarks',     value: p.remarks         || '—'               },
      { label:'Created',     value: Helpers.formatDateTime(p.createdAt)    },
      { label:'Updated',     value: Helpers.formatDateTime(p.updatedAt)    },
    ];
    document.getElementById('cable-detail-content').innerHTML = `
      <div class="divide-y divide-slate-200">
        ${fields.map(f => `
        <div class="flex items-start gap-3 py-2">
          <span class="text-xs text-slate-400 w-24 shrink-0 pt-0.5 font-medium">${f.label}</span>
          <span class="${f.bold?'font-bold':''} ${f.mono?'font-mono text-xs':''} text-sm flex-1">
            ${f.html ? f.value : Helpers.escape(String(f.value))}
          </span>
        </div>`).join('')}
      </div>`;

    // Wire action buttons
    const btnEdit    = document.getElementById('btn-detail-edit');
    const btnBarcode = document.getElementById('btn-detail-barcode');
    btnBarcode.onclick = () => { Modal.close('modal-cable-detail'); this.viewBarcode(id); };
    if (Auth.canEdit()) {
      btnEdit.style.display = '';
      btnEdit.onclick = () => { Modal.close('modal-cable-detail'); this.openEdit(id); };
    } else {
      btnEdit.style.display = 'none';
    }

    Modal.open('modal-cable-detail');
    if (window.lucide) lucide.createIcons({ nodes: [document.getElementById('modal-cable-detail')] });
  },

  // ── Bulk Upload ───────────────────────────────────────────────────────────
  _bulkRows: [],

  openBulkUpload() {
    this._bulkReset();
    Modal.open('modal-bulk');
    if (window.lucide) lucide.createIcons({ nodes: [document.getElementById('modal-bulk')] });
  },

  _bulkReset() {
    this._bulkRows = [];
    const s1 = document.getElementById('bulk-step-1');
    const s2 = document.getElementById('bulk-step-2');
    const s3 = document.getElementById('bulk-step-3');
    const btn = document.getElementById('btn-bulk-upload');
    if (s1) s1.classList.remove('hidden');
    if (s2) s2.classList.add('hidden');
    if (s3) s3.classList.add('hidden');
    if (btn) btn.classList.add('hidden');
    const fi = document.getElementById('bulk-file-input');
    if (fi) fi.value = '';
  },

  _onBulkFileSelect(input) {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = Helpers.parseCSV(e.target.result);
        if (!rows.length) { Toast.show('warning','Empty file','No data rows found.'); return; }

        // Validate rows
        const required = ['cableno','category','core','sqmm','meter'];
        const valid    = [];
        const errors   = [];

        rows.forEach((row, idx) => {
          // Normalize header keys (CSV may use different casing, spaces, underscores)
          const norm = {};
          Object.keys(row).forEach(k => { 
            const normalized = k.toLowerCase().replace(/[\s_-]/g,'').trim();
            norm[normalized] = row[k];
          });

          const missing = required.filter(f => !norm[f] || !String(norm[f]).trim());
          if (missing.length) {
            errors.push(`Row ${idx+1}: missing ${missing.join(', ')}`);
          } else {
            // Extract all fields, handling both formats (with or without 'no' column)
            const extracted = {
              no:              (norm.no || norm.ref || '').toString().trim(),
              cableNo:         norm.cableno.toString().trim(),
              category:        norm.category.toString().trim(),
              core:            norm.core.toString().trim(),
              sqmm:            norm.sqmm.toString().trim(),
              meter:           parseFloat(norm.meter) || 0,
              quantity:        parseInt(norm.quantity) || 1,
              status:          (norm.status || 'IN_GODOWN').toString().trim(),
              siteName:        (norm.sitename || '').toString().trim(),
              personAssigned:  (norm.personassigned || '').toString().trim(),
              activated:       (norm.activated || 'false').toString().trim(),
              eventType:       (norm.eventtype || 'DAILY').toString().trim().toUpperCase(),
              remarks:         (norm.remarks || '').toString().trim(),
            };
            
            // Validate non-empty critical fields
            if (!extracted.cableNo) {
              errors.push(`Row ${idx+1}: cableNo cannot be empty`);
            } else {
              valid.push(extracted);
            }
          }
        });

        this._bulkRows = valid;

        // Render preview
        const body = document.getElementById('bulk-preview-body');
        if (body) {
          body.innerHTML = valid.map((r,i) => `
          <tr>
            <td class="text-slate-400">${i+1}</td>
            <td class="text-xs font-black text-slate-400">${Helpers.escape(r.no || '-')}</td>
            <td class="font-semibold">${Helpers.escape(r.cableNo)}</td>
            <td class="text-xs">${Helpers.escape(r.category)}</td>
            <td class="text-xs">${Helpers.escape(r.core)}</td>
            <td class="text-xs">${Helpers.escape(r.sqmm)}</td>
            <td class="text-xs">${r.meter}m</td>
            <td class="text-xs">${r.quantity}</td>
            <td><span class="badge badge-xs ${r.status === 'SENT_TO_SITE' ? 'badge-warning' : 'badge-success'}">${Helpers.escape(r.status)}</span></td>
          </tr>`).join('');
        }

        // Update counts
        const vc = document.getElementById('bulk-valid-count');
        const sc = document.getElementById('bulk-skip-count');
        const sb = document.getElementById('bulk-skip-badge');
        const uc = document.getElementById('bulk-upload-count');
        if (vc) vc.textContent = valid.length;
        if (sc) sc.textContent = errors.length;
        if (sb) sb.classList.toggle('hidden', errors.length === 0);
        if (uc) uc.textContent = valid.length;

        // Error list
        const el = document.getElementById('bulk-error-list');
        const eu = document.getElementById('bulk-errors');
        if (el && eu) {
          el.classList.toggle('hidden', errors.length === 0);
          eu.innerHTML = errors.map(e => `<li>${Helpers.escape(e)}</li>`).join('');
        }

        // Show step 2
        document.getElementById('bulk-step-1').classList.add('hidden');
        document.getElementById('bulk-step-2').classList.remove('hidden');
        if (valid.length > 0) {
          document.getElementById('btn-bulk-upload').classList.remove('hidden');
        }
      } catch(err) {
        Toast.show('error','Parse Error', err.message);
      }
    };
    reader.readAsText(file);
  },

  async _bulkConfirm() {
    if (!this._bulkRows.length) return;
    const btn = document.getElementById('btn-bulk-upload');
    btn.disabled = true;
    
    try {
      const batchSize = 2000; // Match backend limit
      const batches = [];
      for (let i = 0; i < this._bulkRows.length; i += batchSize) {
        batches.push(this._bulkRows.slice(i, i + batchSize));
      }
      
      let totalInserted = 0;
      let totalSkipped = 0;
      let allErrors = [];
      
      // Process batches sequentially
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchNum = i + 1;
        const totalBatches = batches.length;
        
        btn.innerHTML = `<span class="loading loading-spinner loading-xs"></span> Batch ${batchNum}/${totalBatches}…`;
        
        const res = await API.bulkAddProducts(batch);
        if (res.success) {
          const { inserted, skipped, errors } = res.data || res;
          totalInserted += inserted;
          totalSkipped += skipped;
          if (errors?.length) allErrors.push(...errors);
        } else {
          throw new Error(res.message || 'Batch upload failed');
        }
      }
      
      btn.disabled = false;
      document.getElementById('bulk-step-2').classList.add('hidden');
      document.getElementById('bulk-step-3').classList.remove('hidden');
      btn.classList.add('hidden');

      const errNote = allErrors?.length ? `<div class="text-xs text-red-600 mt-2">${allErrors.length} item(s) had issues</div>` : '';
      document.getElementById('bulk-result-text').innerHTML = `
        <div class="text-lg font-bold text-emerald-600">${totalInserted} cables added!</div>
        ${totalSkipped ? `<div class="text-sm text-slate-500 mt-1">${totalSkipped} duplicate(s) skipped</div>` : ''}
        ${errNote}`;
      Toast.show('success','Bulk Upload Done', `${totalInserted} cables inserted (${batches.length} batch${batches.length>1?'es':''})`);
      this._bulkRows = [];
      await this._fetchPage(null, false); // refresh list
    } catch(err) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="upload" class="w-4 h-4"></i> Retry Upload`;
      if (window.lucide) lucide.createIcons({ nodes: [btn] });
      Toast.show('error','Error', err.message);
    }
  },
};
