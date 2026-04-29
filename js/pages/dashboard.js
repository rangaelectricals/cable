/**
 * Dashboard page — responsive stat cards with Lucide icons
 */
const DashboardPage = {
  async render(container) {
    container.innerHTML = `<div class="flex items-center justify-center h-64">
      <span class="loading loading-spinner loading-lg text-primary"></span></div>`;

    let products = [], logs = [];
    try {
      const [pRes, lRes] = await Promise.all([
        API.getProducts({ pageSize: 9999, page: 1 }),
        API.getLogs({ pageSize: 8, page: 1 }),
      ]);
      products = pRes.data || [];
      logs     = lRes.data || [];
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
      if (window.lucide) lucide.createIcons({ nodes: [container] });
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
        <div class="stats shadow-sm border border-base-200 bg-base-100 rounded-xl col-span-2 sm:col-span-1">
          ${UI.statCard({ icon:'package',    label:'Total Cables',  value: total,        color:'neutral', onclick:"App.navigateTo('cables')" })}
        </div>
        <div class="stats shadow-sm border border-base-200 bg-base-100 rounded-xl">
          ${UI.statCard({ icon:'warehouse',  label:'In Godown',     value: inGodown,     color:'success', onclick:"App.navigateTo('cables')" })}
        </div>
        <div class="stats shadow-sm border border-base-200 bg-base-100 rounded-xl">
          ${UI.statCard({ icon:'truck',      label:'Sent to Site',  value: onSite,       color:'warning', onclick:"App.navigateTo('cables')" })}
        </div>
        <div class="stats shadow-sm border border-base-200 bg-base-100 rounded-xl">
          ${UI.statCard({ icon:'check-circle',label:'Activated',    value: activated,    color:'primary', onclick:"App.navigateTo('scan')"   })}
        </div>
        <div class="stats shadow-sm border border-base-200 bg-base-100 rounded-xl">
          ${UI.statCard({ icon:'clock',      label:'Not Activated', value: notActivated, color:'error',   onclick:"App.navigateTo('cables')" })}
        </div>
      </div>

      <!-- Quick actions (mobile-friendly) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${[
          { label:'Add Cable',    icon:'plus-circle',   page:'cables', color:'primary'  },
          { label:'Scan / Return',icon:'scan-line',      page:'scan',   color:'warning'  },
          { label:'View Logs',    icon:'activity',       page:'logs',   color:'info'     },
          { label:'Masters',      icon:'settings-2',     page:'masters',color:'secondary'},
        ].map(q => `
        <button onclick="App.navigateTo('${q.page}')"
                class="btn btn-outline btn-${q.color} h-auto py-3 flex-col gap-2 hover:scale-[1.02] transition-transform">
          <i data-lucide="${q.icon}" class="w-6 h-6"></i>
          <span class="text-xs font-semibold">${q.label}</span>
        </button>`).join('')}
      </div>

      <!-- Bottom row -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <!-- Status Distribution -->
        <div class="lg:col-span-2">
          <div class="card bg-base-100 shadow-sm border border-base-200 h-full">
            <div class="card-body">
              <div class="flex items-center gap-2 mb-3">
                <i data-lucide="pie-chart" class="w-4 h-4 text-base-content/50"></i>
                <h2 class="card-title text-sm font-bold">Status Distribution</h2>
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
          <div class="card bg-base-100 shadow-sm border border-base-200 h-full">
            <div class="card-body">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <i data-lucide="activity" class="w-4 h-4 text-base-content/50"></i>
                  <h2 class="card-title text-sm font-bold">Recent Activity</h2>
                </div>
                <button class="btn btn-ghost btn-xs gap-1 text-primary" onclick="App.navigateTo('logs')">
                  View all <i data-lucide="arrow-right" class="w-3 h-3"></i>
                </button>
              </div>
              <div class="divide-y divide-base-200">
                ${logs.length
                  ? logs.map(l => DashboardPage._logRow(l)).join('')
                  : UI.emptyState('inbox','No activity yet','Scan operations appear here')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    if (window.lucide) lucide.createIcons({ nodes: [container] });
  },

  _logRow(log) {
    const map = {
      ACTIVATE:         { icon:'check-circle', cls:'badge-primary', color:'text-primary' },
      SEND_TO_SITE:     { icon:'truck',         cls:'badge-warning', color:'text-warning' },
      RETURN_TO_GODOWN: { icon:'warehouse',     cls:'badge-success', color:'text-success' },
    };
    const m = map[log.action] || { icon:'circle', cls:'badge-ghost', color:'text-base-content/30' };
    return `
    <div class="flex items-center gap-3 py-2.5">
      <div class="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center shrink-0">
        <i data-lucide="${m.icon}" class="w-4 h-4 ${m.color}"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold truncate">${Helpers.escape(log.cableNo)}</div>
        <div class="text-xs text-base-content/45 truncate">
          ${Helpers.escape(log.note || log.siteName || '—')} · ${Helpers.timeAgo(log.timestamp)}
        </div>
      </div>
      <span class="badge ${m.cls} badge-sm shrink-0 font-medium hidden sm:inline-flex">
        ${log.action.replace(/_/g,' ')}
      </span>
    </div>`;
  },
};
