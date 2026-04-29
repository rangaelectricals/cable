/**
 * Scan Operations page — mobile-first, Lucide icons
 * Workflow: ACTIVATE → IN_GODOWN | SEND_TO_SITE: IN_GODOWN→SENT_TO_SITE | RETURN_TO_GODOWN: SENT_TO_SITE→IN_GODOWN
 */
const ScanPage = {
  _mode: 'ACTIVATE',
  _inputMode: 'SCAN',
  _sessionScans: [],

  async render(container) {
    if (!Auth.canScan()) {
      container.innerHTML = UI.emptyState('lock', 'Access Denied', 'Admin role required to perform scanning.');
      if (window.lucide) lucide.createIcons({ nodes: [container] });
      return;
    }

    container.innerHTML = `
    <div class="space-y-4 page-enter pb-16 lg:pb-0 max-w-6xl mx-auto">
      ${UI.pageHeader('Scan Operations', 'Efficient QR workflow')}

      <!-- ── Compact Stepped Workflow ── -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        <!-- Left Column: Settings & Input (7/12) -->
        <div class="lg:col-span-7 space-y-4">
          
          <!-- Compact Mode Selector -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 flex gap-1">
            ${[
              { id:'ACTIVATE',         icon:'zap',      short:'Activate',  color:'indigo' },
              { id:'SEND_TO_SITE',     icon:'truck',    short:'Send',      color:'amber'  },
              { id:'SITE_TO_SITE',     icon:'repeat',   short:'Transfer',  color:'blue'   },
              { id:'RETURN_TO_GODOWN', icon:'warehouse', short:'Return',    color:'emerald'}
            ].map(m => `
            <button id="tab-${m.id}"
              onclick="ScanPage.setMode('${m.id}')"
              class="flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-300 gap-1 group">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 group-hover:bg-white transition-colors border border-transparent">
                <i data-lucide="${m.icon}" class="w-4 h-4 text-slate-400 group-active:scale-90 transition-transform"></i>
              </div>
              <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600">${m.short}</span>
            </button>`).join('')}
          </div>

          <!-- Compact Input Area -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <!-- Tighter Header -->
            <div id="mode-header" class="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div class="flex items-center gap-3">
                <div id="mode-icon-box" class="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md">
                  <i id="mode-icon" data-lucide="zap" class="w-4 h-4"></i>
                </div>
                <div>
                  <h2 id="mode-title" class="text-xs font-black text-slate-800 uppercase tracking-tight">Activate Cable</h2>
                  <p id="mode-desc" class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Registration</p>
                </div>
              </div>
              <div class="flex bg-slate-100 p-0.5 rounded-lg">
                <button id="btn-mode-scan" class="px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all" onclick="ScanPage.setInputMode('SCAN')">Scan</button>
                <button id="btn-mode-select" class="px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all" onclick="ScanPage.setInputMode('SELECT')">List</button>
              </div>
            </div>

            <div class="p-4 space-y-4">
              <!-- Compact Extra Fields -->
              <div id="extra-fields" class="grid grid-cols-1 sm:grid-cols-2 gap-3 hidden">
                <div id="extra-site" class="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 hidden">
                  <div class="space-y-1">
                    <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Site Name</label>
                    <input type="text" id="f-site-name" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white transition-all outline-none" placeholder="e.g. Site Alpha" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Person Assigned</label>
                    <input type="text" id="f-person" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white transition-all outline-none" placeholder="e.g. Ravi Kumar" />
                  </div>
                </div>
                <div id="extra-return" class="col-span-2 hidden">
                   <div class="space-y-1">
                    <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Meter Balance</label>
                    <input type="number" id="f-meter-bal" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white transition-all outline-none" placeholder="Keep current if empty" />
                  </div>
                </div>
              </div>

              <!-- Main Input Row -->
              <div class="relative group">
                <div id="camera-wrap" class="hidden mb-4">
                  <div id="scan-viewport" class="w-full aspect-video rounded-2xl overflow-hidden bg-black border-2 border-slate-100 shadow-inner relative max-w-md mx-auto">
                     <div class="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                        <div class="w-48 h-24 border border-white/30 rounded-xl relative overflow-hidden">
                           <div class="absolute inset-x-0 h-0.5 bg-white/70 shadow-[0_0_10px_rgba(255,255,255,1)] animate-scan"></div>
                        </div>
                     </div>
                  </div>
                  <button class="mt-2 w-full py-2 bg-slate-50 rounded-xl text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors" onclick="ScanPage.toggleCamera()">
                    Stop Camera
                  </button>
                </div>

                <div class="flex items-stretch gap-2">
                  <div id="input-container" class="flex-1 relative">
                    <div id="wrap-scan-input" class="relative">
                      <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <i data-lucide="hash" class="w-4 h-4"></i>
                      </div>
                      <input type="text" id="scan-input" 
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                        placeholder="QR or Cable No..." autocomplete="off" />
                    </div>
                    <select id="scan-select" class="hidden w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:border-indigo-500 transition-all outline-none appearance-none">
                      <option value="">Select a cable...</option>
                    </select>
                  </div>
                  
                  <button id="btn-camera" onclick="ScanPage.toggleCamera()" 
                    class="w-11 shrink-0 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all">
                    <i data-lucide="camera" class="w-5 h-5"></i>
                  </button>

                  <button onclick="ScanPage.trigger()" 
                    class="px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-md transition-all active:scale-95">
                    Run
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
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
               <div class="flex items-center gap-2">
                <i data-lucide="history" class="w-4 h-4 text-slate-400"></i>
                <h2 class="text-[11px] font-black text-slate-700 uppercase tracking-tight">Activity Log</h2>
              </div>
              <div class="flex items-center gap-2">
                <span id="session-count" class="px-1.5 py-0.5 rounded-md bg-slate-100 text-[9px] font-black text-slate-500">0</span>
                <button class="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-red-500 transition-all" onclick="ScanPage.clearSession()">
                  <i data-lucide="trash-2" class="w-3 h-3"></i>
                </button>
              </div>
            </div>
            <div id="session-scans" class="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[300px] lg:max-h-none">
              ${UI.emptyState('list', 'No Activity', 'Scans will appear here.')}
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
    const select = document.getElementById('scan-select');
    const btnCamera = document.getElementById('btn-camera');

    if (!btnScan) return;

    if (mode === 'SCAN') {
      btnScan.className = 'px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-white text-slate-800 shadow-sm border border-slate-200';
      btnSelect.className = 'px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600';
      wrapInput.classList.remove('hidden');
      select.classList.add('hidden');
      btnCamera?.classList.remove('hidden');
      document.getElementById('scan-input').focus();
    } else {
      btnScan.className = 'px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600';
      btnSelect.className = 'px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-white text-slate-800 shadow-sm border border-slate-200';
      wrapInput.classList.add('hidden');
      select.classList.remove('hidden');
      btnCamera?.classList.add('hidden');

      await this.loadEligibleCables();
    }
  },

  async loadEligibleCables() {
    const select = document.getElementById('scan-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Loading cables...</option>';
    select.disabled = true;

    try {
      let statusFilter = '';
      if (this._mode === 'SEND_TO_SITE') statusFilter = 'IN_GODOWN';
      else if (this._mode === 'SITE_TO_SITE' || this._mode === 'RETURN_TO_GODOWN') statusFilter = 'SENT_TO_SITE';
      
      const res = await API.getProducts({ pageSize: 2000, status: statusFilter });
      let cables = res.data || [];
      
      if (this._mode === 'ACTIVATE') {
        cables = cables.filter(c => String(c.activated) !== 'true' && c.activated !== true);
      } else if (this._mode === 'SEND_TO_SITE') {
        cables = cables.filter(c => String(c.activated) === 'true' || c.activated === true);
      }

      if (cables.length === 0) {
        select.innerHTML = '<option value="">No eligible cables found</option>';
      } else {
        select.innerHTML = '<option value="">-- Select Cable --</option>' + 
          cables.map(c => `<option value="${Helpers.escape(c.cableNo)}">${Helpers.escape(c.cableNo)} (${Helpers.escape(c.core)}/${Helpers.escape(c.sqmm)}mm² - ${c.meter}m)</option>`).join('');
        select.disabled = false;
      }
    } catch(e) {
      select.innerHTML = '<option value="">Error loading</option>';
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
    let barcode = '';
    if (this._inputMode === 'SCAN') {
      barcode = (document.getElementById('scan-input')?.value || '').trim();
    } else {
      barcode = (document.getElementById('scan-select')?.value || '').trim();
    }

    if (!barcode) { 
      Toast.show('warning', 'Empty Input', this._inputMode === 'SCAN' ? 'Please enter or scan a QR code.' : 'Please select a cable.'); 
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
      <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center gap-3 text-center">
        <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
          <span class="loading loading-spinner loading-md text-indigo-600"></span>
        </div>
        <div>
          <h3 class="text-[11px] font-black text-slate-800 uppercase tracking-tight">Processing</h3>
          <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Validating...</p>
        </div>
      </div>`;
    resultDiv.classList.remove('hidden');

    try {
      const res = await API.scanAction(this._mode, barcode, extra);

      if (res.success) {
        const p = res.data;
        const modeLabel = this._mode.replace(/_/g,' ');
        resultDiv.innerHTML = `
          <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 animate-fadeIn">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                <i data-lucide="check" class="w-5 h-5"></i>
              </div>
              <div class="text-left">
                <h3 class="text-xs font-black text-emerald-900 uppercase tracking-tight leading-tight">Accepted</h3>
                <p class="text-[9px] text-emerald-600 font-black uppercase tracking-widest">${modeLabel}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 bg-white rounded-xl p-3 shadow-sm border border-emerald-100/50">
              <div class="text-left">
                <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Cable No</span>
                <span class="text-xs font-black text-slate-800">${Helpers.escape(p.cableNo)}</span>
              </div>
              <div class="text-left">
                <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Status</span>
                <span class="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-[9px] font-black text-slate-600 uppercase tracking-tight">${p.status}</span>
              </div>
              <div class="text-left">
                <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Category</span>
                <span class="text-[10px] font-bold text-slate-600">${Helpers.escape(p.category)}</span>
              </div>
              <div class="text-left">
                <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Length</span>
                <span class="text-[10px] font-black text-indigo-600">${p.meter}m</span>
              </div>
              ${p.siteName ? `
              <div class="text-left col-span-2 border-t border-slate-50 pt-1.5">
                <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Site</span>
                <span class="text-[10px] font-black text-amber-600">${Helpers.escape(p.siteName)}</span>
              </div>` : ''}
            </div>

            ${Barcode.isCameraActive() ? `
            <button class="w-full mt-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md" onclick="ScanPage.resumeScanning()">
              Next Scan
            </button>` : ''}
          </div>`;
        
        Toast.show('success', 'Scan Accepted', `${p.cableNo} — ${modeLabel}`);
        this._addSessionScan(barcode, true, p.cableNo);
        
        if (this._inputMode === 'SCAN') document.getElementById('scan-input').value = '';
        else document.getElementById('scan-select').value = '';
        
        if (this._mode === 'RETURN_TO_GODOWN') {
          document.getElementById('f-meter-bal').value     = '';
        }
        if (this._inputMode === 'SCAN') document.getElementById('scan-input').focus();
        else this.loadEligibleCables();
      } else {
        resultDiv.innerHTML = `
          <div class="bg-red-50 border border-red-100 rounded-2xl p-4 animate-fadeIn">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-md">
                <i data-lucide="x" class="w-5 h-5"></i>
              </div>
              <div class="text-left">
                <h3 class="text-xs font-black text-red-900 uppercase tracking-tight leading-tight">Rejected</h3>
                <p class="text-[9px] text-red-600 font-black uppercase tracking-widest">Validation Error</p>
              </div>
            </div>
            <div class="bg-white rounded-xl p-3 shadow-sm border border-red-100/50 text-left">
               <p class="text-[10px] font-bold text-slate-600 italic">"${Helpers.escape(res.message)}"</p>
            </div>
            ${Barcode.isCameraActive() ? `
            <button class="w-full mt-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md" onclick="ScanPage.resumeScanning()">
              Try Again
            </button>` : ''}
          </div>`;
        Toast.show('error', 'Scan Rejected', res.message);
        this._addSessionScan(barcode, false, barcode);
      }
    } catch(err) {
      resultDiv.innerHTML = `
        <div class="bg-slate-100 rounded-3xl p-6 text-center">
          <p class="text-xs font-black text-slate-500 uppercase tracking-widest">Network Error</p>
          <p class="text-sm font-bold text-slate-700 mt-2">${Helpers.escape(err.message)}</p>
        </div>`;
      Toast.show('error', 'Network Error', err.message);
    }

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

  _addSessionScan(barcode, ok, label) {
    this._sessionScans.unshift({ barcode, ok, label, mode: this._mode, time: new Date() });
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

      return `
      <div class="flex items-center gap-2.5 p-2 rounded-xl ${bg} border border-white transition-all animate-fadeIn">
        <div class="w-7 h-7 rounded-lg ${iconBg} text-white flex items-center justify-center shrink-0 shadow-sm">
          <i data-lucide="${icon}" class="w-3.5 h-3.5"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate">${Helpers.escape(s.label)}</div>
          <div class="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-0.5">${modeLabel} · ${Helpers.timeAgo(s.time)}</div>
        </div>
        <div class="text-[9px] font-black uppercase ${text}">${s.ok ? 'OK' : 'FAIL'}</div>
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
