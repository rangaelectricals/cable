/**
 * Scan Operations page — Unified Smart Scanning Hub
 * Mode-less scanning: Enter a barcode/serial, system detects current status & presents next logical steps.
 */
const ScanPage = {
  _mode: 'ACTIVATE',
  _inputMode: 'SCAN',
  _sessionScans: [],
  _selectedCable: null,

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
              <h1 class="text-sm sm:text-lg font-bold text-slate-900 tracking-tight leading-none">Smart Scanning Hub</h1>
              <p class="text-[10px] sm:text-xs text-slate-400 mt-1">Unified Scan & Match Lifecycle Command Center</p>
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
          
          <!-- Left/Top Column (Smart Input controller) -->
          <div class="lg:col-span-6 xl:col-span-7 space-y-4 sm:space-y-6">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-visible relative">
              
              <!-- Smart Scan Input -->
              <div class="p-4 sm:p-6 border-b border-slate-100 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 class="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-tight">Search or Scan Cable</h2>
                    <p class="text-[10px] sm:text-xs font-medium text-slate-400 mt-0.5">Input barcode, QR, or cable number to surface valid workflows.</p>
                  </div>
                  <div class="flex gap-2 shrink-0">
                    <button id="btn-camera" onclick="ScanPage.toggleCamera()" class="btn btn-ghost btn-sm btn-square border border-slate-200 hover:border-slate-400 text-slate-600 hover:text-slate-900">
                      <i data-lucide="camera" class="w-4 h-4"></i>
                    </button>
                  </div>
                </div>

                <!-- Camera Viewer Module -->
                <div id="camera-wrap" class="hidden animate-scaleIn mt-2">
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

                <div class="relative group">
                  <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors"></i>
                  <input type="text" id="smart-scan-input" 
                    class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-900 outline-none transition-all"
                    placeholder="Enter No, Serial, or Barcode…" autocomplete="off" />
                </div>
                <div class="flex flex-wrap gap-2">
                  <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Common examples:</span>
                  <button onclick="ScanPage.setQuickValue('RC001')" class="badge badge-ghost badge-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors font-bold tracking-wider text-[9px] cursor-pointer">RC001</button>
                  <button onclick="ScanPage.setQuickValue('MC002')" class="badge badge-ghost badge-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors font-bold tracking-wider text-[9px] cursor-pointer">MC002</button>
                </div>
              </div>

              <!-- Context-Adaptive Action Card -->
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
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col h-[560px]">
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

    document.getElementById('smart-scan-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') ScanPage.identifyCable();
    });

    document.getElementById('smart-scan-input').addEventListener('input', e => {
      ScanPage.debounceIdentify();
    });

    this._renderSessionList();
    if (window.lucide && container) lucide.createIcons({ nodes: [container] });
  },

  // Stubs for backwards compatibility (e.g. called from quick actions)
  setMode(mode) {
    this._mode = mode;
    setTimeout(() => {
      const inp = document.getElementById('smart-scan-input');
      if (inp) inp.focus();
    }, 120);
  },
  setInputMode(mode) {
    this._inputMode = mode;
  },

  setQuickValue(val) {
    const inp = document.getElementById('smart-scan-input');
    if (inp) {
      inp.value = val;
      this.identifyCable();
    }
  },

  _debounceTimer: null,
  debounceIdentify() {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this.identifyCable(), 400);
  },

  async identifyCable() {
    const code = (document.getElementById('smart-scan-input')?.value || '').trim();
    if (!code) {
      this._selectedCable = null;
      const card = document.getElementById('smart-action-card');
      if (card) { card.classList.add('hidden'); card.innerHTML = ''; }
      return;
    }

    // Direct match by in-memory cables list
    const pRes = await API.getProducts({ page: 1, pageSize: 9999 });
    const all = pRes.data || [];
    
    const matched = all.find(c => 
      String(c.barcode).toUpperCase() === code.toUpperCase() || 
      String(c.cableNo).toUpperCase() === code.toUpperCase() ||
      String(c.no).toUpperCase() === code.toUpperCase()
    );

    if (!matched) {
      // Avoid overly aggressive toasts if debounce is active
      return;
    }

    this._selectedCable = matched;
    this.renderActions(matched);
  },

  renderActions(p) {
    const wrap = document.getElementById('smart-action-card');
    if (!wrap) return;

    // Detect status
    const isActivated = String(p.activated) === 'true' || p.activated === true;
    const isAtSite = p.status === 'SENT_TO_SITE';

    let actionFormHtml = '';

    // Next step recognition
    if (!isActivated) {
      actionFormHtml = `
      <div class="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 sm:p-5 space-y-4">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
          <h4 class="text-xs font-black text-indigo-900 uppercase tracking-wide">Ready for Activation</h4>
        </div>
        <p class="text-[11px] text-indigo-700/80 font-bold leading-relaxed">This cable has been created but not activated. Activating unlocks full deployment features.</p>
        <button onclick="ScanPage.submitAction('ACTIVATE')" class="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2">
          <i data-lucide="zap" class="w-4 h-4"></i> Activate Now
        </button>
      </div>`;
    } 
    else if (isAtSite) {
      actionFormHtml = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Return to Godown -->
        <div class="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><i data-lucide="warehouse" class="w-3.5 h-3.5"></i></div>
              <h4 class="text-xs font-black text-emerald-900 uppercase tracking-wide">Return to Godown</h4>
            </div>
            <p class="text-[10px] text-emerald-700/80 font-bold">Inbound recovery from existing site.</p>
            <div class="space-y-1">
              <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Meter Reading</label>
              <input type="number" id="f-meter-bal" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="Current: ${p.meter}m" />
            </div>
            <div class="space-y-1 pb-1">
              <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Log Notes</label>
              <input type="text" id="f-return-remark" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="Assess state…" />
            </div>
          </div>
          <button onclick="ScanPage.submitAction('RETURN_TO_GODOWN')" class="w-full h-10 mt-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] shadow hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2">
            Confirm Inbound
          </button>
        </div>

        <!-- Transfer to Site -->
        <div class="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><i data-lucide="repeat" class="w-3.5 h-3.5"></i></div>
              <h4 class="text-xs font-black text-blue-900 uppercase tracking-wide">Transfer Site</h4>
            </div>
            <div class="space-y-1">
              <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">New Destination Hub</label>
              <input type="text" id="f-trans-site" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="Destination site…" />
            </div>
            <div class="space-y-1">
              <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Officer Assigned</label>
              <input type="text" id="f-trans-person" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="Person name…" />
            </div>
          </div>
          <button onclick="ScanPage.submitAction('SITE_TO_SITE')" class="w-full h-10 mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] shadow hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2">
            Confirm Transfer
          </button>
        </div>
      </div>`;
    } 
    else {
      actionFormHtml = `
      <div class="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 sm:p-5 space-y-4">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><i data-lucide="truck" class="w-3.5 h-3.5"></i></div>
          <h4 class="text-xs font-black text-amber-900 uppercase tracking-wide">Ready for Dispatch</h4>
        </div>
        <p class="text-[11px] text-amber-700/80 font-bold leading-relaxed">Presently available in Godown. Complete the fields below to deploy to a site.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Site Name</label>
            <input type="text" id="f-dispatch-site" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all" placeholder="Site name…" />
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
          Dispatch Cable
        </button>
      </div>`;
    }

    wrap.innerHTML = `
    <div class="p-4 sm:p-6 space-y-5 animate-scaleIn">
       <!-- Cable Summary Badge -->
       <div class="bg-slate-50/50 border border-slate-200 rounded-2xl p-4">
         <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div>
             <div class="flex items-center gap-2 flex-wrap">
               <h3 class="text-base font-black text-slate-900 uppercase tracking-tight">${Helpers.escape(p.cableNo)}</h3>
               ${p.no ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-slate-800 font-bold text-[10px] border border-slate-200 bg-white">${Helpers.escape(p.no)}</span>` : ''}
               ${Helpers.statusBadge(p.status)}
             </div>
             <p class="text-[10px] font-extrabold text-indigo-600 bg-indigo-50/40 px-2 py-0.5 rounded border border-indigo-100/40 inline-flex mt-1.5">
               ${Helpers.escape(p.core)}/${Helpers.escape(p.sqmm)}mm² • ${p.meter}m
             </p>
           </div>
           <div class="text-left sm:text-right flex-shrink-0">
             <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Location</span>
             <span class="text-xs font-black text-slate-700 uppercase tracking-tight block mt-0.5">${p.siteName ? Helpers.escape(p.siteName) : 'Central Godown'}</span>
           </div>
         </div>
       </div>

       <!-- Dynamic Operations Option -->
       ${actionFormHtml}
    </div>`;

    wrap.classList.remove('hidden');
    if (window.lucide) lucide.createIcons({ nodes: [wrap] });
  },

  async submitAction(mode) {
    const p = this._selectedCable;
    if (!p) return;

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
      extra.eventType = p.eventType || 'DAILY';
      if (!extra.siteName) { Toast.show('warning', 'Required', 'Enter Destination Site first.'); return; }
      if (!extra.personAssigned) { Toast.show('warning', 'Required', 'Enter Officer name first.'); return; }
    }
    if (mode === 'RETURN_TO_GODOWN') {
      const mb = document.getElementById('f-meter-bal')?.value;
      if (mb) extra.meterBalance = parseFloat(mb);
      extra.note = document.getElementById('f-return-remark')?.value?.trim();
    }

    Loading.show('Syncing operational action…');
    try {
      const res = await API.scanAction(mode, p.barcode, extra);
      Loading.hide();
      if (res.success) {
        Toast.show('success', 'Sync Successful', `${p.cableNo} updated successfully.`);
        this._addSessionScan(p.barcode, true, res.data.product);

        // Reset search/scan input
        const inp = document.getElementById('smart-scan-input');
        if (inp) { inp.value = ''; inp.focus(); }

        // Hide action card
        const card = document.getElementById('smart-action-card');
        if (card) { card.classList.add('hidden'); card.innerHTML = ''; }
      } else {
        Toast.show('error', 'Operation failed', res.message);
      }
    } catch (e) {
      Loading.hide();
      Toast.show('error', 'Error', e.message);
    }
  },

  async toggleCamera() {
    const wrap = document.getElementById('camera-wrap');
    const btn = document.getElementById('btn-camera');
    if (!wrap || !btn) return;

    if (Barcode.isCameraActive()) {
      Barcode.stopCamera();
      wrap.classList.add('hidden');
      btn.innerHTML = '<i data-lucide="camera" class="w-4 h-4"></i>';
    } else {
      wrap.classList.remove('hidden');
      btn.innerHTML = '<i data-lucide="camera-off" class="w-4 h-4"></i>';
      await Barcode.startCamera('scan-viewport', code => {
        const inp = document.getElementById('smart-scan-input');
        if (inp) {
          inp.value = code;
          ScanPage.identifyCable();
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
  }
};
