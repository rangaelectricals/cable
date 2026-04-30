/**
 * Scan Operations page — mobile-first, Lucide icons
 * Workflow: ACTIVATE → IN_GODOWN | SEND_TO_SITE: IN_GODOWN→SENT_TO_SITE | RETURN_TO_GODOWN: SENT_TO_SITE→IN_GODOWN
 */
const ScanPage = {
  _mode: 'ACTIVATE',
  _inputMode: 'SCAN',
  _sessionScans: [],
  _selectedCables: [], // For bulk selection
  _allCables: [],      // Cache for multi-select search

  async render(container) {
    if (!Auth.canScan()) {
      container.innerHTML = UI.emptyState('lock', 'Access Denied', 'Admin role required to perform scanning.');
      if (window.lucide) lucide.createIcons({ nodes: [container] });
      return;
    }

    container.innerHTML = `
    <div class="space-y-4 page-enter pb-16 lg:pb-0 max-w-6xl mx-auto">
      ${UI.pageHeader('Scan Operations', 'Smart QR Workflow')}

      <!-- ── Compact Stepped Workflow ── -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        <!-- Left Column: Settings & Input (7/12) -->
        <div class="lg:col-span-7 space-y-4">
          
          <!-- Compact Mode Selector -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 flex gap-1.5">
            ${[
              { id:'ACTIVATE',         icon:'zap',       short:'Activate',  color:'indigo' },
              { id:'SEND_TO_SITE',     icon:'truck',     short:'Send',      color:'amber'  },
              { id:'SITE_TO_SITE',     icon:'repeat',    short:'Transfer',  color:'blue'   },
              { id:'RETURN_TO_GODOWN', icon:'warehouse',  short:'Return',    color:'emerald'}
            ].map(m => `
            <button id="tab-${m.id}"
              onclick="ScanPage.setMode('${m.id}')"
              class="flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-300 gap-1.5 group border border-transparent">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 group-hover:bg-white transition-all shadow-sm group-hover:shadow border border-slate-100">
                <i data-lucide="${m.icon}" class="w-5 h-5 text-slate-400 group-active:scale-90 transition-transform"></i>
              </div>
              <span class="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 group-hover:text-slate-600 transition-colors">${m.short}</span>
            </button>`).join('')}
          </div>

          <!-- Compact Input Area -->
          <div class="bg-white rounded-2xl shadow-md border border-slate-200 transition-all duration-300">
            <!-- Tighter Header -->
            <div id="mode-header" class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
              <div class="flex items-center gap-4">
                <div id="mode-icon-box" class="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-500">
                  <i id="mode-icon" data-lucide="zap" class="w-5 h-5"></i>
                </div>
                <div>
                  <h2 id="mode-title" class="text-sm font-black text-slate-800 uppercase tracking-tight">Activate Cable</h2>
                  <p id="mode-desc" class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1 opacity-70">Registration</p>
                </div>
              </div>
              <div class="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
                <button id="btn-mode-scan" class="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all" onclick="ScanPage.setInputMode('SCAN')">Scan</button>
                <button id="btn-mode-select" class="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all" onclick="ScanPage.setInputMode('SELECT')">List</button>
              </div>
            </div>

            <div class="p-6 space-y-5">
              <!-- Compact Extra Fields -->
              <div id="extra-fields" class="grid grid-cols-1 sm:grid-cols-2 gap-4 hidden">
                <div id="extra-site" class="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 hidden">
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Destination Site</label>
                    <input type="text" id="f-site-name" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-black text-slate-800 focus:border-indigo-500 focus:bg-white transition-all outline-none placeholder:text-slate-300" placeholder="Enter Site Name" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Person In-Charge</label>
                    <input type="text" id="f-person" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-black text-slate-800 focus:border-indigo-500 focus:bg-white transition-all outline-none placeholder:text-slate-300" placeholder="Enter Person Name" />
                  </div>
                </div>
                <div id="extra-return" class="col-span-2 hidden">
                   <div class="space-y-1.5">
                    <label class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Returned Meter Balance</label>
                    <div class="relative">
                      <input type="number" id="f-meter-bal" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-4 pr-10 py-3 text-sm font-black text-slate-800 focus:border-indigo-500 focus:bg-white transition-all outline-none placeholder:text-slate-300" placeholder="Keep empty to maintain current" />
                      <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">MTRS</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Main Input Row -->
              <div class="relative group">
                <div id="camera-wrap" class="hidden mb-4">
                  <div id="scan-viewport" class="w-full aspect-square max-w-[280px] mx-auto rounded-3xl overflow-hidden bg-black border-4 border-white shadow-2xl relative">
                     <div class="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                        <div class="w-40 h-40 border-2 border-white/40 rounded-2xl relative overflow-hidden">
                           <div class="absolute inset-x-0 h-1 bg-white/90 shadow-[0_0_20px_rgba(255,255,255,1)] animate-scan"></div>
                        </div>
                     </div>
                  </div>
                  <button class="mt-3 w-full py-2.5 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-100 transition-all border border-rose-100" onclick="ScanPage.toggleCamera()">
                    Stop Camera
                  </button>
                </div>

                <div class="flex items-stretch gap-3">
                  <div id="input-container" class="flex-1 relative">
                    <div id="wrap-scan-input" class="relative">
                      <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <i data-lucide="qr-code" class="w-5 h-5 opacity-60"></i>
                      </div>
                      <input type="text" id="scan-input" 
                        class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-indigo-500 transition-all outline-none shadow-sm"
                        placeholder="Scan QR or Type Cable ID..." autocomplete="off" />
                    </div>
                    <div id="wrap-scan-select" class="hidden relative group">
                      <button onclick="ScanPage.toggleMultiSelect()" id="btn-multi-select"
                        class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 focus:bg-white focus:border-indigo-500 transition-all outline-none text-left flex items-center justify-between shadow-sm">
                        <span id="multi-select-label">Select Cables...</span>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
                      </button>
                      
                      <!-- Dropdown Menu -->
                      <div id="multi-select-dropdown" class="hidden absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] overflow-hidden animate-slideUp">
                        <div class="p-3 border-b border-slate-100 bg-slate-50/50">
                          <div class="relative">
                            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"></i>
                            <input type="text" id="multi-search" oninput="ScanPage.renderMultiSelectList(this.value)"
                              class="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[11px] font-black text-slate-700 outline-none focus:border-indigo-500 transition-all"
                              placeholder="Search by ID, NO or Specs..." />
                          </div>
                        </div>
                        <div id="multi-select-list" class="max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                          <!-- Items will be injected here -->
                        </div>
                        <div class="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                           <button onclick="ScanPage.clearMultiSelection()" class="text-[9px] font-black text-rose-500 uppercase px-3 py-1.5 hover:bg-rose-50 rounded-lg transition-all">Clear All</button>
                           <button onclick="ScanPage.toggleMultiSelect()" class="bg-slate-800 text-white text-[9px] font-black uppercase px-4 py-1.5 rounded-lg shadow-sm">Done</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button id="btn-camera" onclick="ScanPage.toggleCamera()" 
                    class="w-14 shrink-0 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm hover:shadow active:scale-95">
                    <i data-lucide="camera" class="w-6 h-6"></i>
                  </button>

                  <button onclick="ScanPage.trigger()" 
                    class="px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] shadow-lg shadow-indigo-200 transition-all active:scale-95 hover:-translate-y-0.5">
                    Process
                  </button>
                </div>
              </div>

              <!-- Result Area -->
              <div id="scan-result" class="hidden animate-fadeIn"></div>
            </div>
          </div>
        </div>

        <!-- Right Column: Recent Activity (5/12) -->
        <div class="lg:col-span-5">
          <div class="bg-white rounded-3xl shadow-lg border border-slate-200 h-full flex flex-col overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center border border-indigo-100 shadow-sm">
                  <i data-lucide="history" class="w-4 h-4"></i>
                </div>
                <h2 class="text-xs font-black text-slate-700 uppercase tracking-tight">Activity Log</h2>
              </div>
              <div class="flex items-center gap-2">
                <span id="session-count" class="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-black text-indigo-600 shadow-sm">0</span>
                <button class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all" onclick="ScanPage.clearSession()">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>
            <div id="session-scans" class="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[350px] lg:max-h-none custom-scrollbar">
              ${UI.emptyState('list', 'No Activity', 'Recent session scans will appear here.')}
            </div>
          </div>
        </div>

      </div>
    </div>

    <style>
      .animate-scan { animation: scanMove 2s infinite ease-in-out; }
      @keyframes scanMove {
        0%, 100% { top: 0; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { top: 100%; opacity: 0; }
      }
      .active-mode-indigo { background: #4338ca; color: white; }
      .active-mode-amber  { background: #d97706; color: white; }
      .active-mode-blue   { background: #2563eb; color: white; }
      .active-mode-emerald { background: #059669; color: white; }
      
      .active-tab-indigo .w-8 { background: #4338ca; color: white; }
      .active-tab-indigo i { color: white !important; }
      .active-tab-indigo span { color: #4338ca !important; }

      .active-tab-amber .w-8 { background: #d97706; color: white; }
      .active-tab-amber i { color: white !important; }
      .active-tab-amber span { color: #d97706 !important; }

      .active-tab-blue .w-8 { background: #2563eb; color: white; }
      .active-tab-blue i { color: white !important; }
      .active-tab-blue span { color: #2563eb !important; }

      .active-tab-emerald .w-8 { background: #059669; color: white; }
      .active-tab-emerald i { color: white !important; }
      .active-tab-emerald span { color: #059669 !important; }
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

    if (!btnScan) return;

    if (mode === 'SCAN') {
      btnScan.className = 'px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-white text-slate-800 shadow-sm border border-slate-200';
      btnSelect.className = 'px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600';
      wrapInput.classList.remove('hidden');
      wrapSelect.classList.add('hidden');
      btnCamera?.classList.remove('hidden');
      document.getElementById('scan-input').focus();
    } else {
      btnScan.className = 'px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600';
      btnSelect.className = 'px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-white text-slate-800 shadow-sm border border-slate-200';
      wrapInput.classList.add('hidden');
      wrapSelect.classList.remove('hidden');
      btnCamera?.classList.add('hidden');
      this.loadEligibleCables();
    }
  },

  async loadEligibleCables() {
    const listEl = document.getElementById('multi-select-list');
    if (!listEl) return;
    
    listEl.innerHTML = '<div class="p-4 text-center text-[10px] font-black text-slate-400 uppercase animate-pulse">Loading cables...</div>';

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
    } catch(e) {
      listEl.innerHTML = '<div class="p-4 text-center text-[10px] font-black text-rose-500 uppercase">Error loading</div>';
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

    const q = query.toLowerCase();
    const filtered = this._allCables.filter(c => 
      c.cableNo.toLowerCase().includes(q) || 
      (c.no && String(c.no).toLowerCase().includes(q)) ||
      c.core.toLowerCase().includes(q) ||
      c.sqmm.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="p-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">No cables found</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(c => {
      const isSelected = this._selectedCables.includes(c.barcode);
      return `
      <div onclick="ScanPage.toggleCableSelection('${c.barcode}')" 
        class="flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer group ${isSelected ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}">
        <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 bg-white'}">
          <i data-lucide="check" class="w-3 h-3 text-white ${isSelected ? '' : 'hidden'}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">${Helpers.escape(c.cableNo)}</span>
            ${c.no ? `<span class="inline-flex items-center px-1 py-0.5 rounded bg-white text-slate-800 font-black text-[8px] border border-slate-100 shadow-xs">${Helpers.escape(c.no)}</span>` : ''}
            <span class="text-[9px] font-black text-indigo-600 opacity-80">(${Helpers.escape(c.core)} / ${Helpers.escape(c.sqmm)}mm² - ${c.meter}m)</span>
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

  setMode(mode) {
    this._mode = mode;

    const modeConfig = {
      ACTIVATE:         { color:'indigo',  icon:'zap',       title:'Activate Cable',    desc:'Initial Godown Registration' },
      SEND_TO_SITE:     { color:'amber',   icon:'truck',     title:'Send to Site',      desc:'Godown ➔ Site Dispatch'      },
      SITE_TO_SITE:     { color:'blue',    icon:'repeat',    title:'Site Transfer',     desc:'Inter-Site Movement'         },
      RETURN_TO_GODOWN: { color:'emerald', icon:'warehouse', title:'Return Godown',     desc:'Site ➔ Godown Retrieval'     },
    };

    const mc = modeConfig[mode];

    // Update tab buttons
    ['ACTIVATE','SEND_TO_SITE','SITE_TO_SITE','RETURN_TO_GODOWN'].forEach(m => {
      const btn = document.getElementById(`tab-${m}`);
      if (!btn) return;
      const isActive = m === mode;
      const btnColor = modeConfig[m].color;
      btn.className = `flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-300 gap-1 group ${isActive ? 'active-tab-' + btnColor : ''}`;
    });

    // Update Mode Header
    const iconBox = document.getElementById('mode-icon-box');
    const iconEl  = document.getElementById('mode-icon');
    const titleEl = document.getElementById('mode-title');
    const descEl  = document.getElementById('mode-desc');

    if (iconBox) iconBox.className = `w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md active-mode-${mc.color}`;
    if (iconEl)  iconEl.setAttribute('data-lucide', mc.icon);
    if (titleEl) titleEl.textContent = mc.title;
    if (descEl)  descEl.textContent = mc.desc;

    // Show/hide extra fields section
    const extraFields = document.getElementById('extra-fields');
    const siteEl      = document.getElementById('extra-site');
    const returnEl    = document.getElementById('extra-return');

    const hasExtra = mode !== 'ACTIVATE';
    if (extraFields) extraFields.classList.toggle('hidden', !hasExtra);
    if (siteEl)      siteEl.classList.toggle('hidden', mode !== 'SEND_TO_SITE' && mode !== 'SITE_TO_SITE');
    if (returnEl)    returnEl.classList.toggle('hidden', mode !== 'RETURN_TO_GODOWN');

    // Clear result
    const res = document.getElementById('scan-result');
    if (res) { res.classList.add('hidden'); res.innerHTML = ''; }

    if (this._inputMode === 'SELECT') this.loadEligibleCables();
    if (this._inputMode === 'SCAN') setTimeout(() => document.getElementById('scan-input')?.focus(), 100);
    
    if (window.lucide) lucide.createIcons();
  },

  async toggleCamera() {
    const wrap = document.getElementById('camera-wrap');
    const btn  = document.getElementById('btn-camera');
    if (Barcode.isCameraActive()) {
      Barcode.stopCamera();
      wrap.classList.add('hidden');
      btn.innerHTML = '<i data-lucide="camera" class="w-5 h-5"></i>';
    } else {
      wrap.classList.remove('hidden');
      btn.innerHTML = '<i data-lucide="camera-off" class="w-5 h-5"></i>';
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
      extra.siteName       = (document.getElementById('f-site-name')?.value || '').trim();
      extra.personAssigned = (document.getElementById('f-person')?.value    || '').trim();
      extra.note           = (document.getElementById('f-scan-remark')?.value || '').trim();
      if (!extra.siteName)       { Toast.show('warning','Required','Enter Site Name first.'); return; }
      if (!extra.personAssigned) { Toast.show('warning','Required','Enter Person Assigned first.'); return; }
    }
    if (this._mode === 'RETURN_TO_GODOWN') {
      const mb = document.getElementById('f-meter-bal')?.value;
      if (mb) extra.meterBalance = parseFloat(mb);
      extra.note = (document.getElementById('f-return-remark')?.value || '').trim();
    }

    const resultDiv = document.getElementById('scan-result');
    resultDiv.innerHTML = `
      <div class="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
        <div class="loading loading-spinner loading-lg text-indigo-600"></div>
        <div>
          <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight">Bulk Processing</h3>
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Applying changes to ${barcodes.length} items...</p>
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
      } catch(err) {
        failMessages.push(`${barcode}: ${err.message}`);
        this._addSessionScan(barcode, false, barcode);
      }
    }

    if (successCount === 0) {
      resultDiv.innerHTML = `
        <div class="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center animate-fadeIn">
          <div class="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
             <i data-lucide="alert-circle" class="w-6 h-6"></i>
          </div>
          <h3 class="text-xs font-black text-rose-800 uppercase tracking-tight">Operation Failed</h3>
          <p class="text-[10px] text-rose-600 font-bold mt-1 uppercase tracking-widest">All ${barcodes.length} items failed to process.</p>
          <div class="mt-4 p-3 bg-white rounded-xl border border-rose-100 text-left space-y-1">
             ${failMessages.slice(0,3).map(m => `<p class="text-[9px] font-bold text-slate-500 truncate">• ${Helpers.escape(m)}</p>`).join('')}
             ${failMessages.length > 3 ? `<p class="text-[8px] text-slate-400 italic mt-1">+ ${failMessages.length - 3} more errors</p>` : ''}
          </div>
          <button class="w-full mt-4 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest" onclick="ScanPage.resumeScanning()">Try Again</button>
        </div>`;
    } else {
      const modeLabel = this._mode.replace(/_/g,' ');
      const p = lastProduct;
      resultDiv.innerHTML = `
        <div class="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 animate-fadeIn shadow-lg">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg">
              <i data-lucide="check-circle-2" class="w-8 h-8"></i>
            </div>
            <div class="text-left">
              <h3 class="text-lg font-black text-emerald-900 uppercase tracking-tight leading-none">${successCount > 1 ? 'Bulk Success' : 'Accepted'}</h3>
              <p class="text-[11px] text-emerald-600 font-black uppercase tracking-[0.2em] mt-1">${successCount} items ${modeLabel}d</p>
            </div>
          </div>

          ${successCount === 1 && p ? `
          <div class="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-4">
             <div class="flex items-center gap-2 flex-wrap pb-3 border-b border-slate-50">
                <span class="text-[16px] font-black text-slate-900 uppercase tracking-tighter">${Helpers.escape(p.cableNo)}</span>
                ${p.no ? `<span class="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-50 text-slate-900 font-black text-[12px] border border-slate-200">${Helpers.escape(p.no)}</span>` : ''}
                <span class="text-[14px] font-black text-indigo-600 bg-indigo-50/50 px-2.5 py-1 rounded-xl border border-indigo-100/50">
                  (${Helpers.escape(p.core)} / ${Helpers.escape(p.sqmm)}mm² - ${p.meter}m)
                </span>
             </div>
             <div class="grid grid-cols-2 gap-4">
                <div>
                   <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">New Status</span>
                   ${Helpers.statusBadge(p.status)}
                </div>
                ${p.siteName ? `
                <div>
                   <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Location</span>
                   <span class="text-xs font-black text-amber-700 uppercase truncate block">${Helpers.escape(p.siteName)}</span>
                </div>` : ''}
             </div>
          </div>` : `
          <div class="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm text-center">
             <div class="flex items-center justify-center gap-2 mb-2">
                <span class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest">${successCount} Successful</span>
                ${failMessages.length > 0 ? `<span class="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-widest">${failMessages.length} Failed</span>` : ''}
             </div>
             <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Check activity log for specific details</p>
          </div>`}

          <button class="w-full mt-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-100 active:scale-95" onclick="ScanPage.resumeScanning()">
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
    const ct = document.getElementById('session-count');
    if (ct) ct.textContent = this._sessionScans.length;
    this._renderSessionList();
  },

  _renderSessionList() {
    const el = document.getElementById('session-scans');
    if (!el) return;
    if (!this._sessionScans.length) {
      el.innerHTML = UI.emptyState('list', 'Ready to Scan', 'Your activity for this session will appear here.');
      if (window.lucide) lucide.createIcons({ nodes: [el] });
      return;
    }
    el.innerHTML = this._sessionScans.slice(0, 20).map(s => {
      const modeLabel = s.mode.replace(/_/g,' ');
      const bg = s.ok ? 'bg-emerald-50' : 'bg-red-50';
      const text = s.ok ? 'text-emerald-700' : 'text-red-700';
      const icon = s.ok ? 'check' : 'x';
      const iconBg = s.ok ? 'bg-emerald-500' : 'bg-red-500';

      const p = s.product;
      return `
      <div class="flex items-center gap-3 p-3 rounded-2xl ${bg} border border-white transition-all animate-fadeIn shadow-sm">
        <div class="w-8 h-8 rounded-xl ${iconBg} text-white flex items-center justify-center shrink-0 shadow-md">
          <i data-lucide="${icon}" class="w-4 h-4"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-1">
            <div class="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
               <span class="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">${Helpers.escape(s.label)}</span>
               ${p && p.no ? `<span class="inline-flex items-center px-1 py-0.5 rounded bg-white text-slate-800 font-black text-[8px] border border-slate-100 shadow-xs">${Helpers.escape(p.no)}</span>` : ''}
               ${p ? `
               <span class="text-[9px] font-black text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded-md border border-indigo-100/30">
                 (${Helpers.escape(p.core)} / ${Helpers.escape(p.sqmm)}mm² - ${p.meter}m)
               </span>` : ''}
            </div>
            <div class="text-[9px] font-black uppercase ${text} shrink-0 opacity-80">${s.ok ? 'SUCCESS' : 'FAILED'}</div>
          </div>

          <div class="text-[8px] font-black uppercase tracking-widest text-slate-400 opacity-70">${modeLabel} · ${Helpers.timeAgo(s.time)}</div>
        </div>
      </div>`;
    }).join('');
    if (window.lucide) lucide.createIcons({ nodes: [el] });
  },

  clearSession() {
    this._sessionScans = [];
    const ct = document.getElementById('session-count');
    if (ct) ct.textContent = '0';
    this._renderSessionList();
  },
};
