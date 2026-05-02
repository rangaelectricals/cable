const SpecsPage = {
  _groups: [],
  _filters: { search: '' },

  async render(container) {
    container.innerHTML = UI.skeletonLoader();

    try {
      const res = await API.getProducts({ pageSize: 10000 });
      const products = res.data || [];

      const grouped = {};
      products.forEach(p => {
        const cat = p.category || 'Uncategorized';
        const key = `${cat} | ${p.core} | ${p.sqmm}`;
        if (!grouped[key]) {
          grouped[key] = {
            category: cat,
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
        if (String(a.category || '') !== String(b.category || '')) 
          return String(a.category || '').localeCompare(String(b.category || ''));
        if (String(a.core || '') !== String(b.core || '')) 
          return String(a.core || '').localeCompare(String(b.core || ''), undefined, {numeric: true});
        return parseFloat(a.sqmm) - parseFloat(b.sqmm);
      });

      this._renderShell(container);
    } catch(err) {
      container.innerHTML = `<div class="alert alert-error"><span>${Helpers.escape(err.message)}</span></div>`;
    }
  },

  _renderShell(container) {
    const totalCables = this._groups.reduce((acc, g) => acc + g.count, 0);
    const totalMeters = this._groups.reduce((acc, g) => acc + g.totalMeter, 0);

    container.innerHTML = `
      <div class="space-y-6 page-enter">
        ${UI.pageHeader('Inventory by Specification',
          `Summary of ${this._groups.length} unique specifications`,
          `<div class="flex gap-2">
            <div class="dropdown dropdown-end">
              <button tabindex="0" class="btn btn-ghost btn-sm gap-2">
                <i data-lucide="file-down" class="w-4 h-4"></i>
                <span class="hidden sm:inline">Export</span>
              </button>
              <ul tabindex="0" class="dropdown-content z-[10] menu p-2 shadow-2xl bg-white border border-slate-100 rounded-2xl w-48 mt-2">
                <li><a onclick="SpecsPage.exportExcel()" class="text-[11px] font-black uppercase tracking-widest py-3">Excel Summary</a></li>
                <li><a onclick="SpecsPage.exportPDF()" class="text-[11px] font-black uppercase tracking-widest py-3">PDF Summary</a></li>
              </ul>
            </div>
            <button class="btn btn-primary btn-sm gap-2" onclick="App.navigateTo('cables')">
              <i data-lucide="list" class="w-4 h-4"></i>
              <span class="hidden sm:inline">Inventory</span>
            </button>
          </div>`
        )}

        <!-- Summary Telemetry -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner"><i data-lucide="layers" class="w-6 h-6"></i></div>
            <div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unique Specs</div>
              <div class="text-xl font-black text-slate-900">${this._groups.length}</div>
            </div>
          </div>
          <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner"><i data-lucide="package" class="w-6 h-6"></i></div>
            <div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Cables</div>
              <div class="text-xl font-black text-slate-900">${totalCables}</div>
            </div>
          </div>
          <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner"><i data-lucide="ruler" class="w-6 h-6"></i></div>
            <div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cumulative Length</div>
              <div class="text-xl font-black text-slate-900">${Math.round(totalMeters)}<span class="text-sm font-bold text-slate-400 ml-1">M</span></div>
            </div>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="relative group">
          <i data-lucide="search" class="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors"></i>
          <input type="text" id="spec-search" oninput="SpecsPage.onSearch(this.value)"
            placeholder="Search specifications (e.g. 3C / 1.5)..."
            class="w-full bg-white border-2 border-slate-100 rounded-[2rem] pl-14 pr-6 py-5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500/50 shadow-sm transition-all" />
        </div>

        <div id="spec-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Cards go here -->
        </div>
      </div>`;
    
    this._renderGroups();
  },

  _renderGroups() {
    const grid = document.getElementById('spec-grid');
    if (!grid) return;

    const filtered = this._groups.filter(g => {
      const q = this._filters.search.toLowerCase();
      return `${g.category} ${g.core} ${g.sqmm}`.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="col-span-full">${UI.emptyState('search', 'No specifications found', 'Try adjusting your search criteria')}</div>`;
      if (window.lucide) lucide.createIcons({ nodes: [grid] });
      return;
    }

    grid.innerHTML = filtered.map(g => {
      const godownPct = (g.inGodown / g.count) * 100;
      return `
      <div class="card bg-white shadow-sm border border-slate-200 rounded-[2.5rem] hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer group overflow-hidden"
           onclick="SpecsPage.viewCables('${Helpers.escape(g.category)}', '${Helpers.escape(g.core)}', '${Helpers.escape(g.sqmm)}')">
        <div class="card-body p-8 relative">
          <div class="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
            <i data-lucide="layers" class="w-24 h-24"></i>
          </div>

          <div class="flex justify-between items-start relative z-10">
            <div class="flex flex-col">
              <div class="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">${Helpers.escape(g.category)}</div>
              <div class="text-xl sm:text-2xl font-black text-slate-900 leading-none uppercase tracking-tight">
                ${Helpers.escape(g.core)} CORE / ${Helpers.escape(g.sqmm)} MM²
              </div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all shadow-sm">
              <i data-lucide="chevron-right" class="w-6 h-6"></i>
            </div>
          </div>

          <div class="mt-8 space-y-5 relative z-10">
            <div class="flex justify-between items-end">
              <div>
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Level</p>
                <div class="flex items-baseline gap-1.5">
                  <span class="text-lg font-black text-slate-900">${g.count}</span>
                  <span class="text-[10px] font-bold text-slate-400 uppercase">Cables</span>
                </div>
              </div>
              <div class="text-right">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Meters</p>
                <div class="flex items-baseline gap-1.5 justify-end">
                  <span class="text-lg font-black text-indigo-600">${Math.round(g.totalMeter)}</span>
                  <span class="text-[10px] font-bold text-slate-400 uppercase">M</span>
                </div>
              </div>
            </div>

            <!-- Distribution Bar -->
            <div>
              <div class="flex justify-between text-[8px] font-black uppercase tracking-widest mb-2">
                <span class="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md shadow-sm">${g.inGodown} IN GODOWN</span>
                <span class="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md shadow-sm">${g.atSite} AT SITE</span>
              </div>
              <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div class="h-full bg-emerald-500" style="width: ${godownPct}%"></div>
                <div class="h-full bg-amber-400 flex-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');

    if (window.lucide) lucide.createIcons({ nodes: [grid] });
  },

  onSearch(q) {
    this._filters.search = q;
    this._renderGroups();
  },

  async exportExcel() {
    if (!this._groups.length) return;
    Loading.show('Preparing Spec Excel...');
    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('Specs Summary');

      ws.columns = [
        { header: 'CATEGORY',    key: 'category',   width: 20 },
        { header: 'CORE',        key: 'core',       width: 10 },
        { header: 'SQMM',        key: 'sqmm',       width: 10 },
        { header: 'TOTAL CABLES',key: 'count',      width: 15 },
        { header: 'TOTAL METERS',key: 'totalMeter', width: 15 },
        { header: 'IN GODOWN',   key: 'inGodown',   width: 15 },
        { header: 'AT SITE',     key: 'atSite',     width: 15 }
      ];

      this._groups.forEach(g => {
        ws.addRow({ ...g, totalMeter: Math.round(g.totalMeter) });
      });

      // Style Header
      const headerRow = ws.getRow(1);
      headerRow.height = 25;
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Style Rows
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.eachCell(cell => {
          cell.alignment = { horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `specs_summary_${new Date().toISOString().slice(0,10)}.xlsx`;
      link.click();
      Toast.show('success', 'Excel Exported', 'Specification summary saved.');
    } catch(err) { Toast.show('error', 'Export Error', err.message); }
    Loading.hide();
  },

  async exportPDF() {
    if (!this._groups.length) return;
    Loading.show('Preparing Spec PDF...');
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');

      doc.setFontSize(16);
      doc.text('INVENTORY BY SPECIFICATION', 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

      const body = this._groups.map(g => [
        g.category,
        g.core + ' Core',
        g.sqmm + ' mm²',
        g.count,
        Math.round(g.totalMeter) + ' M',
        g.inGodown,
        g.atSite
      ]);

      doc.autoTable({
        startY: 35,
        head: [['Category', 'Core', 'SQMM', 'Cables', 'Total Length', 'Godown', 'Site']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // indigo-600
        columnStyles: {
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' },
          6: { halign: 'center' }
        }
      });

      doc.save(`specs_summary_${new Date().toISOString().slice(0,10)}.pdf`);
      Toast.show('success', 'PDF Exported', 'Specification report saved.');
    } catch(err) { Toast.show('error', 'Export Error', err.message); }
    Loading.hide();
  },

  async viewCables(category, core, sqmm) {
    SpecDetailsPage._spec = { category, core, sqmm };
    SpecDetailsPage._page = 1;
    SpecDetailsPage._filters = { search: '', status: '' };
    App.navigateTo('spec-details');
  }
};
