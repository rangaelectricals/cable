/**
 * Scan Operations page — mobile-first, Lucide icons
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
      
      <!-- ── Dashboard Command Header ── -->
      <header class="relative sm:sticky top-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-20 flex items-center justify-between">
          <div class="flex items-center gap-3 sm:gap-6 min-w-0">
            <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20 ring-1 ring-white/20 flex-shrink-0">
              <i data-lucide="scan-line" class="w-4.5 h-4.5 sm:w-6 sm:h-6"></i>
            </div>
            <div class="hidden sm:block min-w-0">
              <h1 class="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">Operations Control</h1>
              <div class="flex items-center gap-4 mt-2 flex-wrap">
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-1.5 whitespace-nowrap">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
                  Node: Alpha-1
                </p>
                <div class="h-3 w-px bg-slate-200 hidden sm:block"></div>
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-1.5 whitespace-nowrap">
                  <i data-lucide="activity" class="w-3 h-3 text-indigo-500 flex-shrink-0"></i>
                  Lat: 12ms
                </p>
              </div>
            </div>
          </div>

          <!-- Operation Intelligence Hub -->
          <div class="flex items-center gap-3 sm:gap-8 flex-wrap justify-end">
            <div class="hidden md:flex flex-col items-end flex-shrink-0">
              <p class="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1 leading-none">Peak Processing</p>
              <div class="flex items-baseline gap-1">
                <span class="text-sm font-black text-slate-900">1.4</span>
                <span class="text-[9px] font-bold text-slate-400 uppercase">Hz</span>
              </div>
            </div>
            
            <div class="h-10 w-px bg-slate-200/60 hidden md:block flex-shrink-0"></div>

            <div class="text-right flex-shrink-0">
              <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Session Data</p>
              <div class="flex items-center gap-1.5 sm:gap-2 justify-end">
                <span id="stat-session-count" class="text-[13px] sm:text-[14px] font-black text-slate-900 tabular-nums">0</span>
                <span class="text-[8px] sm:text-[9px] font-black text-indigo-500 uppercase tracking-tighter whitespace-nowrap">Packets</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Mode Navigation Bar (Sub-header) -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
          <div class="bg-slate-100/50 p-1 rounded-[2rem] grid grid-cols-2 sm:grid-cols-4 gap-1 border border-slate-200/50">
            ${[
        { id: 'ACTIVATE', icon: 'zap', short: 'Activate', color: 'indigo' },
        { id: 'SEND_TO_SITE', icon: 'truck', short: 'Dispatch', color: 'amber' },
        { id: 'SITE_TO_SITE', icon: 'repeat', short: 'Transfer', color: 'blue' },
        { id: 'RETURN_TO_GODOWN', icon: 'warehouse', short: 'Return', color: 'emerald' }
      ].map(m => `
            <button id="tab-${m.id}" onclick="ScanPage.setMode('${m.id}')"
              class="w-full px-2 sm:px-3 py-2.5 sm:py-3 rounded-[1.5rem] transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 group relative min-h-[48px] sm:min-h-auto">
              <i data-lucide="${m.icon}" class="w-4 h-4 transition-transform group-hover:scale-110"></i>
              <span class="text-[9px] sm:text-[11px] font-black uppercase tracking-widest leading-tight">${m.short}</span>
              <div id="indicator-${m.id}" class="absolute -bottom-1 sm:bottom-0.5 left-3 sm:left-6 right-3 sm:right-6 h-1 bg-current rounded-full opacity-0 transition-all scale-x-0 active-indicator"></div>
            </button>`).join('')}
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <!-- ── Primary Interaction Module ── -->
          <div class="lg:col-span-7 xl:col-span-8 space-y-8">
            
            <!-- Main Controller Card -->
            <div class="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-lg sm:shadow-2xl shadow-slate-200/60 border border-slate-200/50 overflow-visible relative">
              
              <!-- Card Status Header -->
              <div id="mode-header" class="px-6 sm:px-8 py-6 sm:py-8 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                <div class="flex items-start sm:items-center gap-3 sm:gap-5 flex-1 min-w-0">
                  <div id="mode-icon-box" class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-current/20 transition-all duration-500 flex-shrink-0">
                    <i id="mode-icon" data-lucide="zap" class="w-7 h-7 sm:w-8 sm:h-8"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <h2 id="mode-title" class="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight mb-1.5">Activate Cable</h2>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span id="mode-status-tag" class="px-2.5 py-1 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Ready</span>
                      <span class="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">• <span id="mode-desc">Mode Alpha</span></span>
                    </div>
                  </div>
                </div>

                <!-- Input Switcher -->
                <div class="bg-slate-100 p-1 rounded-lg sm:rounded-2xl flex items-center gap-0.5 sm:gap-1 w-full sm:w-auto flex-shrink-0">
                  <button id="btn-mode-scan" onclick="ScanPage.setInputMode('SCAN')" class="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all">
                    Scanner
                  </button>
                  <button id="btn-mode-select" onclick="ScanPage.setInputMode('SELECT')" class="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all">
                    Manual
                  </button>
                </div>
              </div>

              <!-- Main Controller Body -->
              <div class="p-6 sm:p-8 space-y-6 sm:space-y-8">
                
                <!-- Dynamic Payload Fields -->
                <div id="extra-fields" class="hidden animate-slideDown">
                  <div class="bg-slate-50/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 space-y-5 sm:space-y-6">
                    <div id="extra-site" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div class="space-y-2">
                        <label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Destination Hub</label>
                        <input type="text" id="f-site-name" class="w-full bg-white border-2 border-slate-200 rounded-lg sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-sm font-bold text-slate-800 focus:border-slate-900 outline-none transition-all shadow-sm" placeholder="Search site..." />
                      </div>
                      <div class="space-y-2">
                        <label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assignment Officer</label>
                        <input type="text" id="f-person" class="w-full bg-white border-2 border-slate-200 rounded-lg sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-sm font-bold text-slate-800 focus:border-slate-900 outline-none transition-all shadow-sm" placeholder="Name..." />
                      </div>
                      <div class="space-y-2">
                        <label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Type</label>
                        <div class="flex items-center gap-2 h-[46px] sm:h-[52px] bg-white border-2 border-slate-200 rounded-lg sm:rounded-2xl px-4 sm:px-6">
                          <span class="text-[10px] sm:text-[11px] font-bold text-slate-600">Daily</span>
                          <input type="checkbox" id="f-monthly-toggle" class="toggle toggle-sm toggle-indigo"/>
                          <span class="text-[10px] sm:text-[11px] font-bold text-slate-600">Monthly</span>
                        </div>
                      </div>
                      <div class="col-span-full space-y-2">
                        <label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Remarks</label>
                        <textarea id="f-scan-remark" rows="2" class="w-full bg-white border-2 border-slate-200 rounded-lg sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-sm font-bold text-slate-800 focus:border-slate-900 outline-none transition-all shadow-sm" placeholder="Operational notes..."></textarea>
                      </div>
                    </div>

                    <div id="extra-return" class="hidden space-y-4 sm:space-y-6">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div class="space-y-2">
                          <label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Final Meter Reading</label>
                          <input type="number" id="f-meter-bal" class="w-full bg-white border-2 border-slate-200 rounded-lg sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-sm font-bold text-slate-800 focus:border-slate-900 outline-none transition-all shadow-sm" placeholder="0.00" />
                        </div>
                      </div>
                      <div class="space-y-2">
                        <label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Condition Assessment</label>
                        <textarea id="f-return-remark" rows="2" class="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 focus:border-slate-900 outline-none transition-all shadow-sm" placeholder="Assess returned state..."></textarea>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Capture Module -->
                <div class="space-y-4 sm:space-y-6">
                  <div id="camera-wrap" class="hidden animate-scaleIn">
                    <div class="relative max-w-sm mx-auto">
                      <div id="scan-viewport" class="aspect-square rounded-2xl sm:rounded-[3rem] overflow-hidden bg-slate-900 border-8 sm:border-[12px] border-white shadow-2xl relative ring-1 ring-slate-200">
                        <div class="absolute inset-6 sm:inset-8 border-2 border-white/20 rounded-lg sm:rounded-[2rem] flex items-center justify-center">
                          <div class="w-full h-[2px] bg-indigo-500 shadow-[0_0_15px_#6366f1] animate-scan-slow opacity-80"></div>
                        </div>
                      </div>
                      <button onclick="ScanPage.toggleCamera()" class="absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 px-4 sm:px-6 py-2 sm:py-3 bg-slate-900 text-white rounded-lg sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 ring-4 ring-white hover:bg-black transition-colors">
                        <i data-lucide="power" class="w-3 h-3"></i> Stop Camera
                      </button>
                    </div>
                  </div>

                  <!-- Unified Action Bar -->
                  <div class="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4">
                    <div class="flex-1 relative min-w-0">
                      <div id="wrap-scan-input" class="relative group h-full">
                        <i data-lucide="hash" class="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-slate-900 transition-colors flex-shrink-0"></i>
                        <input type="text" id="scan-input" 
                          class="w-full h-14 sm:h-20 bg-slate-50 border-2 border-slate-200 rounded-2xl sm:rounded-3xl pl-12 sm:pl-14 pr-4 py-3 sm:py-4 text-base sm:text-lg font-black text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-900 outline-none transition-all"
                          placeholder="Serial or QR Code..." />
                      </div>

                      <div id="wrap-scan-select" class="hidden relative h-full">
                        <button onclick="ScanPage.toggleMultiSelect()" id="btn-multi-select"
                          class="w-full h-14 sm:h-20 bg-slate-50 border-2 border-slate-200 rounded-2xl sm:rounded-3xl px-4 sm:px-8 flex items-center justify-between group hover:bg-white hover:border-slate-900 transition-all">
                          <div class="flex items-center gap-3 sm:gap-4 min-w-0">
                            <i data-lucide="package-search" class="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0"></i>
                            <span id="multi-select-label" class="text-sm sm:text-base font-black text-slate-400 group-hover:text-slate-900 transition-colors truncate">Manifest Selection</span>
                          </div>
                          <i data-lucide="chevron-down" class="w-5 h-5 text-slate-300 group-hover:text-slate-900 flex-shrink-0"></i>
                        </button>

                        <!-- Multi-Select Panel (Mobile Bottom Sheet / Desktop Dropdown) -->
                        <div id="multi-select-dropdown" class="hidden fixed sm:absolute inset-x-0 bottom-0 sm:bottom-auto sm:top-full z-[100] sm:right-0 sm:left-auto sm:w-96 sm:mt-3 bg-white rounded-t-[2.5rem] sm:rounded-[1.75rem] shadow-2xl border-t sm:border border-slate-200 overflow-hidden animate-slideUp">
                          <!-- Mobile Drag Handle -->
                          <div class="sm:hidden flex justify-center py-3 border-b border-slate-100">
                            <div class="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                          </div>

                          <div class="p-4 sm:p-5 border-b border-slate-100">
                            <div class="relative group">
                              <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900"></i>
                              <input type="text" id="multi-search" oninput="ScanPage.renderMultiSelectList(this.value)"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                placeholder="Search inventory..." />
                            </div>
                          </div>
                          <div id="multi-select-list" class="max-h-[40vh] sm:max-h-[350px] overflow-y-auto p-3 sm:p-4 space-y-2 custom-scrollbar"></div>
                          <div class="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex gap-3 sticky bottom-0">
                            <button onclick="ScanPage.clearMultiSelection()" class="flex-1 py-3 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 hover:bg-rose-50/50 rounded-lg transition-colors">Reset</button>
                            <button onclick="ScanPage.toggleMultiSelect()" class="flex-[2] bg-slate-900 text-white rounded-lg py-3 text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-colors">Confirm</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="flex gap-2 sm:gap-3 flex-shrink-0">
                      <button id="btn-camera" onclick="ScanPage.toggleCamera()" 
                        class="w-14 sm:w-20 h-14 sm:h-20 bg-white border-2 border-slate-200 rounded-2xl sm:rounded-3xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all active:scale-95 flex-shrink-0">
                        <i data-lucide="camera" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                      </button>
                      <button onclick="ScanPage.trigger()" 
                        class="flex-1 sm:w-48 h-14 sm:h-20 bg-slate-900 text-white rounded-2xl sm:rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] sm:text-[12px] shadow-2xl shadow-slate-900/30 hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3 flex-shrink-0">
                        Commit
                      </button>
                    </div>
                  </div>

                  <div id="scan-result" class="hidden animate-slideUp"></div>
                </div>
              </div>
            </div>

            <div class="lg:hidden space-y-6">
              <div class="flex items-center justify-between px-2">
                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Session Telemetry</h3>
                <span id="mobile-session-count" class="text-[10px] font-black text-slate-900 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">0 Items</span>
              </div>
              <div id="mobile-session-scans" class="space-y-4"></div>
            </div>
          </div>

          <!-- ── Desktop Operation Log ── -->
          <aside class="hidden lg:block lg:col-span-5 xl:col-span-4 space-y-6 sticky top-24 h-fit">
            
            <!-- System Health Module -->
            <div class="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
              <div class="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <i data-lucide="shield-check" class="w-32 h-32"></i>
              </div>
              
              <div class="relative z-10">
                <div class="flex items-center gap-3 mb-8">
                  <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <h3 class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">System Diagnostics</h3>
                </div>

                <div class="space-y-6">
                  <div class="flex justify-between items-end pb-4 border-b border-white/5">
                    <div>
                      <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Cloud Sync</p>
                      <p class="text-xs font-black uppercase">Established</p>
                    </div>
                    <i data-lucide="refresh-cw" class="w-4 h-4 text-emerald-500 animate-spin-slow"></i>
                  </div>
                  
                  <div class="flex justify-between items-end pb-4 border-b border-white/5">
                    <div>
                      <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Link Encryption</p>
                      <p class="text-xs font-black uppercase">AES-256 Active</p>
                    </div>
                    <i data-lucide="lock" class="w-4 h-4 text-indigo-400"></i>
                  </div>

                  <div class="pt-2">
                    <div class="flex justify-between text-[9px] font-black uppercase tracking-widest mb-3 text-slate-500">
                      <span>Local Cache Load</span>
                      <span class="text-white">84%</span>
                    </div>
                    <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div class="h-full w-[84%] bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Workflow Trends Module -->
            <div class="bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-xl overflow-hidden relative">
              <h3 class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-2">
                <i data-lucide="bar-chart-3" class="w-3 h-3 text-indigo-500"></i>
                Workflow Trends
              </h3>
              <div class="h-24 w-full flex items-end gap-1.5 px-2">
                ${[40, 70, 45, 90, 65, 85, 50, 100, 75, 95].map(h => `<div class="flex-1 bg-slate-100 rounded-t-lg group relative hover:bg-indigo-500 transition-colors" style="height: ${h}%"><div class="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">${h}%</div></div>`).join('')}
              </div>
              <div class="flex justify-between mt-4 text-[8px] font-black text-slate-300 uppercase tracking-widest px-2">
                <span>08:00</span>
                <span>Active Session</span>
                <span>Current</span>
              </div>
            </div>

            <!-- Live Stream Module -->
            <div class="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl overflow-hidden flex flex-col h-[500px]">
              <div class="px-8 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                    <i data-lucide="terminal" class="w-5 h-5"></i>
                  </div>
                  <div>
                    <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest">Live Stream</h3>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Telemetry Live</p>
                  </div>
                </div>
                <button onclick="ScanPage.clearSession()" class="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>

              <div id="session-scans" class="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
                ${UI.emptyState('activity', 'System Idle', 'Awaiting data packets...')}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>

    <style>
      .active-tab-indigo { color: #6366f1 !important; background: #eef2ff !important; }
      .active-tab-amber  { color: #f59e0b !important; background: #fffbeb !important; }
      .active-tab-blue   { color: #2563eb !important; background: #eff6ff !important; }
      .active-tab-emerald { color: #10b981 !important; background: #ecfdf5 !important; }

      .active-tab-indigo .active-indicator { opacity: 1 !important; scale: 1 !important; background: #6366f1 !important; }
      .active-tab-amber .active-indicator  { opacity: 1 !important; scale: 1 !important; background: #f59e0b !important; }
      .active-tab-blue .active-indicator   { opacity: 1 !important; scale: 1 !important; background: #2563eb !important; }
      .active-tab-emerald .active-indicator { opacity: 1 !important; scale: 1 !important; background: #10b981 !important; }

      .active-mode-indigo { background: #6366f1; }
      .active-mode-amber  { background: #f59e0b; }
      .active-mode-blue   { background: #2563eb; }
      .active-mode-emerald { background: #10b981; }

      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

      .custom-scrollbar::-webkit-scrollbar { width: 5px; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

      .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .animate-spin-slow { animation: spin 8s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

      .animate-scan-slow { animation: scan 3s ease-in-out infinite; }
      @keyframes scan { 0%, 100% { transform: translateY(-50px); } 50% { transform: translateY(50px); } }

      .animate-scaleIn { animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .page-enter { animation: pageEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes pageEnter {
        from { opacity: 0; transform: translateY(20px); }
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

    const activeClasses = ['bg-slate-900', 'text-white', 'shadow-lg'];
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
    } catch (e) {
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
      listEl.innerHTML = `<div class="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No Records Match</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(c => {
      const isSelected = this._selectedCables.includes(c.barcode);
      return `
      <div onclick="ScanPage.toggleCableSelection('${c.barcode}')" 
        class="flex items-start sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg transition-all cursor-pointer group ${isSelected ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}">
        <div class="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 sm:mt-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}">
          <i data-lucide="check" class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white ${isSelected ? '' : 'hidden'}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-wrap">
            <span class="text-[11px] sm:text-[13px] font-bold text-slate-900 uppercase truncate block">${Helpers.escape(c.cableNo)}</span>
            ${c.no ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-slate-800 font-bold text-[8px] sm:text-[9px] border border-slate-200 bg-white flex-shrink-0">${Helpers.escape(c.no)}</span>` : ''}
            <span class="text-[9px] sm:text-[11px] font-black text-indigo-600 bg-indigo-50/50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-indigo-100/30 flex-shrink-0">
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
    const statActive = document.getElementById('stat-active-mode');
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
    if (statActive) statActive.textContent = mode.replace(/_/g, ' ');
    if (statusTag) {
      statusTag.textContent = c.status;
      statusTag.className = `px-2.5 py-1 bg-${c.color}-100 text-${c.color}-700 rounded-lg text-[9px] font-black uppercase tracking-widest`;
    }

    // Update Mode Colors
    if (iconBox) {
      iconBox.className = `w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-2xl transition-all duration-500 active-mode-${c.color}`;
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

    // Update Navigation States (Unified Tabs)
    const modes = ['ACTIVATE', 'SEND_TO_SITE', 'SITE_TO_SITE', 'RETURN_TO_GODOWN'];
    modes.forEach(m => {
      const btn = document.getElementById(`tab-${m}`);
      if (btn) {
        // Clear all active tab color classes
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
      extra.siteName = (document.getElementById('f-site-name')?.value || '').trim();
      extra.personAssigned = (document.getElementById('f-person')?.value || '').trim();
      extra.note = (document.getElementById('f-scan-remark')?.value || '').trim();
      extra.eventType = document.getElementById('f-monthly-toggle')?.checked ? 'MONTHLY' : 'DAILY';
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
      } catch (err) {
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
             ${failMessages.slice(0, 3).map(m => `<p class="text-[9px] font-bold text-slate-500 truncate">• ${Helpers.escape(m)}</p>`).join('')}
             ${failMessages.length > 3 ? `<p class="text-[8px] text-slate-400 italic mt-1">+ ${failMessages.length - 3} more errors</p>` : ''}
          </div>
          <button class="w-full mt-4 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest" onclick="ScanPage.resumeScanning()">Try Again</button>
        </div>`;
    } else {
      const modeLabel = this._mode.replace(/_/g, ' ');
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
    const sct = document.getElementById('stat-session-count');
    const mct = document.getElementById('mobile-session-count');
    const countText = `${this._sessionScans.length} Items`;
    if (ct) ct.textContent = this._sessionScans.length;
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
      const empty = UI.emptyState('activity', 'System Idle', 'Awaiting data packets...');
      if (desktopEl) desktopEl.innerHTML = empty;
      if (mobileEl) mobileEl.innerHTML = empty;
      return;
    }

    // Map for hardcoded classes (Tailwind doesn't support dynamic class names)
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
      <div class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm group hover:border-slate-300 transition-all animate-fadeIn">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg ${config.bgClass} ${config.textClass} flex items-center justify-center">
              <i data-lucide="${config.icon}" class="w-3 h-3"></i>
            </div>
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${modeLabel}</span>
          </div>
          <span class="text-[8px] font-bold text-slate-300 tabular-nums">${new Date(s.time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-black text-slate-900 truncate">${Helpers.escape(s.label)}</p>
            <div class="flex items-center gap-2 mt-1 flex-wrap">
              <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tight">${s.product?.siteName || 'Wh-Alpha'}</p>
              <div class="w-1 h-1 rounded-full bg-slate-200 flex-shrink-0"></div>
              <p class="text-[9px] font-bold text-indigo-500 uppercase tracking-tight">Encrypted</p>
            </div>
          </div>
          <div class="px-2 py-1 ${statusBg} ${statusText} rounded-md text-[8px] font-black uppercase tracking-widest flex-shrink-0 border border-current/10">
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
    const ct = document.getElementById('session-count');
    const sct = document.getElementById('stat-session-count');
    const mct = document.getElementById('mobile-session-count');
    if (ct) ct.textContent = '0';
    if (sct) sct.textContent = '0 Items Processed';
    if (mct) mct.textContent = '0 Items';
    this._renderSessionList();
  },
};
