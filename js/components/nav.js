/**
 * Navigation Component — Sidebar + Mobile Bottom Nav
 * Uses Lucide icons for premium look
 */
const Nav = {

  // ── Icon map (Lucide icon names) ────────────────────────────────────────────
  icons: {
    dashboard: 'layout-dashboard',
    cables:    'package',
    scan:      'scan-line',
    masters:   'settings-2',
    logs:      'activity',
    users:     'users',
  },

  // ── Nav item definitions ────────────────────────────────────────────────────
  items(userRole) {
    const isAdmin  = userRole === 'ADMIN'  || userRole === 'SUPER_ADMIN';
    const isSuper  = userRole === 'SUPER_ADMIN';
    return [
      { id:'dashboard', label:'Dashboard',       group:'Main'     },
      { id:'cables',    label:'Cable Inventory',  group:'Main'     },
      { id:'scan',      label:'Scan Operations',  group:'Main',    show: isAdmin },
      { id:'masters',   label:'Masters',           group:'Settings',show: isAdmin },
      { id:'logs',      label:'Activity Logs',     group:'Reports'  },
      { id:'users',     label:'User Management',   group:'Admin',   show: isSuper },
    ].filter(i => i.show !== false);
  },

  // ── Build icon SVG element ──────────────────────────────────────────────────
  _icon(name, size = 18) {
    return `<i data-lucide="${name}" style="width:${size}px;height:${size}px;" class="shrink-0"></i>`;
  },

  // ── Render sidebar ──────────────────────────────────────────────────────────
  renderSidebar(activeSection) {
    const user  = Auth.getUser();
    if (!user) return;
    const navItems = this.items(user.role);
    const container = document.getElementById('sidebar-content');
    if (!container) return;

    // Group items
    const grouped = {};
    navItems.forEach(item => {
      if (!grouped[item.group]) grouped[item.group] = [];
      grouped[item.group].push(item);
    });

    const groupOrder = ['Main','Settings','Reports','Admin'];

    container.innerHTML = groupOrder
      .filter(g => grouped[g])
      .map(group => `
        <div class="mb-2">
          <div class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-base-content/35">
            ${group}
          </div>
          ${grouped[group].map(item => this._sidebarItem(item, activeSection)).join('')}
        </div>`
      ).join('');

    // Activate Lucide icons
    if (window.lucide) lucide.createIcons({ nodes: [container] });
  },

  _sidebarItem(item, active) {
    const isActive = item.id === active;
    return `
    <button
      onclick="App.navigateTo('${item.id}')"
      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
             transition-all duration-150 mb-0.5 text-left
             ${isActive
               ? 'bg-primary/10 text-primary font-semibold'
               : 'text-base-content/70 hover:bg-base-200 hover:text-base-content font-medium'}"
      id="nav-${item.id}">
      ${this._icon(this.icons[item.id])}
      <span>${item.label}</span>
      ${isActive ? '<span class="ml-auto w-1.5 h-1.5 rounded-full bg-primary"></span>' : ''}
    </button>`;
  },

  // ── Render mobile bottom nav ────────────────────────────────────────────────
  renderBottomNav(activeSection) {
    const user = Auth.getUser();
    if (!user) return;
    const navItems = this.items(user.role);
    const container = document.getElementById('bottom-nav-content');
    if (!container) return;

    // Show max 5 items on bottom nav (most important ones)
    const priority = ['dashboard','cables','scan','logs','users','masters'];
    const visible  = priority.filter(id => navItems.find(i => i.id === id)).slice(0, 5);

    container.innerHTML = visible.map(id => {
      const item     = navItems.find(i => i.id === id);
      if (!item) return '';
      const isActive = id === activeSection;
      const shortLabels = {
        dashboard:'Home', cables:'Cables', scan:'Scan',
        masters:'Masters', logs:'Logs', users:'Users',
      };
      return `
      <button onclick="App.navigateTo('${id}')"
              class="flex flex-col items-center gap-0.5 text-[10px] font-medium
                     py-1 transition-colors
                     ${isActive ? 'text-primary border-t-2 border-primary' : 'text-base-content/50 border-t-2 border-transparent'}"
              id="btn-${id}">
        ${this._icon(this.icons[id], 20)}
        ${shortLabels[id] || item.label}
      </button>`;
    }).join('');

    if (window.lucide) lucide.createIcons({ nodes: [container] });
  },

  // ── Update active state (without re-rendering) ──────────────────────────────
  setActive(section) {
    this.renderSidebar(section);
    this.renderBottomNav(section);
  },
};
