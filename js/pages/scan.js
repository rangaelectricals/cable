/**
 * Scan Operations page — mobile-first, Lucide icons
 * Workflow: ACTIVATE → IN_GODOWN | SEND_TO_SITE: IN_GODOWN→SENT_TO_SITE | RETURN_TO_GODOWN: SENT_TO_SITE→IN_GODOWN
 */
const ScanPage = {
  _mode: 'ACTIVATE',
  _inputMode: 'SCAN',
  _sessionScans: [],
  _selectedCables: [], // For bulk selection
  _allCables: [],      // Cache for multi-select   async render(container) {
    if (!Auth.canScan()) {
      container.innerHTML = UI.emptyState('lock', 'Access Denied', 'Admin role required to perform scanning.');
      if (window.lucide) lucide.createIcons({ nodes: [container] });
      return;
    }

    container.innerHTML = `
    <div class="max-w-7xl mx-auto space-y-6 page-enter pb-24 lg:pb-8">
      
      <!-- ── Top Action Hub ── -->
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-1">
        <div>
           <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-2xl shadow-slate-200">
                 <i data-lucide="command" class="w-5 h-5"></i>
              </div>
              <h1 class="text-3xl font-black text-slate-900 tracking-tight">Scan Center</h1>
           </div>
           <p class="text-xs font-black text-slate-400 uppercase tracking-[0.25em] ml-13">Logistics Command & Control</p>
        </div>

        <!-- Desktop Mode Switcher -->
        <div class="hidden lg:flex bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 p-1.5 gap-1.5">
          ${[
            { id:'ACTIVATE',         icon:'zap',       short:'Activate',  color:'indigo' },
            { id:'SEND_TO_SITE',     icon:'truck',     short:'Send',      color:'amber'  },
            { id:'SITE_TO_SITE',     icon:'repeat',    short:'Transfer',  color:'blue'   },
            { id:'RETURN_TO_GODOWN', icon:'warehouse',  short:'Return',    color:'emerald'}
          ].map(m => `
          <button id="tab-${m.id}" onclick="ScanPage.setMode('${m.id}')"
            class="px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-3 group hover:bg-slate-50">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-white shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
              <i data-lucide="${m.icon}" class="w-4 h-4 text-slate-400 group-active:scale-90 transition-transform"></i>
            </div>
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600">${m.short}</span>
          </button>`).join('')}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Center Action Card (8/12) -->
        <div class="lg:col-span-8 space-y-6">
          
          <div class="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-visible relative group transition-all duration-500">
            
            <!-- Contextual Header -->
            <div id="mode-header" class="px-8 py-8 border-b border-slate-50 flex items-center justify-between">
              <div class="flex items-center gap-5">
                <div id="mode-icon-box" class="w-14 h-14 rounded-3xl flex items-center justify-center text-white shadow-xl transform group-hover:rotate-6 transition-all duration-500">
                  <i id="mode-icon" data-lucide="zap" class="w-6 h-6"></i>
                </div>
                <div>
                  <h2 id="mode-title" class="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-2">Activate Cable</h2>
                  <div class="flex items-center gap-2">
                     <span id="mode-desc" class="text-[10px] text-slate-400 font-black uppercase tracking-widest opacity-80">Initialization Phase</span>
                     <span class="w-1 h-1 rounded-full bg-slate-200"></span>
                     <span class="text-[10px] text-indigo-600 font-black uppercase tracking-widest">Live System</span>
                  </div>
                </div>
              </div>

              <!-- Input Mode Toggle -->
              <div class="bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 flex gap-1 shadow-inner">
                <button id="btn-mode-scan" onclick="ScanPage.setInputMode('SCAN')"
                  class="flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  <i data-lucide="qr-code" class="w-3.5 h-3.5"></i> Scan
                </button>
                <button id="btn-mode-select" onclick="ScanPage.setInputMode('SELECT')"
                  class="flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  <i data-lucide="list" class="w-3.5 h-3.5"></i> List
                </button>
              </div>
            </div>

            <div class="p-8 lg:p-12 space-y-8">
              
              <!-- Smart Fields Grid -->
              <div id="extra-fields" class="hidden animate-slideDown">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100/50 mb-8">
                   <div id="extra-site" class="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 hidden">
                      <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Destination Site</label>
                        <div class="relative group">
                           <i data-lucide="map-pin" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-amber-500 transition-colors"></i>
                           <input type="text" id="f-site-name" class="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-slate-800 focus:border-amber-500 focus:shadow-lg focus:shadow-amber-50 transition-all outline-none" placeholder="Target Location..." />
                        </div>
                      </div>
                      <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Person In-Charge</label>
                        <div class="relative group">
                           <i data-lucide="user" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-amber-500 transition-colors"></i>
                           <input type="text" id="f-person" class="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-slate-800 focus:border-amber-500 focus:shadow-lg focus:shadow-amber-50 transition-all outline-none" placeholder="Assignee Name..." />
                        </div>
                      </div>
                   </div>
                   <div id="extra-return" class="col-span-2 hidden animate-slideDown">
                      <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Returned Meter Balance</label>
                        <div class="relative group">
                          <i data-lucide="ruler" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-emerald-500 transition-colors"></i>
                          <input type="number" id="f-meter-bal" class="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-14 py-4 text-sm font-black text-slate-800 focus:border-emerald-500 focus:shadow-lg focus:shadow-emerald-50 transition-all outline-none" placeholder="Calculated Balance..." />
                          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">MTRS</span>
                        </div>
                      </div>
                   </div>
                </div>
              </div>

              <!-- Main Interactive Zone -->
              <div class="relative">
                
                <!-- Camera Viewport (Centered for Focus) -->
                <div id="camera-wrap" class="hidden mb-12 animate-fadeIn">
                   <div class="max-w-md mx-auto relative group">
                      <div id="scan-viewport" class="w-full aspect-square rounded-[3rem] overflow-hidden bg-slate-900 border-8 border-white shadow-2xl relative">
                         <div class="absolute inset-0 z-10 pointer-events-none border-[1.5px] border-white/20 rounded-[2.5rem]"></div>
                         <div class="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                            <div class="w-48 h-48 border-2 border-white/30 rounded-3xl relative">
                               <div class="absolute inset-x-0 h-1 bg-white/80 shadow-[0_0_30px_#fff] animate-scan-slow"></div>
                            </div>
                         </div>
                      </div>
                      <button onclick="ScanPage.toggleCamera()" class="absolute -bottom-6 left-1/2 -translate-x-1/2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                        Stop Camera
                      </button>
                   </div>
                </div>

                <div class="flex flex-col md:flex-row items-stretch gap-4">
                  <div class="flex-1 relative">
                    <div id="wrap-scan-input" class="relative group">
                      <div class="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                        <i data-lucide="search" class="w-6 h-6"></i>
                      </div>
                      <input type="text" id="scan-input" 
                        class="w-full bg-slate-50 border-4 border-transparent rounded-[2rem] pl-16 pr-6 py-6 text-lg font-black text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-indigo-100 transition-all outline-none shadow-inner"
                        placeholder="Scan or Enter Cable ID..." autocomplete="off" />
                    </div>

                    <div id="wrap-scan-select" class="hidden relative z-[60]">
                      <button onclick="ScanPage.toggleMultiSelect()" id="btn-multi-select"
                        class="w-full bg-slate-50 border-4 border-transparent rounded-[2rem] px-8 py-6 text-lg font-black text-slate-900 focus:bg-white focus:border-indigo-100 transition-all outline-none text-left flex items-center justify-between shadow-inner">
                        <span id="multi-select-label">Select Cables...</span>
                        <div class="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center">
                           <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
                        </div>
                      </button>
                      
                      <!-- Enhanced Dropdown -->
                      <div id="multi-select-dropdown" class="hidden absolute left-0 right-0 top-full mt-4 bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-[100] overflow-hidden animate-slideUp">
                        <div class="p-6 border-b border-slate-50 bg-slate-50/30">
                          <div class="relative group">
                            <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300"></i>
                            <input type="text" id="multi-search" oninput="ScanPage.renderMultiSelectList(this.value)"
                              class="w-full bg-white border-2 border-slate-100 rounded-2xl pl-11 pr-4 py-3 text-xs font-black text-slate-700 outline-none focus:border-indigo-500 transition-all"
                              placeholder="Find by ID, NO or Specs..." />
                          </div>
                        </div>
                        <div id="multi-select-list" class="max-h-[350px] overflow-y-auto p-4 space-y-2 custom-scrollbar"></div>
                        <div class="p-6 border-t border-slate-50 bg-white flex items-center justify-between">
                           <button onclick="ScanPage.clearMultiSelection()" class="text-[10px] font-black text-rose-500 uppercase tracking-widest px-6 py-3 hover:bg-rose-50 rounded-xl transition-all">Clear Selection</button>
                           <button onclick="ScanPage.toggleMultiSelect()" class="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-xl shadow-lg active:scale-95 transition-all">Confirm</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex items-stretch gap-4">
                    <button id="btn-camera" onclick="ScanPage.toggleCamera()" 
                      class="w-20 shrink-0 bg-white border-2 border-slate-100 rounded-[1.8rem] flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all shadow-sm active:scale-90">
                      <i data-lucide="camera" class="w-8 h-8"></i>
                    </button>

                    <button onclick="ScanPage.trigger()" 
                      class="px-10 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.8rem] font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl shadow-slate-200 transition-all active:scale-95 hover:-translate-y-1">
                      EXECUTE
                    </button>
                  </div>
                </div>
              </div>

              <!-- Result Container -->
              <div id="scan-result" class="hidden animate-slideUp"></div>
            </div>
          </div>
        </div>

        <!-- Activity Stream Column (4/12) -->
        <div class="lg:col-span-4 h-full">
           <div class="bg-slate-900 rounded-[2.5rem] shadow-2xl h-[600px] lg:h-full flex flex-col overflow-hidden border border-slate-800 sticky top-6">
              <div class="px-8 py-8 border-b border-slate-800 flex items-center justify-between">
                 <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
                       <i data-lucide="activity" class="w-5 h-5"></i>
                    </div>
                    <div>
                       <h2 class="text-sm font-black text-white uppercase tracking-widest">Activity Feed</h2>
                       <div class="flex items-center gap-2 mt-1">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <p class="text-[9px] text-slate-500 font-black uppercase tracking-widest">Live Updates</p>
                       </div>
                    </div>
                 </div>
                 <div class="flex items-center gap-3">
                    <div id="session-count" class="text-[12px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">0</div>
                    <button onclick="ScanPage.clearSession()" class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition-all">
                       <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                 </div>
              </div>
              
              <div id="session-scans" class="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar-dark bg-slate-900/50">
                ${UI.emptyState('terminal', 'Feed Idle', 'Operational history will manifest here.')}
              </div>

              <div class="p-6 bg-slate-800/30 border-t border-slate-800">
                 <p class="text-[8px] text-center text-slate-500 font-black uppercase tracking-[0.3em]">CABLETRACK PRO LOGISTICS v2.0</p>
              </div>
           </div>
        </div>

      </div>
    </div>

    <!-- Mobile Bottom Navigation -->
    <div class="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-t border-slate-100 px-4 py-3 flex items-center justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      ${[
        { id:'ACTIVATE',         icon:'zap',       short:'Init' },
        { id:'SEND_TO_SITE',     icon:'truck',     short:'Send' },
        { id:'SITE_TO_SITE',     icon:'repeat',    short:'Move' },
        { id:'RETURN_TO_GODOWN', icon:'warehouse',  short:'Home' }
      ].map(m => `
      <button id="mob-tab-${m.id}" onclick="ScanPage.setMode('${m.id}')"
        class="flex flex-col items-center gap-1 group">
        <div class="w-10 h-10 rounded-2xl flex items-center justify-center group-active:scale-90 transition-all">
           <i data-lucide="${m.icon}" class="w-5 h-5 text-slate-400"></i>
        </div>
        <span class="text-[8px] font-black uppercase tracking-widest text-slate-400">${m.short}</span>
      </button>`).join('')}
    </div>

    <style>
      .animate-scan-slow { animation: scanMoveSlow 3s infinite ease-in-out; }
      @keyframes scanMoveSlow {
        0%, 100% { top: 10%; opacity: 0; }
        20%, 80% { opacity: 1; }
        100% { top: 90%; opacity: 0; }
      }
      
      .active-mode-indigo { background: linear-gradient(135deg, #6366f1, #4338ca); }
      .active-mode-amber  { background: linear-gradient(135deg, #f59e0b, #d97706); }
      .active-mode-blue   { background: linear-gradient(135deg, #3b82f6, #2563eb); }
      .active-mode-emerald { background: linear-gradient(135deg, #10b981, #059669); }
      
      .active-tab-indigo { background: #6366f1 !important; }
      .active-tab-indigo i, .active-tab-indigo span { color: white !important; }
      
      .active-tab-amber { background: #f59e0b !important; }
      .active-tab-amber i, .active-tab-amber span { color: white !important; }

      .active-tab-blue { background: #3b82f6 !important; }
      .active-tab-blue i, .active-tab-blue span { color: white !important; }

      .active-tab-emerald { background: #10b981 !important; }
      .active-tab-emerald i, .active-tab-emerald span { color: white !important; }

      /* Mobile Active States */
      .mob-active-indigo i { color: #6366f1 !important; }
      .mob-active-indigo span { color: #6366f1 !important; }
      .mob-active-amber i { color: #f59e0b !important; }
      .mob-active-amber span { color: #f59e0b !important; }
      .mob-active-blue i { color: #3b82f6 !important; }
      .mob-active-blue span { color: #3b82f6 !important; }
      .mob-active-emerald i { color: #10b981 !important; }
      .mob-active-emerald span { color: #10b981 !important; }

      .custom-scrollbar-dark::-webkit-scrollbar { width: 4px; }
      .custom-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
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

    const base = 'flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all';
    const active = 'bg-white text-slate-800 shadow-sm border border-slate-200';
    const inactive = 'text-slate-400 hover:text-slate-600';

    if (mode === 'SCAN') {
      btnScan.className = `${base} ${active}`;
      btnSelect.className = `${base} ${inactive}`;
      wrapInput.classList.remove('hidden');
      wrapSelect.classList.add('hidden');
      btnCamera?.classList.remove('hidden');
      document.getElementById('scan-input').focus();
    } else {
      btnScan.className = `${base} ${inactive}`;
      btnSelect.className = `${base} ${active}`;
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

    const q = query.toLowerCase().trim();
    const filtered = this._allCables.filter(c => 
      (c.cableNo || '').toLowerCase().includes(q) || 
      (c.no && String(c.no).toLowerCase().includes(q)) ||
      (c.core && String(c.core).toLowerCase().includes(q)) ||
      (c.sqmm && String(c.sqmm).toLowerCase().includes(q)) ||
      (c.meter && String(c.meter).toLowerCase().includes(q))
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
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="text-[14px] font-black text-slate-900 uppercase tracking-tighter truncate">${Helpers.escape(c.cableNo)}</span>
            ${c.no ? `<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-white text-slate-800 font-black text-[10px] border border-slate-200 shadow-sm min-w-[24px] justify-center">${Helpers.escape(c.no)}</span>` : ''}
            <span class="text-[12px] font-black text-indigo-600 bg-indigo-50/50 px-2.5 py-1 rounded-xl border border-indigo-100/30">
              (${Helpers.escape(c.core)} / ${Helpers.escape(c.sqmm)}mm² - ${c.meter}m)
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

    const config = {
      ACTIVATE:         { title: 'Activate Cable',  desc: 'INITIALIZATION PHASE', icon: 'zap',       color: 'indigo' },
      SEND_TO_SITE:     { title: 'Dispatch to Site', desc: 'LOGISTICS OUTBOUND',   icon: 'truck',     color: 'amber'  },
      SITE_TO_SITE:     { title: 'Site Transfer',   desc: 'INTER-SITE MOVEMENT', icon: 'repeat',    color: 'blue'   },
      RETURN_TO_GODOWN: { title: 'Return to Godown', desc: 'LOGISTICS INBOUND',    icon: 'warehouse',  color: 'emerald'}
    };

    const c = config[mode];
    if (title) title.textContent = c.title;
    if (desc)  desc.textContent = c.desc;
    if (icon)  icon.setAttribute('data-lucide', c.icon);
    
    // Update Mode Colors
    if (iconBox) {
      iconBox.className = `w-14 h-14 rounded-3xl flex items-center justify-center text-white shadow-xl transform group-hover:rotate-6 transition-all duration-500 active-mode-${c.color}`;
    }

    // Update Field Visibility
    const extraFields = document.getElementById('extra-fields');
    const extraSite   = document.getElementById('extra-site');
    const extraReturn = document.getElementById('extra-return');

    if (extraFields) {
      extraFields.classList.toggle('hidden', mode === 'ACTIVATE');
      if (extraSite)   extraSite.classList.toggle('hidden', mode !== 'SEND_TO_SITE' && mode !== 'SITE_TO_SITE');
      if (extraReturn) extraReturn.classList.toggle('hidden', mode !== 'RETURN_TO_GODOWN');
    }

    // Update Navigation States (Desktop & Mobile)
    ['ACTIVATE','SEND_TO_SITE','SITE_TO_SITE','RETURN_TO_GODOWN'].forEach(m => {
      const btn = document.getElementById(`tab-${m}`);
      if (btn) {
        if (m === mode) btn.classList.add(`active-tab-${config[m].color}`);
        else btn.classList.remove(`active-tab-${config[m].color}`);
      }
      
      const mobBtn = document.getElementById(`mob-tab-${m}`);
      if (mobBtn) {
        if (m === mode) mobBtn.classList.add(`mob-active-${config[m].color}`);
        else mobBtn.classList.remove(`mob-active-${config[m].color}`);
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
