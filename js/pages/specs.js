/**
 * Specs Summary Page
 * Grouped inventory by Core and SQMM
 */
const SpecsPage = {
  _groups: [],

  async render(container) {
    container.innerHTML = `<div class="flex items-center justify-center h-64">
      <span class="loading loading-spinner loading-lg text-primary"></span></div>`;

    try {
      // Fetch all products to group them (or get a summary if API supports it)
      // Since we don't have a specific summary API, we fetch all (limit high)
      const res = await API.getProducts({ pageSize: 10000 });
      const products = res.data || [];

      // Grouping logic
      const grouped = {};
      products.forEach(p => {
        const key = `${p.core} / ${p.sqmm} mm²`;
        if (!grouped[key]) {
          grouped[key] = {
            core: p.core,
            sqmm: p.sqmm,
            count: 0,
            totalMeter: 0,
            inGodown: 0,
            atSite: 0
          };
        }
        grouped[key].count++;
        grouped[key].totalMeter += (parseFloat(p.meter) || 0) * (parseInt(p.quantity) || 1);
        if (p.status === 'IN_GODOWN') grouped[key].inGodown++;
        else grouped[key].atSite++;
      });

      this._groups = Object.values(grouped).sort((a,b) => {
        // Sort by core then sqmm
        if (a.core !== b.core) return a.core.localeCompare(b.core, undefined, {numeric: true});
        return parseFloat(a.sqmm) - parseFloat(b.sqmm);
      });

      this._renderGroups(container);
    } catch(err) {
      container.innerHTML = `<div class="alert alert-error"><span>${Helpers.escape(err.message)}</span></div>`;
    }
  },

  _renderGroups(container) {
    container.innerHTML = `
      <div class="space-y-6 page-enter">
        ${UI.pageHeader('Inventory by Specification',
          `Summary of ${this._groups.length} unique specifications`,
          `<button class="btn btn-outline btn-sm gap-2" onclick="App.navigateTo('cables')">
             <i data-lucide="list" class="w-4 h-4"></i> View All Cables
           </button>`
        )}

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${this._groups.map(g => `
          <div class="card bg-base-100 shadow-sm border border-base-200 hover:border-primary transition-colors cursor-pointer group"
               onclick="SpecsPage.viewCables('${Helpers.escape(g.core)}', '${Helpers.escape(g.sqmm)}')">
            <div class="card-body p-4">
              <div class="flex justify-between items-start mb-3">
                <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <i data-lucide="layers" class="w-6 h-6"></i>
                </div>
                <div class="text-right">
                  <div class="text-lg font-bold">${Helpers.escape(g.core)} Core</div>
                  <div class="text-sm text-base-content/50">${Helpers.escape(g.sqmm)} mm²</div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 border-t border-base-100 pt-3">
                <div>
                  <div class="text-[10px] font-bold uppercase tracking-wider text-base-content/30">Total Quantity</div>
                  <div class="text-sm font-bold">${g.count} <span class="text-[10px] font-normal opacity-50">Cables</span></div>
                </div>
                <div>
                  <div class="text-[10px] font-bold uppercase tracking-wider text-base-content/30">Total Length</div>
                  <div class="text-sm font-bold text-primary">${Math.round(g.totalMeter)}m</div>
                </div>
              </div>

              <div class="flex items-center gap-4 mt-4 pt-3 border-t border-base-100">
                <div class="flex items-center gap-1.5">
                  <div class="w-2 h-2 rounded-full bg-success"></div>
                  <span class="text-xs font-medium">${g.inGodown} in Godown</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="w-2 h-2 rounded-full bg-warning"></div>
                  <span class="text-xs font-medium">${g.atSite} at Site</span>
                </div>
                <div class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <i data-lucide="chevron-right" class="w-4 h-4 text-primary"></i>
                </div>
              </div>
            </div>
          </div>
          `).join('')}
        </div>
      </div>`;

    if (window.lucide) lucide.createIcons({ nodes: [container] });
  },

  async viewCables(core, sqmm) {
    // We set a temporary filter that CablesPage will pick up
    CablesPage._filters.core = core;
    CablesPage._filters.sqmm = sqmm;
    CablesPage._page = 1;
    App.navigateTo('cables');
  }
};
