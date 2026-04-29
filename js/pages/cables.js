/**
 * Cable Inventory page
 * Mobile: card view   |   Desktop (lg+): table view
 * Server-side pagination + filters
 */
const CablesPage = {
  _products:   [],
  _page:       1,
  _pageSize:   20,
  _total:      0,
  _totalPages: 1,
  _filters:    { search:'', status:'', category:'' },

  async render(container) {
    container.innerHTML = `<div class="flex items-center justify-center h-64">
      <span class="loading loading-spinner loading-lg text-primary"></span></div>`;
    await MastersCache.load();
    await this._fetchPage(container, true);
  },

  async _fetchPage(container, buildShell = false) {
    try {
      const params = {
        page: this._page, pageSize: this._pageSize,
        ...Object.fromEntries(Object.entries(this._filters).filter(([,v]) => v)),
      };
      const res = await API.getProducts(params);
      this._products   = res.data       || [];
      this._total      = res.total      || 0;
      this._totalPages = res.totalPages || 1;
      this._page       = res.page       || 1;
      this._pageSize   = res.pageSize   || this._pageSize;
    } catch(err) {
      if (buildShell) container.innerHTML =
        `<div class="alert alert-error"><i data-lucide="wifi-off" class="w-5 h-5"></i><span>${Helpers.escape(err.message)}</span></div>`;
      else Toast.show('error','Load Error', err.message);
      if (window.lucide) lucide.createIcons({ nodes: [container] });
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
            <button class="btn btn-ghost btn-sm gap-2" onclick="CablesPage.exportCSV()" title="Export CSV">
              <i data-lucide="download" class="w-4 h-4"></i>
              <span class="hidden sm:inline">Export</span>
            </button>
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

        <!-- Filters -->
        <div class="card bg-base-100 shadow-sm border border-base-200">
          <div class="card-body py-3 px-4">
            <div class="flex flex-wrap gap-2">
              <label class="input input-bordered input-sm flex items-center gap-2 flex-1 min-w-0">
                <i data-lucide="search" class="w-4 h-4 text-base-content/40 shrink-0"></i>
                <input type="text" id="cable-search" class="grow min-w-0 text-sm"
                  placeholder="Cable No / QR / Site…"
                  value="${Helpers.escape(this._filters.search)}"
                  oninput="CablesPage._onFilter()" />
              </label>
              <select id="cable-status" class="select select-bordered select-sm min-w-36"
                      onchange="CablesPage._onFilter()">
                <option value="">All Status</option>
                <option value="IN_GODOWN"    ${this._filters.status==='IN_GODOWN'   ?'selected':''}>In Godown</option>
                <option value="SENT_TO_SITE" ${this._filters.status==='SENT_TO_SITE'?'selected':''}>Sent to Site</option>
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
              <button class="btn btn-ghost btn-sm text-error gap-1 px-2" onclick="CablesPage.clearFilters()" title="Clear Filters">
                <i data-lucide="filter-x" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- ── MOBILE GRID VIEW (hidden on lg+) ────────────────────────── -->
        <div id="cables-cards" class="lg:hidden grid grid-cols-2 gap-3"></div>

        <!-- ── DESKTOP TABLE VIEW (hidden on mobile) ──────────────────────── -->
        <div class="hidden lg:block card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="table table-sm table-zebra">
              <thead class="bg-base-200/60 text-xs uppercase tracking-wide">
                <tr>
                  <th>#</th><th>Cable No</th><th>Category</th>
                  <th>Qty</th>
                  <th>Status</th><th>Site</th><th>Person</th>
                  <th>Date Out</th><th>Active</th><th>Actions</th>
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
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${UI.field('Cable No', `<input type="text" id="f-cableNo" class="input input-bordered w-full" placeholder="CBL-001" required />`, true)}
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
          <p class="text-sm text-base-content/50 mt-1">Upload a CSV file with multiple cables at once (max 500 rows).</p>

          <!-- Step 1: Choose file -->
          <div id="bulk-step-1" class="mt-5 space-y-4">
            <div class="bg-base-200/50 rounded-xl p-4 flex items-center gap-3">
              <i data-lucide="file-spreadsheet" class="w-9 h-9 text-primary shrink-0"></i>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm">Required columns</div>
                <div class="font-mono text-xs text-base-content/45 mt-0.5 truncate">
                  cableNo, category, core, sqmm, meter, quantity*, remarks*
                </div>
              </div>
              <button class="btn btn-outline btn-xs shrink-0 gap-1.5" onclick="Helpers.downloadTemplate()">
                <i data-lucide="download" class="w-3.5 h-3.5"></i> Template
              </button>
            </div>

            <!-- Drop zone -->
            <label id="bulk-dropzone"
              class="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-base-300
                     rounded-xl p-10 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              for="bulk-file-input">
              <i data-lucide="upload-cloud" class="w-12 h-12 text-base-content/25"></i>
              <div class="text-center">
                <div class="font-semibold text-sm">Drop CSV file here</div>
                <div class="text-xs text-base-content/40 mt-0.5">or click to browse</div>
              </div>
              <input type="file" id="bulk-file-input" accept=".csv,.txt"
                class="hidden" onchange="CablesPage._onBulkFileSelect(this)" />
            </label>
          </div>

          <!-- Step 2: Preview -->
          <div id="bulk-step-2" class="hidden mt-4">
            <div class="flex items-center justify-between mb-3">
              <div class="text-sm font-semibold">
                Preview — <span id="bulk-valid-count" class="text-success">0</span> valid
                <span id="bulk-skip-badge" class="badge badge-warning badge-xs ml-2 hidden">
                  <span id="bulk-skip-count">0</span> warnings
                </span>
              </div>
              <button class="btn btn-ghost btn-xs gap-1.5" onclick="CablesPage._bulkReset()">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Reset
              </button>
            </div>
            <div class="max-h-56 overflow-auto border border-base-200 rounded-xl">
              <table class="table table-xs table-zebra">
                <thead class="bg-base-200 text-xs uppercase sticky top-0">
                  <tr>
                    <th>#</th><th>Cable No</th><th>Category</th>
                    <th>Core</th><th>SQMM</th><th>Meter</th><th>Qty</th><th>Status</th>
                  </tr>
                </thead>
                <tbody id="bulk-preview-body"></tbody>
              </table>
            </div>
            <div id="bulk-error-list" class="mt-2 hidden">
              <div class="text-xs font-bold text-error mb-1">Issues found:</div>
              <ul id="bulk-errors" class="text-xs text-error list-disc list-inside space-y-0.5 max-h-20 overflow-auto"></ul>
            </div>
          </div>

          <!-- Step 3: Result -->
          <div id="bulk-step-3" class="hidden mt-4">
            <div class="flex flex-col items-center gap-3 py-4">
              <div class="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center">
                <i data-lucide="check-circle-2" class="w-9 h-9 text-success"></i>
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
    }

    this._renderTable();
    this._renderCards();
    this._renderPagination();
    if (window.lucide) lucide.createIcons({ nodes: [container] });
  },

  // ── Desktop table rows ────────────────────────────────────────────────────
  _renderTable() {
    const body = document.getElementById('cables-body');
    if (!body) return;
    const rowStart = (this._page - 1) * this._pageSize;
    if (!this._products.length) {
      body.innerHTML = `<tr><td colspan="12">
        ${UI.emptyState('package',
          this._total===0?'No cables yet':'No cables match filter',
          this._total===0?'Click "+ Add Cable" to register the first cable':'Clear filters to see all')}
      </td></tr>`;
      if (window.lucide) lucide.createIcons({ nodes: [body] });
      return;
    }
    body.innerHTML = this._products.map((p, i) => `
    <tr class="hover group">
      <td class="text-base-content/35 text-xs w-8">${rowStart+i+1}</td>
      <td>
        <div class="font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
          onclick="CablesPage.viewDetail('${p.id}')">${Helpers.escape(p.cableNo)}</div>
        <div class="text-[10px] font-mono text-base-content/30 truncate max-w-[110px]">${Helpers.escape(p.barcode)}</div>
      </td>
      <td class="text-sm">
        <div class="font-medium whitespace-nowrap">${Helpers.escape(p.category)}</div>
        <div class="text-[11px] text-base-content/50 font-medium mt-0.5 whitespace-nowrap">${Helpers.escape(p.core)} / ${Helpers.escape(p.sqmm)}mm² - <span class="font-bold text-primary">${p.meter}m</span></div>
      </td>
      <td class="text-sm">${p.quantity||1}</td>
      <td>${Helpers.statusBadge(p.status)}</td>
      <td class="text-sm">${p.siteName?Helpers.escape(p.siteName):'<span class="text-base-content/25">—</span>'}</td>
      <td class="text-sm">${p.personAssigned?Helpers.escape(p.personAssigned):'<span class="text-base-content/25">—</span>'}</td>
      <td class="text-xs whitespace-nowrap">${Helpers.formatDate(p.dateOut)}</td>
      <td>${(String(p.activated)==='true'||p.activated===true)
        ?'<span class="badge badge-success badge-sm">Active</span>'
        :'<span class="badge badge-ghost badge-sm">No</span>'}</td>
      <td>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          ${p.status === 'IN_GODOWN' ? `
          <button class="btn btn-ghost btn-xs btn-square text-warning" title="Send to Site"
            onclick="CablesPage.quickAction('SEND_TO_SITE', '${Helpers.escape(p.cableNo)}')">
            <i data-lucide="truck" class="w-4 h-4"></i>
          </button>` : ''}
          ${p.status === 'SENT_TO_SITE' ? `
          <button class="btn btn-ghost btn-xs btn-square text-info" title="Site to Site Transfer"
            onclick="CablesPage.quickAction('SITE_TO_SITE', '${Helpers.escape(p.cableNo)}')">
            <i data-lucide="repeat" class="w-4 h-4"></i>
          </button>
          <button class="btn btn-ghost btn-xs btn-square text-success" title="Return to Godown (Close)"
            onclick="CablesPage.quickAction('RETURN_TO_GODOWN', '${Helpers.escape(p.cableNo)}')">
            <i data-lucide="warehouse" class="w-4 h-4"></i>
          </button>` : ''}
          <div class="divider divider-horizontal mx-0 w-1"></div>
          <button class="btn btn-ghost btn-xs btn-square" title="QR Code"
            onclick="CablesPage.viewBarcode('${p.id}')">
            <i data-lucide="qr-code" class="w-4 h-4"></i>
          </button>
          ${Auth.canEdit() ? `<button class="btn btn-ghost btn-xs btn-square" title="Edit"
            onclick="CablesPage.openEdit('${p.id}')">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>` : ''}
          ${Auth.canDelete() ? `<button class="btn btn-ghost btn-xs btn-square text-error" title="Delete"
            onclick="CablesPage.delete('${p.id}','${Helpers.escape(p.cableNo)}')">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>` : ''}
        </div>
      </td>
    </tr>`).join('');
    if (window.lucide) lucide.createIcons({ nodes: [body] });
  },

  // ── Mobile rectangular grid (2-col) ──────────────────────────────────────
  _renderCards() {
    const wrap = document.getElementById('cables-cards');
    if (!wrap) return;

    if (!this._products.length) {
      wrap.innerHTML = `
        <div class="col-span-2 bg-white border border-base-200 rounded-xl">
          ${UI.emptyState('package',
            this._total===0 ? 'No cables yet' : 'No match',
            this._total===0 ? 'Tap “+ Add Cable” to begin' : 'Try clearing filters')}
        </div>`;
      if (window.lucide) lucide.createIcons({ nodes: [wrap] });
      return;
    }

    wrap.innerHTML = this._products.map(p => {
      const isActive = String(p.activated)==='true' || p.activated===true;
      const isSite   = p.status === 'SENT_TO_SITE';
      const statusColor = isSite ? 'bg-warning' : 'bg-success';
      return `
      <div class="bg-white border border-base-200 rounded-xl overflow-hidden flex flex-col shadow-sm">

        <!-- Colour strip + cable no + status — click to view detail -->
        <div class="${statusColor}/10 border-b border-base-200 px-2.5 py-2.5 flex items-center justify-between gap-2
          cursor-pointer hover:bg-base-200/30 transition-colors"
          onclick="CablesPage.viewDetail('${p.id}')">
          <div class="min-w-0">
            <div class="font-bold text-sm truncate leading-tight">${Helpers.escape(p.cableNo)}</div>
            <div class="text-[10px] text-base-content/50 font-medium mt-0.5">${Helpers.escape(p.core)} - ${Helpers.escape(p.sqmm)}mm²</div>
          </div>
          ${Helpers.statusBadge(p.status)}
        </div>

        <!-- Specs 2×2 grid -->
        <div class="grid grid-cols-2 gap-x-2 gap-y-2 px-2.5 py-2.5 flex-1">
          <div>
            <div class="text-[9px] font-bold uppercase tracking-wider text-base-content/30">Category</div>
            <div class="text-xs font-semibold truncate mt-0.5">${Helpers.escape(p.category)}</div>
          </div>
          <div>
            <div class="text-[9px] font-bold uppercase tracking-wider text-base-content/30">Core/SQMM</div>
            <div class="text-xs font-mono mt-0.5">${Helpers.escape(p.core)}/${Helpers.escape(p.sqmm)}</div>
          </div>
          <div>
            <div class="text-[9px] font-bold uppercase tracking-wider text-base-content/30">Meter</div>
            <div class="text-xs font-bold text-primary mt-0.5">${p.meter}m</div>
          </div>
          <div>
            <div class="text-[9px] font-bold uppercase tracking-wider text-base-content/30">Active</div>
            <div class="mt-0.5">
              ${isActive
                ? '<span class="badge badge-success badge-xs">Yes</span>'
                : '<span class="badge badge-ghost badge-xs">No</span>'}
            </div>
          </div>
          ${isSite && p.siteName ? `
          <div class="col-span-2">
            <div class="text-[9px] font-bold uppercase tracking-wider text-base-content/30">Site</div>
            <div class="text-xs mt-0.5 text-warning font-medium">${Helpers.escape(p.siteName)}</div>
          </div>` : ''}
          ${isSite && p.personAssigned ? `
          <div class="col-span-2">
            <div class="text-[9px] font-bold uppercase tracking-wider text-base-content/30">Person</div>
            <div class="text-xs mt-0.5 text-base-content/80 font-medium">${Helpers.escape(p.personAssigned)}</div>
          </div>` : ''}
        </div>

        <!-- Action row -->
        <div class="border-t border-base-200 px-2.5 py-2 flex items-center justify-between bg-base-100/50">
          <div class="flex gap-1.5 flex-wrap">
            ${p.status === 'IN_GODOWN' ? `
            <button class="btn btn-xs btn-warning btn-outline gap-1" onclick="CablesPage.quickAction('SEND_TO_SITE', '${Helpers.escape(p.cableNo)}')">
              <i data-lucide="truck" class="w-3.5 h-3.5"></i> Send
            </button>` : ''}
            ${p.status === 'SENT_TO_SITE' ? `
            <button class="btn btn-xs btn-info btn-outline gap-1" onclick="CablesPage.quickAction('SITE_TO_SITE', '${Helpers.escape(p.cableNo)}')">
              <i data-lucide="repeat" class="w-3.5 h-3.5"></i> Transfer
            </button>
            <button class="btn btn-xs btn-success btn-outline gap-1" onclick="CablesPage.quickAction('RETURN_TO_GODOWN', '${Helpers.escape(p.cableNo)}')">
              <i data-lucide="warehouse" class="w-3.5 h-3.5"></i> Close
            </button>` : ''}
          </div>
          <div class="flex gap-1 shrink-0">
            <button class="btn btn-ghost btn-xs btn-square text-base-content/60 hover:text-primary" onclick="CablesPage.viewBarcode('${p.id}')" title="QR Code">
              <i data-lucide="qr-code" class="w-4 h-4"></i>
            </button>
            ${Auth.canEdit() ? `
            <button class="btn btn-ghost btn-xs btn-square text-base-content/60 hover:text-primary" onclick="CablesPage.openEdit('${p.id}')" title="Edit">
              <i data-lucide="pencil" class="w-4 h-4"></i>
            </button>` : ''}
            ${Auth.canDelete() ? `
            <button class="btn btn-ghost btn-xs btn-square text-base-content/60 hover:text-error" onclick="CablesPage.delete('${p.id}','${Helpers.escape(p.cableNo)}')" title="Delete">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>` : ''}
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

  _filterTimer: null,
  _onFilter() {
    clearTimeout(this._filterTimer);
    this._filterTimer = setTimeout(() => {
      this._filters = {
        search:   (document.getElementById('cable-search')?.value  || '').trim(),
        status:   document.getElementById('cable-status')?.value   || '',
        category: document.getElementById('cable-cat')?.value      || '',
        core:     document.getElementById('cable-core')?.value     || '',
        sqmm:     document.getElementById('cable-sqmm')?.value     || '',
      };
      this._page = 1;
      this._fetchPage(null, false);
    }, 350);
  },

  async goToPage(page) {
    this._page = page;
    Loading.show();
    await this._fetchPage(null, false);
    Loading.hide();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async setPageSize(size) {
    this._pageSize = size; this._page = 1;
    Loading.show();
    await this._fetchPage(null, false);
    Loading.hide();
  },

  async clearFilters() {
    this._filters = { search:'', status:'', category:'', core:'', sqmm:'' };
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
        if (!id) this._page = 1;
        await this._fetchPage(null, false);
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
      <div class="bg-white p-4 rounded-2xl border border-base-200 inline-flex items-center justify-center shadow-sm min-h-[200px] min-w-[200px]">
        <img id="bc-img" class="max-w-full rounded-lg" style="width:200px; height:200px;" 
             alt="QR Code" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" />
      </div>
      <div class="mt-4 space-y-4">
        <div class="text-sm text-base-content/60">
          <strong>${Helpers.escape(p.cableNo)}</strong><br/>
          <span class="text-xs">${Helpers.escape(p.category)} · ${Helpers.escape(p.core)}/${Helpers.escape(p.sqmm)}mm²</span><br/>
          <code class="text-xs text-base-content/35">${Helpers.escape(p.barcode)}</code>
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

  async exportCSV() {
    if (!this._total) { Toast.show('warning','No Data','Nothing to export.'); return; }
    Loading.show('Preparing export…');
    try {
      const params = { pageSize: 9999, page: 1,
        ...Object.fromEntries(Object.entries(this._filters).filter(([,v]) => v)) };
      const res = await API.getProducts(params);
      Loading.hide();
      if (res.data?.length) {
        Helpers.downloadCSV(res.data, `cables_${new Date().toISOString().slice(0,10)}.csv`);
        Toast.show('success','Exported',`${res.data.length} cables downloaded.`);
      }
    } catch(err) { Loading.hide(); Toast.show('error','Export Error', err.message); }
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
      <div class="divide-y divide-base-200">
        ${fields.map(f => `
        <div class="flex items-start gap-3 py-2">
          <span class="text-xs text-base-content/40 w-24 shrink-0 pt-0.5 font-medium">${f.label}</span>
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
          // Normalize header keys (CSV may use different casing)
          const norm = {};
          Object.keys(row).forEach(k => { norm[k.toLowerCase().replace(/[\s_]/g,'')] = row[k]; });

          const missing = required.filter(f => !norm[f] || !String(norm[f]).trim());
          if (missing.length) {
            errors.push(`Row ${idx+1}: missing ${missing.join(', ')}`);
          } else {
            valid.push({
              cableNo:  String(norm.cableno).trim(),
              category: String(norm.category).trim(),
              core:     String(norm.core).trim(),
              sqmm:     String(norm.sqmm).trim(),
              meter:    parseFloat(norm.meter) || 0,
              quantity: parseInt(norm.quantity) || 1,
              remarks:  String(norm.remarks||'').trim(),
            });
          }
        });

        this._bulkRows = valid;

        // Render preview
        const body = document.getElementById('bulk-preview-body');
        if (body) {
          body.innerHTML = valid.map((r,i) => `
          <tr>
            <td class="text-base-content/35">${i+1}</td>
            <td class="font-semibold">${Helpers.escape(r.cableNo)}</td>
            <td>${Helpers.escape(r.category)}</td>
            <td>${Helpers.escape(r.core)}</td>
            <td>${Helpers.escape(r.sqmm)}</td>
            <td>${r.meter}m</td>
            <td>${r.quantity}</td>
            <td><span class="badge badge-success badge-xs">Ready</span></td>
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
    btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Uploading…';

    try {
      const res = await API.bulkAddProducts(this._bulkRows);
      btn.disabled = false;
      if (res.success) {
        const { inserted, skipped, errors } = res.data || res;
        document.getElementById('bulk-step-2').classList.add('hidden');
        document.getElementById('bulk-step-3').classList.remove('hidden');
        btn.classList.add('hidden');

        const errNote = errors?.length ? `<div class="text-xs text-error mt-2">${errors.length} item(s) skipped</div>` : '';
        document.getElementById('bulk-result-text').innerHTML = `
          <div class="text-lg font-bold text-success">${inserted} cables added!</div>
          ${skipped ? `<div class="text-sm text-base-content/50 mt-1">${skipped} duplicate(s) skipped</div>` : ''}
          ${errNote}`;
        Toast.show('success','Bulk Upload Done', `${inserted} cables inserted.`);
        this._bulkRows = [];
        await this._fetchPage(null, false); // refresh list
      } else {
        btn.innerHTML = `<i data-lucide="upload" class="w-4 h-4"></i> Retry Upload`;
        if (window.lucide) lucide.createIcons({ nodes: [btn] });
        Toast.show('error','Upload Failed', res.message);
      }
    } catch(err) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="upload" class="w-4 h-4"></i> Retry Upload`;
      if (window.lucide) lucide.createIcons({ nodes: [btn] });
      Toast.show('error','Error', err.message);
    }
  },
};
