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
          <div class="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden transition-all duration-300">
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
                    <select id="scan-select" class="hidden w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 focus:bg-white focus:border-indigo-500 transition-all outline-none appearance-none shadow-sm">
                      <option value="">Select from list...</option>
                    </select>
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
          cables.map(c => `<option value="${Helpers.escape(c.cableNo)}">${c.no ? `[${Helpers.escape(c.no)}] ` : ''}${Helpers.escape(c.cableNo)} (${Helpers.escape(c.core)}/${Helpers.escape(c.sqmm)}mm² - ${c.meter}m)</option>`).join('');
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
        const p = res.data.product;
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

            <div class="grid grid-cols-2 gap-3 bg-white rounded-xl p-4 shadow-sm border border-emerald-100/50">
              <div class="text-left col-span-2">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cable Details</span>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white text-slate-900 font-black text-[11px] border border-slate-200 shadow-sm min-w-[24px] justify-center">
                    ${p.no ? `${Helpers.escape(p.no)}` : '—'}
                  </span>
                  <span class="text-[14px] font-black text-indigo-700 uppercase tracking-tighter">
                    ${Helpers.escape(p.core)} / ${Helpers.escape(p.sqmm)}mm²
                  </span>
                  <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span class="text-[14px] font-black text-emerald-600 bg-emerald-50/30 px-2 py-0.5 rounded-md border border-emerald-100/50 shadow-sm uppercase tracking-tight">
                    ${p.meter}m
                  </span>
                </div>
              </div>

              <div class="text-left">
                <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Cable No</span>
                <span class="text-xs font-black text-slate-800 uppercase">${Helpers.escape(p.cableNo)}</span>
              </div>
              <div class="text-left">
                <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Current Status</span>
                <div class="mt-0.5">${Helpers.statusBadge(p.status)}</div>
              </div>

              ${p.siteName ? `
              <div class="text-left col-span-2 border-t border-slate-50 pt-3 mt-1">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Assigned Location</span>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-black text-amber-700 uppercase tracking-tight">${Helpers.escape(p.siteName)}</span>
                  <span class="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 shadow-xs shrink-0">
                    <i data-lucide="user" class="w-3 h-3"></i> ${Helpers.escape(p.personAssigned || '—')}
                  </span>
                </div>
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
