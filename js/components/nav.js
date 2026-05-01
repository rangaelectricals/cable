/**
 * Navigation Component — Sidebar + Mobile Bottom Nav
 * Uses Lucide icons for premium look
 */
const Nav = {

  // ── Icon map (Lucide icon names) ────────────────────────────────────────────
  icons: {
    dashboard: 'layout-dashboard',
    cables:    'package',
    specs:     'layers',
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
      { id:'specs',     label:'Inventory by Spec',group:'Main'     },
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
    
    // Render desktop sidebar
    this._renderContainer('sidebar-content', navItems, activeSection);
  },

  _renderContainer(containerId, navItems, activeSection) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const grouped = {};
    navItems.forEach(item => {
      if (!grouped[item.group]) grouped[item.group] = [];
      grouped[item.group].push(item);
    });

    const groupOrder = ['Main','Settings','Reports','Admin'];

    container.innerHTML = '<ul class="flex flex-col list-none m-0 p-0">' + 
      groupOrder.filter(g => grouped[g]).map(group => `
        <div class="sidebar-divider mx-2 mt-4 mb-2 first:hidden"></div>
        <div class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-2 opacity-50">${group}</div>
        ${grouped[group].map(item => this._sidebarItem(item, activeSection)).join('')}
      `).join('') + '</ul>';

    if (window.lucide) lucide.createIcons({ nodes: [container] });
  },

  _sidebarItem(item, active) {
    const isActive = item.id === active;
    const activeClass = isActive ? 'active-link' : 'text-gray-400';
    return `
    <li>
      <button
        onclick="App.navigateTo('${item.id}')"
        class="nav-link w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-all ${activeClass}"
        id="nav-${item.id}">
        ${this._icon(this.icons[item.id], 20)}
        <span>${item.label}</span>
      </button>
    </li>`;
  },

  // ── Render mobile bottom nav ────────────────────────────────────────────────
  renderBottomNav(activeSection) {
    const user = Auth.getUser();
    if (!user) return;
    const navItems = this.items(user.role);
    const container = document.getElementById('bottom-nav-content');
    if (!container) return;

    // Show max 5 items on bottom nav
    const priority = ['dashboard','cables','specs','scan','logs'];
    const visible  = priority.filter(id => navItems.find(i => i.id === id)).slice(0, 5);

    // Calculate indicator position
    const activeIdx = visible.indexOf(activeSection);
    const indicator = document.getElementById('bottom-nav-indicator');
    if (indicator) {
      if (activeIdx >= 0) {
        indicator.style.width = `${100 / visible.length}%`;
        indicator.style.left = `${(100 / visible.length) * activeIdx}%`;
        indicator.style.opacity = '1';
      } else {
        indicator.style.opacity = '0';
      }
    }

    container.innerHTML = visible.map(id => {
      const item     = navItems.find(i => i.id === id);
      if (!item) return '';
      const isActive = id === activeSection;
      const shortLabels = {
        dashboard: 'Home', cables: 'Cables', specs: 'Specs',
        scan: 'Scan', masters: 'Masters', logs: 'Logs', users: 'Users',
      };
      
      const activeClasses = isActive 
        ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]' 
        : 'text-slate-500 hover:text-slate-300';
        
      const textClasses = isActive
        ? 'opacity-100 max-h-[20px] text-indigo-400 font-bold'
        : 'opacity-0 max-h-0 overflow-hidden';

      return `
      <button onclick="App.navigateTo('${id}')"
              class="relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 group"
              id="btn-${id}">
        <div class="transition-all duration-300 transform ${activeClasses}">
          ${this._icon(this.icons[id], 24)}
        </div>
        <span class="text-[10px] mt-1 transition-all duration-300 ${textClasses}">
          ${shortLabels[id] || item.label}
        </span>
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
