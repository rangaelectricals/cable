/**
 * Scan Operations page — Compact, mobile-first responsive layout
 * Workflow: ACTIVATE → IN_GODOWN | SEND_TO_SITE: IN_GODOWN→SENT_TO_SITE | RETURN_TO_GODOWN: SENT_TO_SITE→IN_GODOWN
 */
const ScanPage = {
  _mode: 'ACTIVATE',
  _inputMode: 'SCAN',
  _sessionScans: [],
  _selectedCables: [], // For bulk selection
  _allCables: [],      // Cache for multi-select

  async render(container) {
    if (!Auth.canScan()) {
      container.innerHTML = UI.emptyState('lock', 'Access Denied', 'Admin role required to perform scanning.');
      if (window.lucide) lucide.createIcons({ nodes: [container] });
      return;
    }

    container.innerHTML = `
    <div class="min-h-screen bg-slate-50/50 pb-20 page-enter">
      
      <!-- ── Desktop Compact Header ── -->
      <header class="bg-white border-b border-slate-200/60 sm:sticky sm:top-[64px] z-[40] md:z-[60] backdrop-blur-xl">
        <div class="w-full max-w-none px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div class="flex items-center gap-2 sm:gap-3">
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow">
              <i data-lucide="scan-line" class="w-4.5 h-4.5 sm:w-5 sm:h-5"></i>
            </div>
            <div>
              <h1 class="text-sm sm:text-lg font-bold text-slate-900 tracking-tight leading-none">Operations Control</h1>
              <p class="text-[10px] sm:text-xs text-slate-400 mt-1">Efficient Cable Lifecycle & Inventory Tracking</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-right">
              <p class="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Session Scans</p>
              <span id="stat-session-count" class="text-sm sm:text-lg font-extrabold text-slate-900 tabular-nums">0 Items</span>
            </div>
          </div>
        </div>

        <!-- Mode Tabs -->
        <div class="p-2 sm:p-3 bg-slate-50 border-t border-slate-100">
          <div class="w-full max-w-none">
            <div class="bg-slate-200/60 p-1 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-1">
              ${[
                { id: 'ACTIVATE', icon: 'zap', short: 'Activate', color: 'indigo' },
                { id: 'SEND_TO_SITE', icon: 'truck', short: 'Dispatch', color: 'amber' },
                { id: 'SITE_TO_SITE', icon: 'repeat', short: 'Transfer', color: 'blue' },
                { id: 'RETURN_TO_GODOWN', icon: 'warehouse', short: 'Return', color: 'emerald' }
              ].map(m => `
                <button id="tab-${m.id}" onclick="ScanPage.setMode('${m.id}')"
                  class="w-full px-1.5 sm:px-3 py-1.5 sm:py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 group relative">
                  <i data-lucide="${m.icon}" class="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-105 transition-transform"></i>
                  <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">${m.short}</span>
                  <div id="indicator-${m.id}" class="absolute bottom-0 left-3 sm:left-4 right-3 sm:right-4 h-0.5 bg-current rounded-full opacity-0 scale-x-0 active-indicator transition-all"></div>
                </button>`).join('')}
            </div>
          </div>
        </div>
      </header>

      <main class="w-full max-w-none p-2 sm:p-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          <!-- Left/Top Column (Input controls) -->
          <div class="lg:col-span-6 xl:col-span-7 space-y-4 sm:space-y-6">
            <div class="bg-white rounded-xl shadow border border-slate-200/60 overflow-visible relative">
              
              <!-- Card Status Header -->
              <div id="mode-header" class="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div class="flex items-center gap-2 sm:gap-3">
                  <div id="mode-icon-box" class="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center text-white shadow flex-shrink-0">
                    <i id="mode-icon" data-lucide="zap" class="w-4.5 h-4.5 sm:w-5 sm:h-5"></i>
                  </div>
                  <div>
                    <h2 id="mode-title" class="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-tight">Activate Cable</h2>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span id="mode-status-tag" class="px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Ready</span>
                      <span class="text-[9px] sm:text-[10px] font-medium text-slate-400 uppercase tracking-wider">• <span id="mode-desc">Mode Alpha</span></span>
                    </div>
                  </div>
                </div>

                <!-- Input Switcher -->
                <div class="bg-slate-100 p-1 rounded-lg flex items-center gap-1 w-full sm:w-auto">
                  <button id="btn-mode-scan" onclick="ScanPage.setInputMode('SCAN')" class="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all text-center">
                    Scanner
                  </button>
                  <button id="btn-mode-select" onclick="ScanPage.setInputMode('SELECT')" class="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all text-center">
                    Manual
                  </button>
                </div>
              </div>

              <!-- Main Controller Body -->
              <div class="p-4 sm:p-6 space-y-4">
                
                <!-- Dynamic Payload Fields -->
                <div id="extra-fields" class="hidden animate-slideDown">
                  <div class="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-4">
                    <div id="extra-site" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div class="space-y-1">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destination Hub</label>
                        <input type="text" id="f-site-name" class="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="Search site..." />
                      </div>
                      <div class="space-y-1">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assignment Officer</label>
                        <input type="text" id="f-person" class="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="Name..." />
                      </div>
                      <div class="space-y-1">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Type</label>
                        <select id="f-event-type" class="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-800 focus:border-slate-900 outline-none transition-all">
                          <option value="DAILY">Daily Order</option>
                          <option value="MONTHLY">Monthly Order</option>
                          <option value="EVENT">Event</option>
                        </select>
                      </div>
                      <div class="col-span-full space-y-1">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mission Remarks</label>
                        <textarea id="f-scan-remark" rows="2" class="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="Operational notes..."></textarea>
                      </div>
                    </div>

                    <div id="extra-return" class="hidden space-y-4">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="space-y-1">
                          <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Final Meter Reading</label>
                          <input type="number" id="f-meter-bal" class="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="0.00" />
                        </div>
                      </div>
                      <div class="space-y-1">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Condition Assessment</label>
                        <textarea id="f-return-remark" rows="2" class="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="Assess returned state..."></textarea>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Capture Module -->
                <div class="space-y-4">
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

                  <!-- Unified Action Bar -->
                  <div class="flex flex-col sm:flex-row items-stretch gap-3">
                    <div class="flex-1 relative min-w-0">
                      <div id="wrap-scan-input" class="relative group h-full">
                        <i data-lucide="hash" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors flex-shrink-0"></i>
                        <input type="text" id="scan-input" 
                          class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-900 outline-none transition-all"
                          placeholder="Serial or QR Code..." />
                      </div>

                      <div id="wrap-scan-select" class="hidden relative h-full">
                        <button onclick="ScanPage.toggleMultiSelect()" id="btn-multi-select"
                          class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 flex items-center justify-between group hover:bg-white hover:border-slate-900 transition-all">
                          <div class="flex items-center gap-3 min-w-0">
                            <i data-lucide="package-search" class="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors"></i>
                            <span id="multi-select-label" class="text-xs font-bold text-slate-400 group-hover:text-slate-900 transition-colors truncate">Manifest Selection</span>
                          </div>
                          <i data-lucide="chevron-down" class="w-4 h-4 text-slate-300 group-hover:text-slate-900"></i>
                        </button>

                        <!-- Multi-Select Panel -->
                        <div id="multi-select-dropdown" class="hidden absolute inset-x-0 top-full z-[100] mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-slideUp">
                          <div class="p-3 border-b border-slate-100">
                            <div class="relative group">
                              <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-slate-900"></i>
                              <input type="text" id="multi-search" oninput="ScanPage.renderMultiSelectList(this.value)"
                                class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                placeholder="Search inventory..." />
                            </div>
                          </div>
                          <div id="multi-select-list" class="max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scrollbar"></div>
                          <div class="p-3 bg-slate-50/80 border-t border-slate-100 flex gap-2 sticky bottom-0">
                            <button onclick="ScanPage.clearMultiSelection()" class="flex-1 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-rose-500 hover:bg-rose-50 rounded transition-colors">Reset</button>
                            <button onclick="ScanPage.toggleMultiSelect()" class="flex-[2] bg-slate-900 text-white rounded-lg py-2 text-[10px] font-bold uppercase tracking-wider shadow hover:bg-black transition-colors">Confirm</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="flex gap-2 flex-shrink-0">
                      <button id="btn-camera" onclick="ScanPage.toggleCamera()" 
                        class="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all">
                        <i data-lucide="camera" class="w-4 h-4"></i>
                      </button>
                      <button onclick="ScanPage.trigger()" 
                        class="flex-1 sm:w-32 h-12 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2">
                        Commit
                      </button>
                    </div>
                  </div>

                  <div id="scan-result" class="hidden animate-slideUp"></div>
                </div>
              </div>
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

          <!-- ── Desktop Operation Log ── -->
          <aside class="hidden lg:block lg:col-span-6 xl:col-span-5 space-y-4 h-fit">
            <div class="bg-white rounded-xl shadow border border-slate-200/60 overflow-hidden flex flex-col h-[520px]">
              <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow">
                    <i data-lucide="terminal" class="w-4.5 h-4.5"></i>
                  </div>
                  <div>
                    <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Live Scan History</h3>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Operation Logs</p>
                  </div>
                </div>
                <button onclick="ScanPage.clearSession()" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all" title="Clear session logs">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>

              <div id="session-scans" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                ${UI.emptyState('activity', 'System Idle', 'Awaiting operational triggers...')}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>

    <style>
      .active-tab-indigo { color: #6366f1 !important; background: #eef2ff !important; }
      .active-tab-amber  { color: #d97706 !important; background: #fffbeb !important; }
      .active-tab-blue   { color: #2563eb !important; background: #eff6ff !important; }
      .active-tab-emerald { color: #059669 !important; background: #ecfdf5 !important; }

      .active-tab-indigo .active-indicator  { opacity: 1 !important; scale-x: 1 !important; background: #6366f1 !important; }
      .active-tab-amber .active-indicator   { opacity: 1 !important; scale-x: 1 !important; background: #d97706 !important; }
      .active-tab-blue .active-indicator    { opacity: 1 !important; scale-x: 1 !important; background: #2563eb !important; }
      .active-tab-emerald .active-indicator { opacity: 1 !important; scale-x: 1 !important; background: #059669 !important; }

      .active-mode-indigo { background: #6366f1; }
      .active-mode-amber  { background: #d97706; }
      .active-mode-blue   { background: #2563eb; }
      .active-mode-emerald { background: #059669; }

      .custom-scrollbar::-webkit-scrollbar { width: 5px; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

      .animate-slideDown { animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .animate-spin-slow { animation: spin 8s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

      .animate-scan-slow { animation: scan 3s ease-in-out infinite; }
      @keyframes scan { 0%, 100% { transform: translateY(-30px); } 50% { transform: translateY(30px); } }

      .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .page-enter { animation: pageEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes pageEnter {
        from { opacity: 0; transform: translateY(15px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>`;

    document.getElementById('scan-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') ScanPage.trigger();
    });

    this.setInputMode('SCAN');
    this.setMode('ACTIVATE');
    if (window.lucide) lucide.createIcons({ nodes: [container] });
  },

  async setInputMode(mode) {
    this._inputMode = mode;
    const btnScan = document.getElementById('btn-mode-scan');
    const btnSelect = document.getElementById('btn-mode-select');
    const wrapInput = document.getElementById('wrap-scan-input');
    const wrapSelect = document.getElementById('wrap-scan-select');
    const btnCamera = document.getElementById('btn-camera');

    if (!btnScan || !btnSelect) return;

    const activeClasses = ['bg-slate-900', 'text-white', 'shadow'];
    const inactiveClasses = ['bg-transparent', 'text-slate-500', 'hover:bg-slate-200/50'];

    if (mode === 'SCAN') {
      btnScan.classList.add(...activeClasses);
      btnScan.classList.remove(...inactiveClasses);
      btnSelect.classList.remove(...activeClasses);
      btnSelect.classList.add(...inactiveClasses);
      
      wrapInput?.classList.remove('hidden');
      wrapSelect?.classList.add('hidden');
      btnCamera?.classList.remove('hidden');
      document.getElementById('scan-input')?.focus();
    } else {
      btnSelect.classList.add(...activeClasses);
      btnSelect.classList.remove(...inactiveClasses);
      btnScan.classList.remove(...activeClasses);
      btnScan.classList.add(...inactiveClasses);
      
      wrapInput?.classList.add('hidden');
      wrapSelect?.classList.remove('hidden');
      btnCamera?.classList.add('hidden');
      this.loadEligibleCables();
    }
  },

  async loadEligibleCables() {
    const listEl = document.getElementById('multi-select-list');
    if (!listEl) return;

    listEl.innerHTML = '<div class="p-4 text-center text-xs font-bold text-slate-400 uppercase animate-pulse">Loading cables...</div>';

    try {
      let statusFilter = '';
      if (this._mode === 'SEND_TO_SITE') statusFilter = 'IN_GODOWN';
      else if (this._mode === 'SITE_TO_SITE' || this._mode === 'RETURN_TO_GODOWN') statusFilter = 'SENT_TO_SITE';

      const res = await API.getProducts({ pageSize: 2000, status: statusFilter });
      this._allCables = res.data || [];

      if (this._mode === 'ACTIVATE') {
        this._allCables = this._allCables.filter(c => String(c.activated) !== 'true' && c.activated !== true);
      } else if (this._mode === 'SEND_TO_SITE') {
        this._allCables = this._allCables.filter(c => String(c.activated) === 'true' || c.activated === true);
      }

      this._selectedCables = [];
      this.updateMultiSelectLabel();
      this.renderMultiSelectList();
    } catch (e) {
      listEl.innerHTML = '<div class="p-4 text-center text-xs font-bold text-rose-500 uppercase">Error loading cables</div>';
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
      (c.sqmm && String(c.sqmm).toLowerCase().includes(q)) ||
      (c.meter && String(c.meter).toLowerCase().includes(q))
    );

    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">No matches</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(c => {
      const isSelected = this._selectedCables.includes(c.barcode);
      return `
      <div onclick="ScanPage.toggleCableSelection('${c.barcode}')" 
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
          </div>
        </div>
      </div>`;
    }).join('');
    if (window.lucide) lucide.createIcons({ nodes: [listEl] });
  },

  toggleCableSelection(barcode) {
    const idx = this._selectedCables.indexOf(barcode);
    if (idx > -1) this._selectedCables.splice(idx, 1);
    else this._selectedCables.push(barcode);
    this.updateMultiSelectLabel();
    this.renderMultiSelectList(document.getElementById('multi-search')?.value || '');
  },

  clearMultiSelection() {
    this._selectedCables = [];
    this.updateMultiSelectLabel();
    this.renderMultiSelectList();
  },

  updateMultiSelectLabel() {
    const label = document.getElementById('multi-select-label');
    if (!label) return;
    if (this._selectedCables.length === 0) {
      label.textContent = 'Select Cables...';
      label.classList.remove('text-indigo-600');
    } else {
      label.textContent = `${this._selectedCables.length} Selected`;
      label.classList.add('text-indigo-600');
    }
  },

  async setMode(mode) {
    this._mode = mode;
    const header = document.getElementById('mode-header');
    const iconBox = document.getElementById('mode-icon-box');
    const icon = document.getElementById('mode-icon');
    const title = document.getElementById('mode-title');
    const desc = document.getElementById('mode-desc');
    const statusTag = document.getElementById('mode-status-tag');

    const config = {
      ACTIVATE: { title: 'Activate Cable', desc: 'Operational Mode Alpha', icon: 'zap', color: 'indigo', status: 'Ready' },
      SEND_TO_SITE: { title: 'Dispatch to Site', desc: 'Logistics Outbound', icon: 'truck', color: 'amber', status: 'In Transit' },
      SITE_TO_SITE: { title: 'Site Transfer', desc: 'Lateral Movement', icon: 'repeat', color: 'blue', status: 'Relocating' },
      RETURN_TO_GODOWN: { title: 'Return Godown', desc: 'Inbound Recovery', icon: 'warehouse', color: 'emerald', status: 'Restocking' }
    };

    const c = config[mode];
    if (title) title.textContent = c.title;
    if (desc) desc.textContent = c.desc;
    if (icon) icon.setAttribute('data-lucide', c.icon);
    if (statusTag) {
      statusTag.textContent = c.status;
      statusTag.className = `px-2.5 py-0.5 bg-${c.color}-100 text-${c.color}-700 rounded text-[10px] font-bold uppercase tracking-wider`;
    }

    // Update Mode Colors
    if (iconBox) {
      iconBox.className = `w-11 h-11 rounded-lg flex items-center justify-center text-white shadow transition-all duration-300 active-mode-${c.color}`;
    }

    // Update Field Visibility
    const extraFields = document.getElementById('extra-fields');
    const extraSite = document.getElementById('extra-site');
    const extraReturn = document.getElementById('extra-return');

    if (extraFields) {
      extraFields.classList.toggle('hidden', mode === 'ACTIVATE');
      if (extraSite) extraSite.classList.toggle('hidden', mode !== 'SEND_TO_SITE' && mode !== 'SITE_TO_SITE');
      if (extraReturn) extraReturn.classList.toggle('hidden', mode !== 'RETURN_TO_GODOWN');
    }

    // Update Navigation States
    const modes = ['ACTIVATE', 'SEND_TO_SITE', 'SITE_TO_SITE', 'RETURN_TO_GODOWN'];
    modes.forEach(m => {
      const btn = document.getElementById(`tab-${m}`);
      if (btn) {
        btn.classList.remove('active-tab-indigo', 'active-tab-amber', 'active-tab-blue', 'active-tab-emerald');
        if (m === mode) {
          btn.classList.add(`active-tab-${config[m].color}`);
        }
      }
    });

    // Clear result
    const res = document.getElementById('scan-result');
    if (res) { res.classList.add('hidden'); res.innerHTML = ''; }

    if (window.lucide) lucide.createIcons({ nodes: [header] });
    this.resumeScanning();
    if (this._inputMode === 'SELECT') this.loadEligibleCables();
    if (this._inputMode === 'SCAN') setTimeout(() => document.getElementById('scan-input')?.focus(), 100);
  },

  async toggleCamera() {
    const wrap = document.getElementById('camera-wrap');
    const btn = document.getElementById('btn-camera');
    if (Barcode.isCameraActive()) {
      Barcode.stopCamera();
      wrap.classList.add('hidden');
      btn.innerHTML = '<i data-lucide="camera" class="w-4 h-4"></i>';
    } else {
      wrap.classList.remove('hidden');
      btn.innerHTML = '<i data-lucide="camera-off" class="w-4 h-4"></i>';
      await Barcode.startCamera('scan-viewport', code => {
        document.getElementById('scan-input').value = code;
        ScanPage.trigger();
      });
    }
    if (window.lucide) lucide.createIcons({ nodes: [btn] });
  },

  async trigger() {
    let barcodes = [];
    if (this._inputMode === 'SCAN') {
      const val = (document.getElementById('scan-input')?.value || '').trim();
      if (val) barcodes = [val];
    } else {
      barcodes = [...this._selectedCables];
    }

    if (barcodes.length === 0) {
      Toast.show('warning', 'Empty Input', this._inputMode === 'SCAN' ? 'Please scan or enter a QR code.' : 'Please select cables from the list.');
      return;
    }

    if (Barcode.isCameraActive()) {
      Barcode.pauseCamera();
    }

    const extra = {};
    if (this._mode === 'SEND_TO_SITE' || this._mode === 'SITE_TO_SITE') {
      extra.siteName = (document.getElementById('f-site-name')?.value || '').trim();
      extra.personAssigned = (document.getElementById('f-person')?.value || '').trim();
      extra.note = (document.getElementById('f-scan-remark')?.value || '').trim();
      extra.eventType = (document.getElementById('f-event-type')?.value || 'DAILY').trim();
      if (!extra.siteName) { Toast.show('warning', 'Required', 'Enter Site Name first.'); return; }
      if (!extra.personAssigned) { Toast.show('warning', 'Required', 'Enter Person Assigned first.'); return; }
    }
    if (this._mode === 'RETURN_TO_GODOWN') {
      const mb = document.getElementById('f-meter-bal')?.value;
      if (mb) extra.meterBalance = parseFloat(mb);
      extra.note = (document.getElementById('f-return-remark')?.value || '').trim();
    }

    const resultDiv = document.getElementById('scan-result');
    resultDiv.innerHTML = `
      <div class="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col items-center gap-3 text-center">
        <div class="loading loading-spinner loading-md text-indigo-600"></div>
        <div>
          <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Bulk Processing</h3>
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Applying changes to ${barcodes.length} items...</p>
        </div>
      </div>`;
    resultDiv.classList.remove('hidden');

    let successCount = 0;
    let lastProduct = null;
    let failMessages = [];

    for (const barcode of barcodes) {
      try {
        const res = await API.scanAction(this._mode, barcode, extra);
        if (res.success) {
          successCount++;
          lastProduct = res.data.product;
          this._addSessionScan(barcode, true, res.data.product);
        } else {
          failMessages.push(`${barcode}: ${res.message}`);
          this._addSessionScan(barcode, false, barcode);
        }
      } catch (err) {
        failMessages.push(`${barcode}: ${err.message}`);
        this._addSessionScan(barcode, false, barcode);
      }
    }

    if (successCount === 0) {
      resultDiv.innerHTML = `
        <div class="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center animate-fadeIn">
          <div class="w-10 h-10 rounded-lg bg-rose-500 text-white flex items-center justify-center mx-auto mb-3 shadow">
             <i data-lucide="alert-circle" class="w-5 h-5"></i>
          </div>
          <h3 class="text-xs font-bold text-rose-800 uppercase tracking-wider">Operation Failed</h3>
          <p class="text-[10px] text-rose-600 font-bold mt-1 uppercase tracking-wider">All ${barcodes.length} items failed.</p>
          <div class="mt-3 p-2 bg-white rounded-lg border border-rose-100 text-left space-y-1">
             ${failMessages.slice(0, 3).map(m => `<p class="text-[10px] font-bold text-slate-500 truncate">• ${Helpers.escape(m)}</p>`).join('')}
             ${failMessages.length > 3 ? `<p class="text-[9px] text-slate-400 italic mt-0.5">+ ${failMessages.length - 3} more errors</p>` : ''}
          </div>
          <button class="w-full mt-3 py-2.5 bg-slate-800 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider" onclick="ScanPage.resumeScanning()">Try Again</button>
        </div>`;
    } else {
      const modeLabel = this._mode.replace(/_/g, ' ');
      const p = lastProduct;
      resultDiv.innerHTML = `
        <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-4 animate-fadeIn shadow-sm">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-11 h-11 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow">
              <i data-lucide="check-circle-2" class="w-6 h-6"></i>
            </div>
            <div class="text-left">
              <h3 class="text-sm font-bold text-emerald-900 uppercase tracking-tight leading-none">${successCount > 1 ? 'Bulk Success' : 'Accepted'}</h3>
              <p class="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1">${successCount} items ${modeLabel}d</p>
            </div>
          </div>

          ${successCount === 1 && p ? `
          <div class="bg-white rounded-xl p-3.5 border border-emerald-100/60 shadow-sm space-y-3">
             <div class="flex items-center gap-2 flex-wrap pb-2 border-b border-slate-50">
                <span class="text-sm font-bold text-slate-900 uppercase tracking-tight">${Helpers.escape(p.cableNo)}</span>
                ${p.no ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-slate-800 font-bold text-[9px] border border-slate-200 bg-white flex-shrink-0">${Helpers.escape(p.no)}</span>` : ''}
                <span class="text-[11px] font-bold text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/30">
                  (${Helpers.escape(p.core)}/${Helpers.escape(p.sqmm)}mm² • ${p.meter}m)
                </span>
             </div>
             <div class="grid grid-cols-2 gap-3">
                <div>
                   <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">New Status</span>
                   ${Helpers.statusBadge(p.status)}
                </div>
                ${p.siteName ? `
                <div>
                   <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Location</span>
                   <span class="text-xs font-bold text-amber-700 uppercase truncate block">${Helpers.escape(p.siteName)}</span>
                </div>` : ''}
             </div>
          </div>` : `
          <div class="bg-white rounded-xl p-3 border border-emerald-100/60 shadow-sm text-center">
             <div class="flex items-center justify-center gap-1.5 mb-1.5">
                <span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-wider">${successCount} Successful</span>
                ${failMessages.length > 0 ? `<span class="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold uppercase tracking-wider">${failMessages.length} Failed</span>` : ''}
             </div>
             <p class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Operational sync established successfully</p>
          </div>`}

          <button class="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm" onclick="ScanPage.resumeScanning()">
            Next Operation
          </button>
        </div>`;
    }

    if (this._inputMode === 'SCAN') document.getElementById('scan-input').value = '';
    else this.clearMultiSelection();

    if (window.lucide) lucide.createIcons({ nodes: [resultDiv] });
  },

  resumeScanning() {
    const resultDiv = document.getElementById('scan-result');
    if (resultDiv) { resultDiv.classList.add('hidden'); resultDiv.innerHTML = ''; }

    if (this._inputMode === 'SCAN') {
      const inp = document.getElementById('scan-input');
      if (inp) { inp.value = ''; inp.focus(); }
    }

    if (Barcode.isCameraActive()) {
      Barcode.resumeCamera();
    }
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
      const empty = UI.emptyState('activity', 'System Idle', 'Awaiting operational triggers...');
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
            ${s.ok ? 'Stored' : 'Fault'}
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
  },
};
