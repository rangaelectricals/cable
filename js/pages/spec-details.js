/**
 * Spec Details Page
 * Shows all cables for a specific Category/Core/SQMM triad
 */
const SpecDetailsPage = {
  _spec: null,
  _products: [],
  _page: 1,
  _pageSize: 20,
  _total: 0,
  _totalPages: 1,
  _sortBy: 'cableNo',
  _sortDir: 'asc',
  _filters: { search: '', status: '' },

  async render(container) {
    if (!this._spec) {
      App.navigateTo('specs');
      return;
    }

    container.innerHTML = `<div class="flex items-center justify-center h-64">
      <span class="loading loading-spinner loading-lg text-indigo-600"></span></div>`;

    await this._fetchPage(container, true);
  },

  async _fetchPage(container, buildShell = false) {
    try {
      const params = {
        page: this._page,
        pageSize: this._pageSize,
        category: this._spec.category,
        core: this._spec.core,
        sqmm: this._spec.sqmm,
        search: this._filters.search,
        status: this._filters.status,
        sortBy: this._sortBy,
        sortDir: this._sortDir
      };

      const res = await API.getProducts(params);
      this._products = res.data || [];
      this._total = res.total || 0;
      this._totalPages = res.totalPages || 1;
    } catch (err) {
      Toast.show('error', 'Fetch Error', err.message);
      return;
    }

    if (buildShell && container) {
      await MastersCache.load();
      const categories = MastersCache.categories();
      const cores      = MastersCache.cores();
      const sqmms      = MastersCache.sqmms();

      const gMeters = this._products.filter(p => p.status === 'IN_GODOWN').reduce((acc, p) => acc + (parseFloat(p.meter)||0), 0);
      const sMeters = this._products.filter(p => p.status === 'SENT_TO_SITE').reduce((acc, p) => acc + (parseFloat(p.meter)||0), 0);
      const totalM = gMeters + sMeters;
      const gPct = totalM ? (gMeters / totalM) * 100 : 0;

      const formatCore = (c) => {
        const val = String(c || '');
        return (val.toLowerCase().endsWith('c')) ? val.toUpperCase() : `${val}C`;
      };

      container.innerHTML = `
        <div class="space-y-6 page-enter">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div class="flex items-center gap-5">
              <div class="w-16 h-16 rounded-[2rem] bg-white shadow-xl border border-slate-100 flex items-center justify-center text-indigo-600">
                <i data-lucide="layers" class="w-8 h-8"></i>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <button class="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1" onclick="App.navigateTo('specs')">
                    <i data-lucide="arrow-left" class="w-3 h-3"></i> Back to Analytics
                  </button>
                </div>
                <h1 class="text-3xl font-black text-slate-900 leading-none mb-1">${formatCore(this._spec.core)} / ${this._spec.sqmm}MM²</h1>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">${this._spec.category}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-white btn-sm shadow-sm border-slate-200 gap-2 rounded-xl" onclick="SpecDetailsPage.exportExcel()">
                <i data-lucide="file-spreadsheet" class="w-4 h-4 text-emerald-600"></i>
                <span class="font-bold text-[11px] uppercase tracking-widest">Excel Report</span>
              </button>
              <button class="btn btn-primary btn-sm gap-2 rounded-xl shadow-lg shadow-indigo-200" onclick="CablesPage.openAdd()">
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span class="font-bold text-[11px] uppercase tracking-widest">Add Cable</span>
              </button>
            </div>
          </div>

          <!-- Advanced Telemetry Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div class="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <div class="flex justify-between items-center mb-6">
                  <h3 class="text-[11px] font-black text-slate-900 uppercase tracking-widest">Length Distribution (Meters)</h3>
                  <div class="flex items-center gap-4">
                     <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-500"></div><span class="text-[10px] font-bold text-slate-400">GODOWN</span></div>
                     <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-amber-400"></div><span class="text-[10px] font-bold text-slate-400">SITE</span></div>
                  </div>
               </div>
               <div class="h-4 w-full bg-slate-50 rounded-full overflow-hidden flex mb-6 shadow-inner border border-slate-100">
                  <div class="h-full bg-emerald-500 transition-all duration-1000 shadow-[2px_0_10px_rgba(16,185,129,0.3)]" style="width: ${gPct}%"></div>
                  <div class="h-full bg-amber-400 transition-all duration-1000 flex-1"></div>
               </div>
               <div class="grid grid-cols-2 gap-8">
                  <div>
                     <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Available in Godown</div>
                     <div class="text-2xl font-black text-emerald-600">${Math.round(gMeters)}<span class="text-xs ml-1 text-slate-300">M</span></div>
                  </div>
                  <div class="text-right">
                     <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Deployed at Sites</div>
                     <div class="text-2xl font-black text-amber-600">${Math.round(sMeters)}<span class="text-xs ml-1 text-slate-300">M</span></div>
                  </div>
               </div>
            </div>
            
            <div class="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-200 flex flex-col justify-between text-white relative overflow-hidden">
               <div class="absolute -right-4 -bottom-4 opacity-10"><i data-lucide="package" class="w-32 h-32"></i></div>
               <div class="relative z-10">
                  <div class="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Total Inventory</div>
                  <div class="text-4xl font-black mb-2">${this._total}</div>
                  <div class="text-[10px] font-bold text-indigo-100 uppercase opacity-80">Total Units Managed</div>
               </div>
               <div class="relative z-10 mt-6 pt-6 border-t border-white/10">
                  <div class="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                     <span>Cumulative</span>
                     <span>${Math.round(totalM)} Meters</span>
                  </div>
               </div>
            </div>
          </div>

          <!-- Controls Bar -->
          <div class="flex flex-wrap gap-3 items-center bg-white p-3 rounded-[2rem] border border-slate-200 shadow-sm">
             <label class="input input-ghost input-sm flex items-center gap-3 flex-1 min-w-[200px]">
                <i data-lucide="search" class="w-4 h-4 text-slate-400"></i>
                <input type="text" id="spec-detail-search" placeholder="Search by Node / Ref..." 
                  class="grow text-sm font-bold text-slate-900" value="${this._filters.search}" oninput="SpecDetailsPage.onFilter()" />
             </label>
             <div class="h-6 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
             <select id="spec-detail-status" class="select select-ghost select-sm font-bold text-[11px] uppercase tracking-widest min-w-36" onchange="SpecDetailsPage.onFilter()">
                <option value="">Status: All</option>
                <option value="IN_GODOWN" ${this._filters.status === 'IN_GODOWN' ? 'selected' : ''}>In Godown</option>
                <option value="SENT_TO_SITE" ${this._filters.status === 'SENT_TO_SITE' ? 'selected' : ''}>Sent to Site</option>
             </select>
             <select id="spec-detail-sort" class="select select-ghost select-sm font-bold text-[11px] uppercase tracking-widest min-w-40" onchange="SpecDetailsPage.onSort(this.value)">
                <option value="cableNo:asc"  ${this._sortBy==='cableNo'&&this._sortDir==='asc'?'selected':''}>Sort: Ref (A-Z)</option>
                <option value="cableNo:desc" ${this._sortBy==='cableNo'&&this._sortDir==='desc'?'selected':''}>Sort: Ref (Z-A)</option>
                <option value="meter:desc"    ${this._sortBy==='meter'&&this._sortDir==='desc'?'selected':''}>Sort: Length (High)</option>
                <option value="meter:asc"     ${this._sortBy==='meter'&&this._sortDir==='asc'?'selected':''}>Sort: Length (Low)</option>
                <option value="createdAt:desc" ${this._sortBy==='createdAt'?'selected':''}>Sort: Newest First</option>
             </select>
          </div>

          <!-- Results Container -->
          <div id="spec-detail-results-mobile" class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
             <!-- Enhanced Cards -->
          </div>

          <div class="hidden lg:block bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
             <div class="overflow-x-auto">
                 <table class="w-full table table-zebra border-collapse border border-slate-200 table-auto">
                    <thead class="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                       <tr>
                          <th class="py-3 px-4 w-12 border-r border-slate-200 text-center">#</th>
                          <th class="py-3 px-4 w-[320px] border-r border-slate-200">Technical Specification</th>
                          <th class="py-3 px-4 w-32 border-r border-slate-200 text-center">Status</th>
                          <th class="py-3 px-4 w-48 border-r border-slate-200">Current Node</th>
                          <th class="py-3 px-4 w-16 border-r border-slate-200 text-center">Qty</th>
                          <th class="py-3 px-4 w-20 border-r border-slate-200 text-center">Active</th>
                          <th class="py-3 px-4 pr-4 w-24 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody id="spec-detail-results-desktop"></tbody>
                 </table>
             </div>
          </div>

          <div id="spec-detail-pagination"></div>
        </div>

        <!-- SHARED MODALS FOR SPECS PAGE -->
        <dialog id="modal-cable" class="modal modal-bottom sm:modal-middle">
          <div class="modal-box w-full max-w-lg">
            <form method="dialog"><button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"><i data-lucide="x" class="w-4 h-4"></i></button></form>
            <h3 id="modal-cable-title" class="font-bold text-lg mb-5 uppercase tracking-widest">Add Cable</h3>
            <form id="form-cable" onsubmit="CablesPage.save(event)">
              <input type="hidden" id="f-cable-id" />
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                ${UI.field('NO', `<input type="text" id="f-no" class="input input-bordered w-full font-bold" placeholder="e.g. 1" />`)}
                <div class="sm:col-span-2">${UI.field('Cable No', `<input type="text" id="f-cableNo" class="input input-bordered w-full font-bold" placeholder="CBL-001" required />`, true)}</div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                ${UI.field('Category', `<select id="f-category" class="select select-bordered w-full font-bold" required>
                  <option value="">Select…</option>
                  ${categories.map(c=>`<option value="${Helpers.escape(c)}">${Helpers.escape(c)}</option>`).join('')}
                </select>`, true)}
                ${UI.field('Core', `<select id="f-core" class="select select-bordered w-full font-bold" required>
                  <option value="">Select…</option>
                  ${cores.map(c=>`<option value="${Helpers.escape(c)}">${Helpers.escape(c)}</option>`).join('')}
                </select>`, true)}
                ${UI.field('SQMM (mm²)', `<select id="f-sqmm" class="select select-bordered w-full font-bold" required>
                  <option value="">Select…</option>
                  ${sqmms.map(s=>`<option value="${Helpers.escape(s)}">${Helpers.escape(s)} mm²</option>`).join('')}
                </select>`, true)}
                ${UI.field('Meter (Length)', `<input type="number" id="f-meter" class="input input-bordered w-full font-bold" placeholder="500" min="1" required />`, true)}
                ${UI.field('Quantity', `<input type="number" id="f-qty" class="input input-bordered w-full font-bold" value="1" min="1" />`)}
              </div>
              <div class="mt-3">${UI.field('Remarks', `<input type="text" id="f-remarks" class="input input-bordered w-full font-bold" placeholder="Optional…" />`)}</div>
              <div class="modal-action mt-5">
                <button type="button" class="btn btn-ghost rounded-xl" onclick="Modal.close('modal-cable')">Cancel</button>
                <button type="submit" id="btn-save-cable" class="btn btn-primary gap-2 rounded-xl">
                  <i data-lucide="save" class="w-4 h-4"></i> Save Cable
                </button>
              </div>
            </form>
          </div>
        </dialog>

        <dialog id="modal-barcode" class="modal modal-bottom sm:modal-middle">
          <div class="modal-box w-full max-w-sm text-center">
            <form method="dialog"><button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"><i data-lucide="x" class="w-4 h-4"></i></button></form>
            <h3 class="font-bold text-lg mb-4 uppercase tracking-widest">Cable QR Code</h3>
            <div id="barcode-content"></div>
            <div id="barcode-actions" class="flex justify-center gap-2 mt-4"></div>
          </div>
        </dialog>

        <dialog id="modal-cable-detail" class="modal modal-bottom sm:modal-middle">
          <div class="modal-box w-full max-w-md">
            <form method="dialog"><button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"><i data-lucide="x" class="w-4 h-4"></i></button></form>
            <h3 class="font-bold text-lg mb-5 uppercase tracking-widest text-indigo-600">Detailed Profile</h3>
            <div id="cable-detail-content"></div>
            <div class="modal-action mt-6 pt-4 border-t border-slate-100">
              <button class="btn btn-primary btn-sm rounded-xl px-6" id="btn-detail-edit">Edit Record</button>
              <button class="btn btn-white btn-sm rounded-xl px-4" id="btn-detail-barcode"><i data-lucide="qr-code" class="w-4 h-4 mr-1"></i> QR</button>
              <button class="btn btn-ghost btn-sm rounded-xl" onclick="Modal.close('modal-cable-detail')">Close</button>
            </div>
          </div>
        </dialog>
      `;
    }

    this._renderResults();
  },

  _renderResults() {
    const mobileGrid = document.getElementById('spec-detail-results-mobile');
    const desktopTable = document.getElementById('spec-detail-results-desktop');
    if (!mobileGrid || !desktopTable) return;

    const formatCore = (c) => {
      const val = String(c || '');
      return (val.toLowerCase().endsWith('c')) ? val.toUpperCase() : `${val}C`;
    };

    if (this._products.length === 0) {
      const empty = `<div class="col-span-full py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No cables found</div>`;
      mobileGrid.innerHTML = empty;
      desktopTable.innerHTML = `<tr><td colspan="7">${empty}</td></tr>`;
      return;
    }

    // Render Mobile Cards
    mobileGrid.innerHTML = this._products.map(p => this._getCardHTML(p)).join('');

    // Render Desktop Rows
    desktopTable.innerHTML = this._products.map((p, i) => {
      const isSite = p.status === 'SENT_TO_SITE';
      const rowClass = isSite ? 'row-status-site' : 'row-status-godown';

      return `
      <tr class="group hover:bg-slate-50/50 transition-colors ${rowClass}">
         <td class="py-3 px-4 text-center border-r border-slate-200/50">
            <span class="text-[10px] font-black text-slate-400 group-hover:text-indigo-600 transition-colors">${(this._page - 1) * this._pageSize + i + 1}</span>
         </td>
         <td class="py-3 px-4 border-r border-slate-200/50">
            <div class="flex flex-col">
               <span class="text-[14px] font-black text-slate-900 uppercase tracking-tight">${Helpers.escape(p.category)}</span>
               <div class="mt-2 flex items-center gap-2 flex-wrap">
                  <span class="inline-flex items-center px-2 py-1 rounded-md bg-white text-slate-900 font-black text-[13px] border-2 border-slate-200 shadow-sm min-w-[28px] justify-center">
                    ${p.no ? `${Helpers.escape(p.no)}` : '—'}
                  </span>
                  <span class="text-[17px] font-black text-indigo-700 uppercase tracking-tighter">
                    ${formatCore(p.core)} / ${Helpers.escape(p.sqmm)}mm²
                  </span>
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  <span class="text-[16px] font-black text-emerald-600 bg-white px-3 py-1 rounded-md border-2 border-emerald-200 shadow-sm uppercase tracking-widest">
                    ${p.meter}m
                  </span>
               </div>
            </div>
         </td>
         <td class="py-3 px-4 text-center border-r border-slate-200/50">
            ${Helpers.statusBadge(p.status)}
         </td>
         <td class="py-3 px-4 border-r border-slate-200/50">
            <div class="flex items-center gap-2">
               <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i>
               <span class="text-[12px] font-bold text-slate-600 truncate max-w-[150px] inline-block">${p.siteName || 'GODOWN'}</span>
            </div>
         </td>
         <td class="py-3 px-4 text-center border-r border-slate-200/50">
            <span class="text-[13px] font-black text-slate-600">${p.quantity||1}</span>
         </td>
         <td class="py-3 px-4 text-center border-r border-slate-200/50">
            ${(String(p.activated)==='true' || p.activated===true) 
              ? `<i data-lucide="check-circle" class="w-4 h-4 text-indigo-600 mx-auto"></i>` 
              : `<i data-lucide="circle" class="w-4 h-4 text-slate-200 mx-auto"></i>`}
         </td>
         <td class="py-3 px-4 pr-4 text-right">
            <div class="flex justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
               <button class="btn btn-ghost btn-xs w-7 h-7 p-0 rounded-lg text-amber-500" title="Edit Cable" onclick="SpecDetailsPage.openEdit('${p.id}')">
                  <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
               </button>
               <button class="btn btn-ghost btn-xs w-7 h-7 p-0 rounded-lg" title="Quick Scan" onclick="App.navigateTo('scan')">
                  <i data-lucide="scan-line" class="w-3.5 h-3.5"></i>
               </button>
            </div>
         </td>
      </tr>
    `; }).join('');

    const pag = document.getElementById('spec-detail-pagination');
    if (pag) {
      pag.innerHTML = UI.pagination({
        page: this._page,
        totalPages: this._totalPages,
        total: this._total,
        pageSize: this._pageSize,
        onPage: 'SpecDetailsPage.goToPage'
      });
    }

    if (window.lucide) lucide.createIcons({ nodes: [mobileGrid, desktopTable, pag] });
  },

  _getCardHTML(p) {
    const formatCore = (c) => {
      const val = String(c || '');
      return (val.toLowerCase().endsWith('c')) ? val.toUpperCase() : `${val}C`;
    };

    return `
      <div class="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden">
         <div class="flex justify-between items-start mb-6">
            <div class="flex items-center gap-4">
               <div class="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                  <i data-lucide="layers" class="w-6 h-6"></i>
               </div>
               <div>
                  <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Item Ref</div>
                  <div class="text-[10px] font-bold text-indigo-600 mt-1">(${formatCore(p.core)} / ${p.sqmm}mm²)</div>
               </div>
            </div>
            <div class="flex flex-col items-end gap-1.5">
               <div class="badge ${p.status === 'IN_GODOWN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'} border font-black text-[9px] px-2.5 py-3 rounded-xl uppercase tracking-widest">
                  ${p.status.replace(/_/g, ' ')}
               </div>
            </div>
         </div>

         <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
               <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Length</div>
               <div class="text-sm font-black text-emerald-600">${p.meter}<span class="text-[10px] ml-1 text-slate-400">M</span></div>
            </div>
            <div class="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
               <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Node</div>
               <div class="text-sm font-black text-slate-900 truncate">${p.siteName || 'GODOWN'}</div>
            </div>
         </div>

         <div class="pt-4 border-t border-slate-100 flex justify-between items-center">
            <div class="flex gap-1">
               <button class="btn btn-ghost btn-xs w-8 h-8 p-0 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors" title="Edit Cable" onclick="SpecDetailsPage.openEdit('${p.id}')">
                  <i data-lucide="edit-3" class="w-4 h-4"></i>
               </button>
               <button class="btn btn-ghost btn-xs w-8 h-8 p-0 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Quick Scan" onclick="App.navigateTo('scan')">
                  <i data-lucide="scan-line" class="w-4 h-4"></i>
               </button>
            </div>
         </div>
      </div>
    `;
  },

  openEdit(id) {
    const p = this._products.find(p => String(p.id) === String(id));
    if (!p) return;
    
    // Populate modal-cable
    const title = document.getElementById('modal-cable-title');
    if (title) title.textContent = 'Edit Cable';
    
    const fields = {
      'f-cable-id': p.id,
      'f-no': p.no || '',
      'f-cableNo': p.cableNo || '',
      'f-category': p.category || '',
      'f-core': p.core || '',
      'f-sqmm': p.sqmm || '',
      'f-meter': p.meter || 0,
      'f-qty': p.quantity || 1,
      'f-remarks': p.remarks || ''
    };

    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });

    // Override the save refresh logic if needed, 
    // but since CablesPage.save will be called, we might need to listen for modal close
    Modal.open('modal-cable');
    if (window.lucide) lucide.createIcons({ nodes: [document.getElementById('modal-cable')] });
  },

  onSort(val) {
    const [field, dir] = val.split(':');
    this._sortBy = field;
    this._sortDir = dir;
    this._page = 1;
    this._fetchPage(null, false);
  },

  onFilter() {
    this._filters.search = document.getElementById('spec-detail-search').value;
    this._filters.status = document.getElementById('spec-detail-status').value;
    this._page = 1;
    this._fetchPage(null, false);
  },

  async goToPage(p) {
    this._page = p;
    await this._fetchPage(null, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async exportExcel() {
    if (!this._total) { Toast.show('warning','No Data','Nothing to export.'); return; }
    Loading.show('Preparing Styled Excel...');
    try {
      // Fetch ALL items for this spec (pageSize 9999)
      const params = { 
        pageSize: 9999, page: 1, 
        category: this._spec.category,
        core: this._spec.core,
        sqmm: this._spec.sqmm,
        search: this._filters.search,
        status: this._filters.status,
        sortBy: this._sortBy, 
        sortDir: this._sortDir 
      };
      const res = await API.getProducts(params);
      Loading.hide();
      if (!res.data?.length) return;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Spec Inventory');

      // Define Columns
      worksheet.columns = [
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
        { header: 'REMARKS',     key: 'remarks',  width: 30 }
      ];

      // Add Data
      res.data.forEach((p, i) => {
        worksheet.addRow({
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
          remarks:  p.remarks || ''
        });
      });

      // Style Header
      const headerRow = worksheet.getRow(1);
      headerRow.height = 30;
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
        cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFF' }, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Style Rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.height = 24;
        row.eachCell((cell) => {
          cell.font = { name: 'Arial', size: 9 };
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.border = {
            top:    { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            left:   { style: 'thin', color: { argb: 'E2E8F0' } },
            right:  { style: 'thin', color: { argb: 'E2E8F0' } }
          };
          if (rowNumber % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
          }
        });
        ['index', 'no', 'core', 'sqmm', 'meter', 'quantity'].forEach(key => {
          row.getCell(key).alignment = { horizontal: 'center', vertical: 'middle' };
        });
        const statusCell = row.getCell('status');
        if (statusCell.value === 'SENT TO SITE') {
          statusCell.font = { bold: true, color: { argb: 'B45309' } };
        } else {
          statusCell.font = { bold: true, color: { argb: '059669' } };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `spec_report_${this._spec.core}_${this._spec.sqmm}_${new Date().toISOString().slice(0,10)}.xlsx`;
      link.click();
      Toast.show('success','Excel Exported',`${res.data.length} items saved.`);
    } catch(err) { Loading.hide(); Toast.show('error','Excel Error', err.message); }
  }
};
