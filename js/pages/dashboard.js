/**
 * Dashboard page — responsive stat cards with Lucide icons
 */
const DashboardPage = {
  async render(container) {
    container.innerHTML = UI.skeletonLoader();

    let products = [], logs = [];
    try {
      await API.initDatabase();
      const [pRes, lRes] = await Promise.all([
        API.getProducts({ pageSize: 9999, page: 1 }),
        API.getLogs({ pageSize: 8, page: 1 }),
      ]);
      products = pRes.data || [];
      logs     = (lRes.data || []).map(l => {
        const prod = products.find(p => p.barcode === l.cableNo || p.cableNo === l.cableNo);
        return { ...l, ...prod };
      });
    } catch(err) {
      container.innerHTML = `
        <div class="alert alert-error max-w-lg mx-auto mt-8 gap-3">
          <i data-lucide="wifi-off" class="w-6 h-6 shrink-0"></i>
          <div>
            <h4 class="font-bold">Cannot reach Google Sheets API</h4>
            <p class="text-sm mt-0.5">${Helpers.escape(err.message)}</p>
            <p class="text-xs mt-1 opacity-70">Check your Apps Script URL in <code>js/config.js</code></p>
          </div>
        </div>`;
      if (window.lucide && container) lucide.createIcons({ nodes: [container] });
      return;
    }

    const total        = products.length;
    const inGodown     = products.filter(p => p.status === 'IN_GODOWN').length;
    const onSite       = products.filter(p => p.status === 'SENT_TO_SITE').length;
    const activated    = products.filter(p => String(p.activated)==='true'||p.activated===true).length;
    const notActivated = total - activated;

    const activeDaily    = products.filter(p => p.status === 'SENT_TO_SITE' && (p.eventType || '').toUpperCase() === 'DAILY').length;
    const activeEvent    = products.filter(p => p.status === 'SENT_TO_SITE' && (p.eventType || '').toUpperCase() === 'EVENT').length;
    const activeMonthly  = products.filter(p => p.status === 'SENT_TO_SITE' && (p.eventType || '').toUpperCase() === 'MONTHLY').length;

    const copperCables   = products.filter(p => (p.category || '').toUpperCase().includes('COPPER')).length;
    const aluminumCables = products.filter(p => (p.category || '').toUpperCase().includes('ALUMINUM') || (p.category || '').toUpperCase().includes('ALUM')).length;

    const outAging = products.filter(p => {
      if (p.status === 'IN_GODOWN' || !p.dateOut) return false;
      const days = Math.floor((Date.now() - new Date(p.dateOut).getTime()) / (1000 * 3600 * 24));
      return days > 0;
    }).length;

    const totalMeters = products.reduce((acc, p) => acc + (Number(p.meter) || 0) * (Number(p.quantity) || 1), 0);
    container.innerHTML = `
    <div class="space-y-6 page-enter">
      ${UI.pageHeader('Dashboard', 'Real-time cable inventory overview',
        `<button class="btn btn-ghost btn-sm gap-2" onclick="DashboardPage.render(document.getElementById('main-content'))">
          <i data-lucide="refresh-cw" class="w-4 h-4"></i>
          <span class="hidden sm:inline">Refresh</span>
        </button>`
      )}

      <!-- Premium vibrant gradient stat cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fadeIn">
        <div onclick="App.navigateTo('cables')" class="cursor-pointer bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 rounded-3xl p-5 text-white border border-indigo-400/30 flex items-center justify-between shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-1 transition-all duration-300 select-none">
          <div>
            <div class="text-[10px] font-black uppercase tracking-wider text-indigo-100 opacity-90">Total Cables</div>
            <div class="text-3xl font-black mt-1.5 tracking-tight">${total}</div>
          </div>
          <div class="w-12 h-12 bg-indigo-400/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-indigo-300/30">
            <i data-lucide="package" class="w-6 h-6 text-white"></i>
          </div>
        </div>

        <div onclick="App.navigateTo('cables')" class="cursor-pointer bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-3xl p-5 text-white border border-emerald-400/30 flex items-center justify-between shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-1 transition-all duration-300 select-none">
          <div>
            <div class="text-[10px] font-black uppercase tracking-wider text-emerald-100 opacity-90">In Godown</div>
            <div class="text-3xl font-black mt-1.5 tracking-tight">${inGodown}</div>
          </div>
          <div class="w-12 h-12 bg-emerald-400/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-emerald-300/30">
            <i data-lucide="warehouse" class="w-6 h-6 text-white"></i>
          </div>
        </div>

        <div onclick="App.navigateTo('cables')" class="cursor-pointer bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-3xl p-5 text-white border border-amber-400/30 flex items-center justify-between shadow-lg hover:shadow-amber-500/20 hover:-translate-y-1 transition-all duration-300 select-none">
          <div>
            <div class="text-[10px] font-black uppercase tracking-wider text-amber-100 opacity-90">Sent to Site</div>
            <div class="text-3xl font-black mt-1.5 tracking-tight">${onSite}</div>
          </div>
          <div class="w-12 h-12 bg-amber-400/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-amber-300/30">
            <i data-lucide="truck" class="w-6 h-6 text-white"></i>
          </div>
        </div>

        <div onclick="App.navigateTo('scan')" class="cursor-pointer bg-gradient-to-br from-pink-500 via-pink-600 to-pink-700 rounded-3xl p-5 text-white border border-pink-400/30 flex items-center justify-between shadow-lg hover:shadow-pink-500/20 hover:-translate-y-1 transition-all duration-300 select-none">
          <div>
            <div class="text-[10px] font-black uppercase tracking-wider text-pink-100 opacity-90">Activated</div>
            <div class="text-3xl font-black mt-1.5 tracking-tight">${activated}</div>
          </div>
          <div class="w-12 h-12 bg-pink-400/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-pink-300/30">
            <i data-lucide="check-circle" class="w-6 h-6 text-white"></i>
          </div>
        </div>
      </div>

      <!-- Quick actions with gradients -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fadeIn">
        ${[
          { label:'Add Cable',    icon:'plus-circle',   page:'cables', bg:'bg-gradient-to-br from-indigo-50 to-indigo-100/60',  text:'text-indigo-700',  border:'border-indigo-200/60',  hbg:'hover:from-indigo-100 hover:to-indigo-200/50' },
          { label:'Scan / Return',icon:'scan-line',      page:'scan',   bg:'bg-gradient-to-br from-amber-50 to-amber-100/60',   text:'text-amber-700',   border:'border-amber-200/60',   hbg:'hover:from-amber-100 hover:to-amber-200/50'  },
          { label:'View Logs',    icon:'activity',       page:'logs',   bg:'bg-gradient-to-br from-blue-50 to-blue-100/60',    text:'text-blue-700',    border:'border-blue-200/60',    hbg:'hover:from-blue-100 hover:to-blue-200/50'   },
          { label:'Masters',      icon:'settings-2',     page:'masters',bg:'bg-gradient-to-br from-violet-50 to-violet-100/60',  text:'text-violet-700',  border:'border-violet-200/60',  hbg:'hover:from-violet-100 hover:to-violet-200/50' },
        ].map(q => `
        <button onclick="App.navigateTo('${q.page}')"
                class="${q.bg} ${q.text} ${q.border} ${q.hbg} border rounded-3xl py-4 flex flex-col items-center gap-2 transition-all hover:shadow-md hover:-translate-y-0.5 font-bold">
          <i data-lucide="${q.icon}" class="w-6 h-6"></i>
          <span class="text-xs font-black">${q.label}</span>
        </button>`).join('')}
      </div>

      <!-- Deployed Order Type Breakdown & Materials -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Deployed Order Types -->
        <div class="p-6 bg-white border border-slate-200/80 flex flex-col justify-between h-full rounded-3xl shadow-sm hover:shadow-md transition-all duration-300">
          <div>
            <div class="flex items-center gap-2 mb-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <i data-lucide="layers" class="w-4 h-4"></i>
              </div>
              <h2 class="text-sm font-bold text-slate-700">Deployed Orders Breakdown</h2>
            </div>
            <p class="text-xs text-slate-500 mb-5">Cables currently deployed across active sites categorized by order type.</p>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div class="p-4 bg-gradient-to-b from-slate-50 to-slate-100/50 rounded-2xl border border-slate-100 text-center hover:shadow-sm transition-all duration-300">
              <div class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Daily</div>
              <div class="text-2xl font-black text-slate-700 mt-1">${activeDaily}</div>
            </div>
            <div class="p-4 bg-gradient-to-b from-slate-50 to-slate-100/50 rounded-2xl border border-slate-100 text-center hover:shadow-sm transition-all duration-300">
              <div class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Event</div>
              <div class="text-2xl font-black text-slate-700 mt-1">${activeEvent}</div>
            </div>
            <div class="p-4 bg-gradient-to-b from-slate-50 to-slate-100/50 rounded-2xl border border-slate-100 text-center hover:shadow-sm transition-all duration-300">
              <div class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Monthly</div>
              <div class="text-2xl font-black text-slate-700 mt-1">${activeMonthly}</div>
            </div>
          </div>
        </div>

        <!-- Material Distribution -->
        <div class="p-6 bg-white border border-slate-200/80 flex flex-col justify-between h-full rounded-3xl shadow-sm hover:shadow-md transition-all duration-300">
          <div>
            <div class="flex items-center gap-2 mb-3">
              <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <i data-lucide="shield" class="w-4 h-4"></i>
              </div>
              <h2 class="text-sm font-bold text-slate-700">Cable Material Insights</h2>
            </div>
            <p class="text-xs text-slate-500 mb-5">Breakdown of stock by conductor material.</p>
          </div>
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-xs font-bold mb-1 tracking-tight">
                <span class="text-slate-600">Copper Conductors</span>
                <span class="text-indigo-600">${copperCables} / ${total} (${total ? Math.round((copperCables/total)*100) : 0}%)</span>
              </div>
              <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/40">
                <div class="bg-gradient-to-r from-indigo-400 to-indigo-600 h-full rounded-full transition-all duration-500" style="width: ${total ? (copperCables/total)*100 : 0}%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs font-bold mb-1 tracking-tight">
                <span class="text-slate-600">Aluminum Conductors</span>
                <span class="text-amber-600">${aluminumCables} / ${total} (${total ? Math.round((aluminumCables/total)*100) : 0}%)</span>
              </div>
              <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/40">
                <div class="bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full transition-all duration-500" style="width: ${total ? (aluminumCables/total)*100 : 0}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom row -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <!-- Status Distribution -->
        <div class="lg:col-span-2">
          <div class="p-6 bg-white border border-slate-200/80 h-full rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50">
                <i data-lucide="pie-chart" class="w-4 h-4 text-indigo-600"></i>
              </div>
              <h2 class="text-sm font-bold text-slate-700">Status Distribution</h2>
            </div>
            <div class="space-y-4 flex-1 flex flex-col justify-center">
              <div>
                <div class="flex justify-between text-xs font-bold mb-1 tracking-tight">
                  <span class="text-slate-600">In Godown</span>
                  <span class="text-emerald-600">${inGodown} / ${total} (${total ? Math.round((inGodown/total)*100) : 0}%)</span>
                </div>
                <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/40">
                  <div class="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-500" style="width: ${total ? (inGodown/total)*100 : 0}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs font-bold mb-1 tracking-tight">
                  <span class="text-slate-600">Sent to Site</span>
                  <span class="text-amber-600">${onSite} / ${total} (${total ? Math.round((onSite/total)*100) : 0}%)</span>
                </div>
                <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/40">
                  <div class="bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full transition-all duration-500" style="width: ${total ? (onSite/total)*100 : 0}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs font-bold mb-1 tracking-tight">
                  <span class="text-slate-600">Activated</span>
                  <span class="text-pink-600">${activated} / ${total} (${total ? Math.round((activated/total)*100) : 0}%)</span>
                </div>
                <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/40">
                  <div class="bg-gradient-to-r from-pink-400 to-pink-600 h-full rounded-full transition-all duration-500" style="width: ${total ? (activated/total)*100 : 0}%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="lg:col-span-3">
          <div class="p-6 bg-white border border-slate-200/80 h-full rounded-3xl shadow-sm hover:shadow-md transition-all duration-300">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <div class="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100/50">
                  <i data-lucide="activity" class="w-4 h-4 text-slate-600"></i>
                </div>
                <h2 class="text-sm font-bold text-slate-700">Recent Activity</h2>
              </div>
              <button class="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50/50 px-3 py-1 rounded-xl transition-all" onclick="App.navigateTo('logs')">
                View all <i data-lucide="arrow-right" class="w-3 h-3"></i>
              </button>
            </div>
            <div class="divide-y divide-slate-100">
              ${logs.length
                ? logs.map(l => DashboardPage._logRow(l)).join('')
                : UI.emptyState('inbox','No activity yet','Scan operations appear here')}
            </div>
          </div>
        </div>
    </div>`;

    if (window.lucide && container) lucide.createIcons({ nodes: [container] });
  },

  _logRow(log) {
    const map = {
      ACTIVATE:         { icon:'check-circle', cls:'badge-primary', color:'text-indigo-600' },
      SEND_TO_SITE:     { icon:'truck',         cls:'badge-warning', color:'text-amber-600' },
      RETURN_TO_GODOWN: { icon:'warehouse',     cls:'badge-success', color:'text-emerald-600' },
    };
    const m = map[log.action] || { icon:'circle', cls:'badge-ghost', color:'text-slate-400' };
    return `
    <div class="flex items-center gap-3 py-3 px-1 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors rounded-lg">
      <div class="w-10 h-10 rounded-xl ${m.cls.replace('badge-','bg-').replace('success','emerald-50').replace('warning','amber-50').replace('info','indigo-50').replace('error','rose-50')} flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
        <i data-lucide="${m.icon}" class="w-5 h-5 ${m.color}"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-1.5 leading-none">
          ${Helpers.escape(log.cableNo)}
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          ${log.no ? `
          <div class="w-6 h-6 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-[10px] font-black text-slate-900 shadow-sm">
            ${Helpers.escape(log.no)}
          </div>` : ''}
          
          <div class="text-[11px] font-black text-indigo-600 uppercase">
            ${log.core || '?'}/${log.sqmm || '?'}MM²
          </div>

          <div class="w-1 h-1 rounded-full bg-slate-300"></div>

          ${log.meter ? `
          <div class="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-black uppercase tracking-tight">
            ${log.meter}M
          </div>` : ''}
        </div>
        <div class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2 opacity-80">
          ${Helpers.escape(log.note || log.siteName || 'System Event')} · ${Helpers.timeAgo(log.timestamp)}
        </div>
      </div>
      <div class="hidden sm:block">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full ${m.cls.replace('badge-','bg-').replace('success','emerald-50 text-emerald-600 border-emerald-100').replace('warning','amber-50 text-amber-600 border-amber-100').replace('info','indigo-50 text-indigo-600 border-indigo-100').replace('error','rose-50 text-rose-600 border-rose-100')} border text-[9px] font-black uppercase tracking-widest shadow-sm">
          ${log.action.replace(/_/g,' ')}
        </span>
      </div>
    </div>`;
  },
};
