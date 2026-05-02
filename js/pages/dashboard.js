/**
 * Dashboard page — responsive stat cards with Lucide icons
 */
const DashboardPage = {
  async render(container) {
    container.innerHTML = `<div class="flex items-center justify-center h-64">
      <span class="loading loading-spinner loading-lg text-indigo-600"></span></div>`;

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

    container.innerHTML = `
    <div class="space-y-5 page-enter">
      ${UI.pageHeader('Dashboard', 'Real-time cable inventory overview',
        `<button class="btn btn-ghost btn-sm gap-2" onclick="DashboardPage.render(document.getElementById('main-content'))">
          <i data-lucide="refresh-cw" class="w-4 h-4"></i>
          <span class="hidden sm:inline">Refresh</span>
        </button>`
      )}

      <!-- Stats grid — 2 col on mobile, 5 col on xl -->
      <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <div class="col-span-2 sm:col-span-1">
          ${UI.statCard({ icon:'package',    label:'Total Cables',  value: total,        color:'neutral', onclick:"App.navigateTo('cables')" })}
        </div>
        <div>
          ${UI.statCard({ icon:'warehouse',  label:'In Godown',     value: inGodown,     color:'success', onclick:"App.navigateTo('cables')" })}
        </div>
        <div>
          ${UI.statCard({ icon:'truck',      label:'Sent to Site',  value: onSite,       color:'warning', onclick:"App.navigateTo('cables')" })}
        </div>
        <div>
          ${UI.statCard({ icon:'check-circle',label:'Activated',    value: activated,    color:'primary', onclick:"App.navigateTo('scan')"   })}
        </div>
        <div>
          ${UI.statCard({ icon:'clock',      label:'Not Activated', value: notActivated, color:'error',   onclick:"App.navigateTo('cables')" })}
        </div>
      </div>

      <!-- Quick actions (mobile-friendly) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${[
          { label:'Add Cable',    icon:'plus-circle',   page:'cables', bg:'bg-indigo-50',  text:'text-indigo-700',  border:'border-indigo-200',  hbg:'hover:bg-indigo-100' },
          { label:'Scan / Return',icon:'scan-line',      page:'scan',   bg:'bg-amber-50',   text:'text-amber-700',   border:'border-amber-200',   hbg:'hover:bg-amber-100'  },
          { label:'View Logs',    icon:'activity',       page:'logs',   bg:'bg-blue-50',    text:'text-blue-700',    border:'border-blue-200',    hbg:'hover:bg-blue-100'   },
          { label:'Masters',      icon:'settings-2',     page:'masters',bg:'bg-violet-50',  text:'text-violet-700',  border:'border-violet-200',  hbg:'hover:bg-violet-100' },
        ].map(q => `
        <button onclick="App.navigateTo('${q.page}')"
                class="${q.bg} ${q.text} ${q.border} ${q.hbg} border rounded-2xl py-4 flex flex-col items-center gap-2 transition-all hover:shadow-md hover:-translate-y-0.5">
          <i data-lucide="${q.icon}" class="w-6 h-6"></i>
          <span class="text-xs font-bold">${q.label}</span>
        </button>`).join('')}
      </div>

      <!-- Bottom row -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <!-- Status Distribution -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 h-full">
            <div class="p-5">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <i data-lucide="pie-chart" class="w-4 h-4 text-indigo-600"></i>
                </div>
                <h2 class="text-sm font-bold text-slate-700">Status Distribution</h2>
              </div>
              ${total === 0
                ? UI.emptyState('bar-chart-2','No cables yet','Add cables via Cable Inventory')
                : `<div>
                    ${UI.progressRow('In Godown',    inGodown, total, 'progress-success')}
                    ${UI.progressRow('Sent to Site', onSite,   total, 'progress-warning')}
                    ${UI.progressRow('Activated',    activated,total,  'progress-primary')}
                   </div>`
              }
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="lg:col-span-3">
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 h-full">
            <div class="p-5">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <i data-lucide="activity" class="w-4 h-4 text-slate-600"></i>
                  </div>
                  <h2 class="text-sm font-bold text-slate-700">Recent Activity</h2>
                </div>
                <button class="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1" onclick="App.navigateTo('logs')">
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
