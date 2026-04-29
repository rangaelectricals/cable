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
    <div class="space-y-4 page-enter">
      ${UI.pageHeader('Scan Operations', 'Godown ↔ Site QR workflow')}

      <!-- ── Mode selector ── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
        ${[
          { id:'ACTIVATE',         icon:'check-circle', label:'Activate',       short:'Activate',  color:'primary' },
          { id:'SEND_TO_SITE',     icon:'truck',        label:'Send to Site',   short:'Send',      color:'warning' },
          { id:'SITE_TO_SITE',     icon:'repeat',       label:'Site to Site',   short:'Transfer',  color:'info' },
          { id:'RETURN_TO_GODOWN', icon:'warehouse',    label:'Return to Godown',short:'Return',   color:'success' },
        ].map(m => `
        <button id="tab-${m.id}"
          onclick="ScanPage.setMode('${m.id}')"
          class="btn btn-outline btn-${m.color} btn-sm sm:btn-md h-auto py-2 flex-col sm:flex-row gap-1 sm:gap-2 transition-all">
          <i data-lucide="${m.icon}" class="w-4 h-4 sm:w-5 sm:h-5"></i>
          <span class="text-[10px] sm:text-sm font-semibold leading-tight">${m.short}</span>
        </button>`).join('')}
      </div>

      <!-- ── Info banner ── -->
      <div id="scan-banner" class="alert text-sm"></div>

      <!-- ── Main layout: input top, session log below on mobile → side-by-side on lg ── -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">

        <!-- Input panel (3/5 on desktop) -->
        <div class="lg:col-span-3 space-y-3">
          <div class="card bg-base-100 shadow-sm border border-base-200">
            <div class="card-body gap-4 p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <i data-lucide="qr-code" class="w-5 h-5 text-primary"></i>
                  <h2 class="font-bold text-base">Input</h2>
                </div>
                <div class="join">
                  <button id="btn-mode-scan" class="btn btn-xs join-item btn-neutral" onclick="ScanPage.setInputMode('SCAN')">Scan / Type</button>
                  <button id="btn-mode-select" class="btn btn-xs join-item btn-outline btn-neutral" onclick="ScanPage.setInputMode('SELECT')">Select List</button>
                </div>
              </div>

              <!-- Scan input + buttons -->
              <div class="flex gap-2">
                <label id="wrap-scan-input" class="input input-bordered flex items-center gap-2 flex-1 min-w-0">
                  <i data-lucide="hash" class="w-4 h-4 text-base-content/40 shrink-0"></i>
                  <input type="text" id="scan-input" class="grow min-w-0 text-sm"
                    placeholder="Scan QR or type Cable No…" autocomplete="off"
                    inputmode="text" />
                </label>

                <select id="scan-select" class="select select-bordered flex-1 min-w-0 hidden text-sm">
                  <option value="">Select a cable...</option>
                </select>

                <button class="btn btn-primary gap-1.5" onclick="ScanPage.trigger()">
                  <i data-lucide="zap" class="w-4 h-4"></i>
                  <span class="hidden sm:inline" id="btn-action-text">Scan</span>
                </button>
                <button class="btn btn-outline btn-primary btn-square" id="btn-camera"
                  onclick="ScanPage.toggleCamera()" title="Toggle Camera">
                  <i data-lucide="camera" class="w-5 h-5"></i>
                </button>
              </div>

              <!-- Camera viewport -->
              <div id="camera-wrap" class="hidden">
                <div id="scan-viewport"
                  class="relative w-full rounded-xl overflow-hidden border-2 border-primary shadow-lg bg-black"
                  style="height:220px; max-width:400px; margin:0 auto">
                  <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div class="w-48 h-24 border-2 border-primary rounded relative">
                      <div class="absolute left-0 right-0 h-0.5 bg-primary/80"
                        style="animation:scanLine 2s linear infinite;top:0"></div>
                    </div>
                  </div>
                </div>
                <p class="text-center text-xs text-base-content/50 mt-2 flex items-center justify-center gap-1">
                  <i data-lucide="info" class="w-3 h-3"></i>
                  Point camera at QR code to scan automatically
                </p>
              </div>

              <!-- SEND_TO_SITE extra fields -->
              <div id="extra-site" class="hidden">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  ${UI.field('Site Name', `<input type="text" id="f-site-name" class="input input-bordered w-full"
                    placeholder="e.g. Site Alpha" />`, true)}
                  ${UI.field('Person Assigned', `<input type="text" id="f-person" class="input input-bordered w-full"
                    placeholder="e.g. Ravi Kumar" />`, true)}
                </div>
                <div class="mt-3">
                  ${UI.field('Remarks (optional)', `<input type="text" id="f-scan-remark"
                    class="input input-bordered w-full" placeholder="Any note…" />`)}
                </div>
              </div>

              <!-- RETURN_TO_GODOWN extra fields -->
              <div id="extra-return" class="hidden space-y-3">
                ${UI.field('Remaining Meter Balance (optional)',
                  `<input type="number" id="f-meter-bal" class="input input-bordered w-full"
                    placeholder="Leave blank to keep current" min="0" />`)}
                ${UI.field('Return Remarks (optional)',
                  `<input type="text" id="f-return-remark" class="input input-bordered w-full"
                    placeholder="Any note…" />`)}
              </div>
            </div>
          </div>

          <!-- Result card -->
          <div id="scan-result" class="hidden"></div>
        </div>

        <!-- Session log (2/5 on desktop, full width below on mobile) -->
        <div class="lg:col-span-2">
          <div class="card bg-base-100 shadow-sm border border-base-200 h-full">
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <i data-lucide="list-checks" class="w-4 h-4 text-base-content/50"></i>
                  <h2 class="font-bold text-sm">Session Scans</h2>
                </div>
                <div class="flex items-center gap-2">
                  <span id="session-count" class="badge badge-neutral badge-sm">0</span>
                  <button class="btn btn-ghost btn-xs text-error" onclick="ScanPage.clearSession()"
                    title="Clear session">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
              <div id="session-scans" class="divide-y divide-base-200 max-h-80 lg:max-h-none overflow-y-auto">
                ${UI.emptyState('list', 'No scans yet', 'Scanned QR codes will appear here')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      @keyframes scanLine {
        0%   { top:0;   opacity:1; }
        49%  { top:100%; opacity:1; }
        50%  { top:0;   opacity:0; }
        51%  { opacity:1; }
        100% { top:0; }
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
    const select = document.getElementById('scan-select');
    const btnCamera = document.getElementById('btn-camera');
    const actionText = document.getElementById('btn-action-text');

    if (!btnScan) return;

    if (mode === 'SCAN') {
      btnScan.className = 'btn btn-xs join-item btn-neutral';
      btnSelect.className = 'btn btn-xs join-item btn-outline btn-neutral';
      wrapInput.classList.remove('hidden');
      select.classList.add('hidden');
      btnCamera.classList.remove('hidden');
      actionText.textContent = 'Scan';
      document.getElementById('scan-input').focus();
    } else {
      btnScan.className = 'btn btn-xs join-item btn-outline btn-neutral';
      btnSelect.className = 'btn btn-xs join-item btn-neutral';
      wrapInput.classList.add('hidden');
      select.classList.remove('hidden');
      btnCamera.classList.add('hidden');
      actionText.textContent = 'Process';

      // Load eligible cables
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
      ACTIVATE:         { color:'primary', icon:'check-circle' },
      SEND_TO_SITE:     { color:'warning', icon:'truck'        },
      SITE_TO_SITE:     { color:'info',    icon:'repeat'       },
      RETURN_TO_GODOWN: { color:'success', icon:'warehouse'    },
    };

    // Update tab buttons
    ['ACTIVATE','SEND_TO_SITE','SITE_TO_SITE','RETURN_TO_GODOWN'].forEach(m => {
      const btn = document.getElementById(`tab-${m}`);
      if (!btn) return;
      const mc = modeConfig[m];
      const isActive = m === mode;
      btn.className = `btn btn-${isActive ? '' : 'outline '}btn-${mc.color} btn-sm sm:btn-md h-auto py-2 flex-col sm:flex-row gap-1 sm:gap-2 transition-all`;
    });

    // Banners
    const banners = {
      ACTIVATE: {
        cls:'alert-info', icon:'check-circle',
        title:'Activation Scan',
        desc:'Scan a newly registered cable QR code. It will be marked as <strong>In Godown</strong>. Each code can only be activated once.',
      },
      SEND_TO_SITE: {
        cls:'alert-warning', icon:'truck',
        title:'Send to Site — Godown → Site',
        desc:'Cable must be <strong>In Godown</strong>. Fill in site name and person assigned, then scan the QR or type Cable No to dispatch.',
      },
      SITE_TO_SITE: {
        cls:'alert-info', icon:'repeat',
        title:'Site to Site Transfer',
        desc:'Cable must be <strong>at a Site</strong>. Enter the new destination site and person, then scan or type Cable No.',
      },
      RETURN_TO_GODOWN: {
        cls:'alert-success', icon:'warehouse',
        title:'Return to Godown — Site → Godown',
        desc:'Cable must be <strong>at a Site</strong>. Scan QR or type Cable No to record return. Optionally update remaining meter balance.',
      },
    };

    const b = banners[mode];
    const banner = document.getElementById('scan-banner');
    if (banner) {
      banner.className = `alert ${b.cls} text-sm py-3`;
      banner.innerHTML = `
        <i data-lucide="${b.icon}" class="w-5 h-5 shrink-0"></i>
        <div>
          <p class="font-bold text-sm">${b.title}</p>
          <p class="text-xs mt-0.5 opacity-80">${b.desc}</p>
        </div>`;
    }

    // Show/hide extra fields
    const siteEl   = document.getElementById('extra-site');
    const returnEl = document.getElementById('extra-return');
    if (siteEl)   siteEl.classList.toggle('hidden',   mode !== 'SEND_TO_SITE' && mode !== 'SITE_TO_SITE');
    if (returnEl) returnEl.classList.toggle('hidden', mode !== 'RETURN_TO_GODOWN');

    // Clear result
    const res = document.getElementById('scan-result');
    if (res) { res.classList.add('hidden'); res.innerHTML = ''; }

    // If in SELECT mode, refresh the list based on new mode
    if (this._inputMode === 'SELECT') {
      this.loadEligibleCables();
    }

    // Focus input if in SCAN mode
    if (this._inputMode === 'SCAN') {
      setTimeout(() => document.getElementById('scan-input')?.focus(), 100);
    }
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
      <div class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body flex-row items-center gap-3 py-4">
          <span class="loading loading-spinner loading-md text-primary"></span>
          <span class="text-sm text-base-content/60">Processing scan…</span>
        </div>
      </div>`;
    resultDiv.classList.remove('hidden');

    try {
      const res = await API.scanAction(this._mode, barcode, extra);

      if (res.success) {
        const p = res.data;
        resultDiv.innerHTML = `
          <div class="alert alert-success shadow-sm">
            <i data-lucide="check-circle-2" class="w-6 h-6 shrink-0"></i>
            <div class="w-full min-w-0">
              <p class="font-bold text-sm">Scan Accepted — ${this._mode.replace(/_/g,' ')}</p>
              <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                <div><span class="text-xs opacity-60 block">Cable No</span><strong class="text-sm">${Helpers.escape(p.cableNo)}</strong></div>
                <div><span class="text-xs opacity-60 block">Status</span>${Helpers.statusBadge(p.status)}</div>
                <div><span class="text-xs opacity-60 block">Category</span><span class="text-sm">${Helpers.escape(p.category)}</span></div>
                <div><span class="text-xs opacity-60 block">Meter</span><span class="text-sm font-medium">${p.meter}m</span></div>
                ${p.siteName ? `<div class="col-span-2"><span class="text-xs opacity-60 block">Site</span><strong class="text-sm">${Helpers.escape(p.siteName)}</strong></div>` : ''}
                ${p.personAssigned ? `<div class="col-span-2"><span class="text-xs opacity-60 block">Person</span><span class="text-sm">${Helpers.escape(p.personAssigned)}</span></div>` : ''}
              </div>
            </div>
          </div>`;
        Toast.show('success', 'Scan Accepted', `${p.cableNo} — ${this._mode.replace(/_/g,' ')}`);
        this._addSessionScan(barcode, true, p.cableNo);
        // Clear fields
        if (this._inputMode === 'SCAN') document.getElementById('scan-input').value = '';
        else document.getElementById('scan-select').value = '';
        
        if (this._mode === 'SEND_TO_SITE' || this._mode === 'SITE_TO_SITE') {
          // Do NOT clear site name and person assigned to allow continuous scanning to the same site!
          document.getElementById('f-scan-remark').value = '';
        }
        if (this._mode === 'RETURN_TO_GODOWN') {
          document.getElementById('f-meter-bal').value     = '';
          document.getElementById('f-return-remark').value = '';
        }
        if (this._inputMode === 'SCAN') document.getElementById('scan-input').focus();
        else this.loadEligibleCables(); // refresh list to remove the dispatched item
      } else {
        resultDiv.innerHTML = `
          <div class="alert alert-error shadow-sm">
            <i data-lucide="x-circle" class="w-6 h-6 shrink-0"></i>
            <div>
              <p class="font-bold text-sm">Scan Rejected</p>
              <p class="text-xs mt-0.5">${Helpers.escape(res.message)}</p>
            </div>
          </div>`;
        Toast.show('error', 'Scan Rejected', res.message);
        this._addSessionScan(barcode, false, barcode);
      }
    } catch(err) {
      resultDiv.innerHTML = `
        <div class="alert alert-error shadow-sm">
          <i data-lucide="wifi-off" class="w-5 h-5 shrink-0"></i>
          <span class="text-sm">${Helpers.escape(err.message)}</span>
        </div>`;
      Toast.show('error', 'Network Error', err.message);
    }

    if (window.lucide) lucide.createIcons({ nodes: [resultDiv] });
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
      el.innerHTML = UI.emptyState('list', 'No scans yet', 'Scanned QR codes will appear here');
      if (window.lucide) lucide.createIcons({ nodes: [el] });
      return;
    }
    el.innerHTML = this._sessionScans.slice(0, 20).map(s => `
    <div class="flex items-center gap-3 py-2.5">
      <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0
        ${s.ok ? 'bg-success/10' : 'bg-error/10'}">
        <i data-lucide="${s.ok ? 'check' : 'x'}" class="w-3.5 h-3.5 ${s.ok ? 'text-success' : 'text-error'}"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold truncate">${Helpers.escape(s.label)}</div>
        <div class="text-xs text-base-content/45">${s.mode.replace(/_/g,' ')} · ${Helpers.timeAgo(s.time)}</div>
      </div>
      <span class="badge ${s.ok ? 'badge-success' : 'badge-error'} badge-xs font-medium shrink-0">
        ${s.ok ? 'OK' : 'FAIL'}
      </span>
    </div>`).join('');
    if (window.lucide) lucide.createIcons({ nodes: [el] });
  },

  clearSession() {
    this._sessionScans = [];
    const ct = document.getElementById('session-count');
    if (ct) ct.textContent = '0';
    this._renderSessionList();
  },
};
