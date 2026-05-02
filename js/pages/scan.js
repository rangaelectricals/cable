/**
 * Scan Operations page — Unified Smart Scanning Hub with Bulk Capability
 * Add multiple cables to selection, apply next logical actions to everything selected.
 */
const ScanPage = {
  _mode: 'ACTIVATE',
  _inputMode: 'SCAN',
  _sessionScans: [],
  _selectedCables: [], // Full cable objects in current selection
  _allCables: [],      // Cache of all cables for the manual switcher

  async render(container) {
    if (!Auth.canScan()) {
      container.innerHTML = UI.emptyState('lock', 'Access Denied', 'Admin role required to perform scanning.');
      if (window.lucide && container) lucide.createIcons({ nodes: [container] });
      return;
    }

    container.innerHTML = `
    <div class="min-h-screen bg-slate-50/50 pb-20 page-enter">
      
      <!-- Desktop Compact Header -->
      <header class="bg-white border-b border-slate-200/60 sm:sticky sm:top-[64px] z-[40] backdrop-blur-xl">
        <div class="w-full max-w-none px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div class="flex items-center gap-2 sm:gap-3">
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow">
              <i data-lucide="scan-line" class="w-4.5 h-4.5 sm:w-5 sm:h-5"></i>
            </div>
            <div>
              <h1 class="text-sm sm:text-lg font-bold text-slate-900 tracking-tight leading-none">Smart Bulk Hub</h1>
              <p class="text-[10px] sm:text-xs text-slate-400 mt-1">Unified Multi-Item & Lifecycle Operations Hub</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-right">
              <p class="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Session Scans</p>
              <span id="stat-session-count" class="text-sm sm:text-lg font-extrabold text-slate-900 tabular-nums">0 Items</span>
            </div>
          </div>
        </div>
      </header>

      <main class="w-full max-w-none p-2 sm:p-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          <!-- Left/Top Column (Input controller) -->
          <div class="lg:col-span-6 xl:col-span-7 space-y-4 sm:space-y-6">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-visible relative">
              
              <!-- Smart Scan Selector Input Header -->
              <div class="p-4 sm:p-6 border-b border-slate-100 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 class="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-tight">Step 1: Manifest Construction</h2>
                    <p class="text-[10px] sm:text-xs font-medium text-slate-400 mt-0.5">Use manual lookup or direct typing/scanning to build the bulk manifest.</p>
                  </div>

                  <!-- Input Switcher -->
                  <div class="bg-slate-100 p-1 rounded-xl flex items-center gap-1 w-full sm:w-auto shrink-0">
                    <button id="btn-mode-scan" onclick="ScanPage.setInputMode('SCAN')" class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-center">
                      Scanner
                    </button>
                    <button id="btn-mode-select" onclick="ScanPage.setInputMode('SELECT')" class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-center">
                      Manual Picker
                    </button>
                  </div>
                </div>

                <!-- Input Field: SCAN Mode -->
                <div id="wrap-scan-input" class="space-y-4">
                  <div class="flex items-center gap-2">
                    <div class="relative group flex-1">
                      <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors"></i>
                      <input type="text" id="smart-scan-input" 
                        class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-900 outline-none transition-all"
                        placeholder="Scan Barcode or Enter No…" autocomplete="off" />
                    </div>
                    <button id="btn-camera" onclick="ScanPage.toggleCamera()" class="btn btn-ghost btn-sm btn-square border border-slate-200 hover:border-slate-400 text-slate-600 hover:text-slate-900 w-12 h-12">
                      <i data-lucide="camera" class="w-4.5 h-4.5"></i>
                    </button>
                  </div>

                  <!-- Camera Viewer Module -->
                  <div id="camera-wrap" class="hidden animate-scaleIn">
                    <div class="relative max-w-xs mx-auto mb-4">
                      <div id="scan-viewport" class="aspect-square rounded-xl overflow-hidden bg-slate-900 border-4 border-white shadow-lg relative ring-1 ring-slate-200">
                        <div class="absolute inset-4 border border-white/20 rounded flex items-center justify-center">
                          <div class="w-full h-[2px] bg-indigo-500 shadow-[0_0_15px_#6366f1] animate-scan-slow opacity-80"></div>
                        </div>
                      </div>
                      <button onclick="ScanPage.toggleCamera()" class="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider shadow-lg flex items-center gap-2 ring-2 ring-white hover:bg-black transition-colors">
                        <i data-lucide="power" class="w-3 h-3"></i> Stop Camera
                      </button>
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quick Select:</span>
                    <button onclick="ScanPage.setQuickValue('RC001')" class="badge badge-ghost badge-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors font-bold tracking-wider text-[9px] cursor-pointer">RC001</button>
                    <button onclick="ScanPage.setQuickValue('MC002')" class="badge badge-ghost badge-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors font-bold tracking-wider text-[9px] cursor-pointer">MC002</button>
                  </div>
                </div>

                <!-- Input Field: SELECT Mode -->
                <div id="wrap-scan-select" class="hidden relative h-full">
                  <button onclick="ScanPage.toggleMultiSelect()" id="btn-multi-select"
                    class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 flex items-center justify-between group hover:bg-white hover:border-slate-900 transition-all">
                    <div class="flex items-center gap-3 min-w-0">
                      <i data-lucide="package-search" class="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-900 transition-colors"></i>
                      <span id="multi-select-label" class="text-xs font-bold text-slate-400 group-hover:text-slate-900 transition-colors truncate">Select Multiple Cables…</span>
                    </div>
                    <i data-lucide="chevron-down" class="w-4.5 h-4.5 text-slate-300 group-hover:text-slate-900"></i>
                  </button>

                  <!-- Multi-Select Search Panel -->
                  <div id="multi-select-dropdown" class="hidden absolute inset-x-0 top-full z-[100] mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-scaleIn">
                    <div class="p-3 border-b border-slate-100">
                      <div class="relative group">
                        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-slate-900"></i>
                        <input type="text" id="multi-search" oninput="ScanPage.renderMultiSelectList(this.value)"
                          class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-900 transition-all"
                          placeholder="Search inventory keywords…" />
                      </div>
                    </div>
                    <div id="multi-select-list" class="max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scrollbar"></div>
                  </div>
                </div>
              </div>

              <!-- Context-Adaptive Bulk Action Card -->
              <div id="smart-action-card" class="hidden min-h-[140px] border-t border-slate-50"></div>
            </div>

            <!-- Mobile Scan History container -->
            <div class="lg:hidden space-y-3">
              <div class="flex items-center justify-between px-1">
                <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Session Log</h3>
                <span id="mobile-session-count" class="text-[10px] font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm">0 Items</span>
              </div>
              <div id="mobile-session-scans" class="space-y-3"></div>
            </div>
          </div>

          <!-- Desktop Operation Log -->
          <aside class="hidden lg:block lg:col-span-6 xl:col-span-5 space-y-4 h-fit">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col h-[600px]">
              <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow">
                    <i data-lucide="terminal" class="w-4.5 h-4.5"></i>
                  </div>
                  <div>
                    <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Live Scan History</h3>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Realtime updates log</p>
                  </div>
                </div>
                <button onclick="ScanPage.clearSession()" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all" title="Clear session logs">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>

              <div id="session-scans" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                ${UI.emptyState('activity', 'System Idle', 'Awaiting operational triggers…')}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>

    <style>
      .custom-scrollbar::-webkit-scrollbar { width: 5px; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      .animate-scan-slow { animation: scan 3s ease-in-out infinite; }
      @keyframes scan { 0%, 100% { transform: translateY(-30px); } 50% { transform: translateY(30px); } }
      .animate-scaleIn { animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.97); }
        to { opacity: 1; transform: scale(1); }
      }
      .page-enter { animation: pageEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes pageEnter {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>`;

    // Add search input enter key trigger
    document.getElementById('smart-scan-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        ScanPage.addInputToSelection();
      }
    });

    // Populate all cables cache for multi lookup
    this.setInputMode('SCAN');
    this.clearSelection();
    this._renderSessionList();
    if (window.lucide && container) lucide.createIcons({ nodes: [container] });
  },

  async setInputMode(mode) {
    this._inputMode = mode;
    const btnScan = document.getElementById('btn-mode-scan');
    const btnSelect = document.getElementById('btn-mode-select');
    const wrapScan = document.getElementById('wrap-scan-input');
    const wrapSelect = document.getElementById('wrap-scan-select');

    if (!btnScan || !btnSelect) return;

    const activeCls = ['bg-slate-900', 'text-white', 'shadow-sm'];
    const inactiveCls = ['bg-transparent', 'text-slate-500', 'hover:bg-slate-200/40'];

    if (mode === 'SCAN') {
      btnScan.classList.add(...activeCls);
      btnScan.classList.remove(...inactiveCls);
      btnSelect.classList.remove(...activeCls);
      btnSelect.classList.add(...inactiveCls);

      wrapScan?.classList.remove('hidden');
      wrapSelect?.classList.add('hidden');
      setTimeout(() => document.getElementById('smart-scan-input')?.focus(), 100);
    } else {
      btnSelect.classList.add(...activeCls);
      btnSelect.classList.remove(...inactiveCls);
      btnScan.classList.remove(...activeCls);
      btnScan.classList.add(...inactiveCls);

      wrapScan?.classList.add('hidden');
      wrapSelect?.classList.remove('hidden');
      this.loadAllCablesCache();
    }
  },

  setQuickValue(val) {
    const inp = document.getElementById('smart-scan-input');
    if (inp) {
      inp.value = val;
      this.addInputToSelection();
    }
  },

  async loadAllCablesCache() {
    try {
      const pRes = await API.getProducts({ page: 1, pageSize: 9999 });
      this._allCables = pRes.data || [];
      this.updateMultiSelectLabel();
      this.renderMultiSelectList();
    } catch (e) {
      Toast.show('error', 'Inventory Error', 'Unable to retrieve master cables list.');
    }
  },

  toggleMultiSelect() {
    const dd = document.getElementById('multi-select-dropdown');
    if (dd) {
      dd.classList.toggle('hidden');
      if (!dd.classList.contains('hidden')) {
        document.getElementById('multi-search')?.focus();
      }
    }
  },

  renderMultiSelectList(query = '') {
    const listEl = document.getElementById('multi-select-list');
    if (!listEl) return;

    const q = query.toLowerCase().trim();
    const filtered = this._allCables.filter(c =>
      (c.cableNo || '').toLowerCase().includes(q) ||
      (c.no && String(c.no).toLowerCase().includes(q)) ||
      (c.core && String(c.core).toLowerCase().includes(q)) ||
      (c.sqmm && String(c.sqmm).toLowerCase().includes(q))
    );

    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">No matching inventory</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(c => {
      const isSelected = this._selectedCables.some(sc => sc.barcode === c.barcode);
      return `
      <div onclick="ScanPage.toggleCableInSelection('${c.barcode}')" 
        class="flex items-center gap-3 p-2.5 rounded-lg transition-all cursor-pointer group ${isSelected ? 'bg-indigo-50 border border-indigo-100/60' : 'hover:bg-slate-50 border border-transparent'}">
        <div class="w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}">
          <i data-lucide="check" class="w-2.5 h-2.5 text-white ${isSelected ? '' : 'hidden'}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-bold text-slate-900 uppercase truncate">${Helpers.escape(c.cableNo)}</span>
            ${c.no ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-slate-800 font-bold text-[9px] border border-slate-200 bg-white flex-shrink-0">${Helpers.escape(c.no)}</span>` : ''}
            <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/30 flex-shrink-0">
              ${Helpers.escape(c.core)}/${Helpers.escape(c.sqmm)}mm² • ${c.meter || 0}m
            </span>
            ${Helpers.statusBadge(c.status)}
          </div>
        </div>
      </div>`;
    }).join('');
    if (window.lucide) lucide.createIcons({ nodes: [listEl] });
  },

  updateMultiSelectLabel() {
    const label = document.getElementById('multi-select-label');
    if (!label) return;
    if (this._selectedCables.length === 0) {
      label.textContent = 'Select Multiple Cables…';
      label.classList.remove('text-indigo-600');
    } else {
      label.textContent = `${this._selectedCables.length} Items Selected`;
      label.classList.add('text-indigo-600');
    }
  },

  toggleCableInSelection(barcode) {
    const idx = this._selectedCables.findIndex(c => c.barcode === barcode);
    if (idx > -1) {
      this._selectedCables.splice(idx, 1);
    } else {
      const match = this._allCables.find(c => c.barcode === barcode);
      if (match) this._selectedCables.push(match);
    }
    this.updateMultiSelectLabel();
    this.renderMultiSelectList(document.getElementById('multi-search')?.value || '');
    this.renderActions();
  },

  removeCableFromSelection(barcode) {
    this._selectedCables = this._selectedCables.filter(c => c.barcode !== barcode);
    this.updateMultiSelectLabel();
    this.renderMultiSelectList(document.getElementById('multi-search')?.value || '');
    this.renderActions();
  },

  clearSelection() {
    this._selectedCables = [];
    this.updateMultiSelectLabel();
    this.renderMultiSelectList();
    this.renderActions();
  },

  async addInputToSelection() {
    const code = (document.getElementById('smart-scan-input')?.value || '').trim();
    if (!code) return;

    const pRes = await API.getProducts({ page: 1, pageSize: 9999 });
    const all = pRes.data || [];
    const matched = all.find(c => 
      String(c.barcode).toUpperCase() === code.toUpperCase() || 
      String(c.cableNo).toUpperCase() === code.toUpperCase() ||
      String(c.no).toUpperCase() === code.toUpperCase()
    );

    if (!matched) {
      Toast.show('error', 'Not Found', `Cable "${code}" could not be located in inventory.`);
      return;
    }

    if (this._selectedCables.some(sc => sc.barcode === matched.barcode)) {
      Toast.show('warning', 'Already Selected', `Cable "${matched.cableNo}" is already in your manifest.`);
    } else {
      this._selectedCables.push(matched);
      this.updateMultiSelectLabel();
      this.renderActions();
      Toast.show('success', 'Manifest Updated', `Added "${matched.cableNo}" successfully.`);
    }

    // Reset input
    const inp = document.getElementById('smart-scan-input');
    if (inp) { inp.value = ''; inp.focus(); }
  },

  renderActions() {
    const wrap = document.getElementById('smart-action-card');
    if (!wrap) return;

    if (this._selectedCables.length === 0) {
      wrap.classList.add('hidden');
      wrap.innerHTML = '';
      return;
    }

    // Selected cables chips list
    const listHtml = this._selectedCables.map(c => `
      <div class="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800">
        <span>${Helpers.escape(c.cableNo)}</span>
        <button onclick="ScanPage.removeCableFromSelection('${c.barcode}')" class="hover:text-rose-600 transition-colors">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      </div>`).join('');

    wrap.innerHTML = `
    <div class="p-4 sm:p-6 space-y-5 animate-scaleIn">
       <!-- Selected Cables Manifest Summary -->
       <div class="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 space-y-3">
         <div class="flex items-center justify-between">
           <span class="text-xs font-black text-slate-500 uppercase tracking-wider">Step 2: Operational Dispatch Forms (${this._selectedCables.length} Cables Selected)</span>
           <button onclick="ScanPage.clearSelection()" class="text-[10px] font-bold text-rose-500 hover:underline uppercase tracking-wider">Clear All</button>
         </div>
         <div class="flex flex-wrap gap-2">
           ${listHtml}
         </div>
       </div>

       <!-- Sub-Actions Panel: Explicit Buttons for Selected Options -->
       <div class="grid grid-cols-1 gap-4">
         
         <!-- 1. Dispatch All -->
         <div class="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 sm:p-5 space-y-4">
           <div class="flex items-center gap-2">
             <div class="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><i data-lucide="truck" class="w-3.5 h-3.5"></i></div>
             <h4 class="text-xs font-black text-amber-900 uppercase tracking-wide">Dispatch to Site</h4>
           </div>
           <p class="text-[10px] text-amber-700/80 font-bold">Deploy all selected cables from central Godown directly to a physical site.</p>
           <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
             <div class="space-y-1">
               <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Site Name</label>
               <input type="text" id="f-dispatch-site" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="Dispatch location…" />
             </div>
             <div class="space-y-1">
               <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Officer Assigned</label>
               <input type="text" id="f-dispatch-person" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="Full name…" />
             </div>
             <div class="space-y-1">
               <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Order Type</label>
               <select id="f-dispatch-event-type" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-slate-900 outline-none transition-all">
                 <option value="DAILY">Daily Order</option>
                 <option value="MONTHLY">Monthly Order</option>
                 <option value="EVENT">Event</option>
               </select>
             </div>
             <div class="space-y-1">
               <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Mission Notes</label>
               <input type="text" id="f-dispatch-note" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="Remarks…" />
             </div>
           </div>
           <button onclick="ScanPage.submitAction('SEND_TO_SITE')" class="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2">
             Dispatch Selection
           </button>
         </div>

         <!-- 2. Transfer All -->
         <div class="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 sm:p-5 space-y-4">
           <div class="flex items-center gap-2">
             <div class="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><i data-lucide="repeat" class="w-3.5 h-3.5"></i></div>
             <h4 class="text-xs font-black text-blue-900 uppercase tracking-wide">Transfer Site</h4>
           </div>
           <p class="text-[10px] text-blue-700/80 font-bold">Relocate all selected cables directly from their current site to a new site.</p>
           <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
             <div class="space-y-1">
               <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">New Destination Site</label>
               <input type="text" id="f-trans-site" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="Destination hub…" />
             </div>
             <div class="space-y-1">
               <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Officer Assigned</label>
               <input type="text" id="f-trans-person" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="Person name…" />
             </div>
           </div>
           <button onclick="ScanPage.submitAction('SITE_TO_SITE')" class="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2">
             Transfer Selection
           </button>
         </div>

         <!-- 3. Return All -->
         <div class="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 sm:p-5 space-y-4">
           <div class="flex items-center gap-2">
             <div class="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><i data-lucide="warehouse" class="w-3.5 h-3.5"></i></div>
             <h4 class="text-xs font-black text-emerald-900 uppercase tracking-wide">Return to Godown</h4>
           </div>
           <p class="text-[10px] text-emerald-700/80 font-bold">Inbound recovery. Return all selected cables from their deployed site to central inventory.</p>
           <div class="space-y-1">
             <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Assessment Notes</label>
             <input type="text" id="f-return-remark" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="State assessed…" />
           </div>
           <button onclick="ScanPage.submitAction('RETURN_TO_GODOWN')" class="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2">
             Return Selection
           </button>
         </div>

         <!-- 4. Activate All -->
         <div class="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 sm:p-5 space-y-4">
           <div class="flex items-center gap-2">
             <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
             <h4 class="text-xs font-black text-indigo-900 uppercase tracking-wide">Activate Cables</h4>
           </div>
           <p class="text-[10px] text-indigo-700/80 font-bold leading-relaxed">Activate all newly created cables in the selection manifest instantly.</p>
           <button onclick="ScanPage.submitAction('ACTIVATE')" class="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2">
             Activate Selection
           </button>
         </div>

       </div>
    </div>`;

    wrap.classList.remove('hidden');
    if (window.lucide) lucide.createIcons({ nodes: [wrap] });
  },

  async submitAction(mode) {
    if (this._selectedCables.length === 0) return;

    const extra = {};
    if (mode === 'SEND_TO_SITE') {
      extra.siteName = document.getElementById('f-dispatch-site')?.value?.trim();
      extra.personAssigned = document.getElementById('f-dispatch-person')?.value?.trim();
      extra.eventType = document.getElementById('f-dispatch-event-type')?.value;
      extra.note = document.getElementById('f-dispatch-note')?.value?.trim();
      if (!extra.siteName) { Toast.show('warning', 'Required', 'Enter Site Name first.'); return; }
      if (!extra.personAssigned) { Toast.show('warning', 'Required', 'Enter Officer name first.'); return; }
    }
    if (mode === 'SITE_TO_SITE') {
      extra.siteName = document.getElementById('f-trans-site')?.value?.trim();
      extra.personAssigned = document.getElementById('f-trans-person')?.value?.trim();
      extra.eventType = 'DAILY';
      if (!extra.siteName) { Toast.show('warning', 'Required', 'Enter Destination Site first.'); return; }
      if (!extra.personAssigned) { Toast.show('warning', 'Required', 'Enter Officer name first.'); return; }
    }
    if (mode === 'RETURN_TO_GODOWN') {
      extra.note = document.getElementById('f-return-remark')?.value?.trim();
    }

    Loading.show(`Syncing ${this._selectedCables.length} cables in background…`);
    let successCount = 0;
    
    for (const c of this._selectedCables) {
      try {
        const res = await API.scanAction(mode, c.barcode, extra);
        if (res.success) {
          successCount++;
          this._addSessionScan(c.barcode, true, res.data.product || c.cableNo);
        } else {
          this._addSessionScan(c.barcode, false, c.cableNo);
        }
      } catch (e) {
        this._addSessionScan(c.barcode, false, c.cableNo);
      }
    }

    Loading.hide();
    if (successCount === this._selectedCables.length) {
      Toast.show('success', 'Operation Complete', `${successCount} items synced successfully.`);
    } else {
      Toast.show('warning', 'Partial Sync', `${successCount} of ${this._selectedCables.length} succeeded.`);
    }

    // Reset list & components
    this.clearSelection();
  },

  async toggleCamera() {
    const wrap = document.getElementById('camera-wrap');
    const btn = document.getElementById('btn-camera');
    if (!wrap || !btn) return;

    if (Barcode.isCameraActive()) {
      Barcode.stopCamera();
      wrap.classList.add('hidden');
      btn.innerHTML = '<i data-lucide="camera" class="w-4.5 h-4.5"></i>';
    } else {
      wrap.classList.remove('hidden');
      btn.innerHTML = '<i data-lucide="camera-off" class="w-4.5 h-4.5"></i>';
      await Barcode.startCamera('scan-viewport', code => {
        const inp = document.getElementById('smart-scan-input');
        if (inp) {
          inp.value = code;
          ScanPage.addInputToSelection();
        }
      });
    }
    if (window.lucide) lucide.createIcons({ nodes: [btn] });
  },

  _addSessionScan(barcode, ok, productOrLabel) {
    this._sessionScans.unshift({
      barcode,
      ok,
      product: typeof productOrLabel === 'object' ? productOrLabel : null,
      label: typeof productOrLabel === 'string' ? productOrLabel : (productOrLabel?.cableNo || barcode),
      mode: this._mode,
      time: new Date()
    });
    
    const sct = document.getElementById('stat-session-count');
    const mct = document.getElementById('mobile-session-count');
    const countText = `${this._sessionScans.length} Items`;
    if (sct) sct.textContent = countText;
    if (mct) mct.textContent = countText;
    this._renderSessionList();
  },

  _renderSessionList() {
    const desktopEl = document.getElementById('session-scans');
    const mobileEl = document.getElementById('mobile-session-scans');

    if (!desktopEl && !mobileEl) return;

    const total = this._sessionScans.length;
    if (total === 0) {
      const empty = UI.emptyState('activity', 'System Idle', 'Awaiting operational triggers…');
      if (desktopEl) desktopEl.innerHTML = empty;
      if (mobileEl) mobileEl.innerHTML = empty;
      return;
    }

    const modeColorMap = {
      'ACTIVATE': { icon: 'zap', bgClass: 'bg-indigo-100', textClass: 'text-indigo-600' },
      'SEND_TO_SITE': { icon: 'truck', bgClass: 'bg-amber-100', textClass: 'text-amber-600' },
      'SITE_TO_SITE': { icon: 'repeat', bgClass: 'bg-blue-100', textClass: 'text-blue-600' },
      'RETURN_TO_GODOWN': { icon: 'warehouse', bgClass: 'bg-emerald-100', textClass: 'text-emerald-600' }
    };

    const listHtml = this._sessionScans.slice(0, 30).map(s => {
      const modeLabel = s.mode.replace(/_/g, ' ');
      const config = modeColorMap[s.mode] || { icon: 'package', bgClass: 'bg-slate-100', textClass: 'text-slate-600' };

      const statusBg = s.ok ? 'bg-emerald-50' : 'bg-rose-50';
      const statusText = s.ok ? 'text-emerald-600' : 'text-rose-600';

      return `
      <div class="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm group hover:border-slate-300 transition-all animate-fadeIn">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-1.5">
            <div class="w-5.5 h-5.5 rounded-md ${config.bgClass} ${config.textClass} flex items-center justify-center">
              <i data-lucide="${config.icon}" class="w-3 h-3"></i>
            </div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${modeLabel}</span>
          </div>
          <span class="text-[9px] font-medium text-slate-300 tabular-nums">${new Date(s.time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-slate-900 truncate">${Helpers.escape(s.label)}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">${s.product?.siteName || 'Wh-Alpha'}</p>
            </div>
          </div>
          <div class="px-2 py-0.5 ${statusBg} ${statusText} rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 border border-current/10">
            ${s.ok ? 'Synced' : 'Error'}
          </div>
        </div>
      </div>`;
    }).join('');

    if (desktopEl) {
      desktopEl.innerHTML = listHtml;
      if (window.lucide) lucide.createIcons({ nodes: [desktopEl] });
    }
    if (mobileEl) {
      mobileEl.innerHTML = listHtml;
      if (window.lucide) lucide.createIcons({ nodes: [mobileEl] });
    }
  },

  clearSession() {
    this._sessionScans = [];
    const sct = document.getElementById('stat-session-count');
    const mct = document.getElementById('mobile-session-count');
    if (sct) sct.textContent = '0 Items';
    if (mct) mct.textContent = '0 Items';
    this._renderSessionList();
  }
};
