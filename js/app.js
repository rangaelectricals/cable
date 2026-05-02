/**
 * App controller — init, navigation, auth guard
 */
const App = {
  _currentSection: null,

  async init() {
    if (!Auth.requireLogin()) return;
    const user = Auth.getUser();

    const hash = window.location.hash.slice(1) || 'dashboard';

    // Render sidebar + bottom nav
    Nav.renderSidebar(hash);
    Nav.renderBottomNav(hash);

    // Navigate to section
    await this.navigateTo(hash);

    // Listen to hash changes
    window.addEventListener('hashchange', () => {
      const section = window.location.hash.slice(1) || 'dashboard';
      if (this._currentSection !== section) {
        this.navigateTo(section);
      }
    });
  },

  async navigateTo(section) {
    this._currentSection = section;
    if (window.location.hash.slice(1) !== section) {
      window.location.hash = section;
    }

    // Close sidebar on mobile if it's visible
    const s = document.getElementById('sidebar');
    if (s && !s.classList.contains('hidden') && window.innerWidth < 768) {
      s.classList.add('hidden');
      s.classList.remove('flex', 'z-50', 'fixed', 'inset-y-0', 'left-0');
    }

    // Update nav active state
    Nav.setActive(section);

    const container = document.getElementById('main-content');
    container.innerHTML = UI.skeletonLoader();

    try {
      switch (section) {
        case 'dashboard': await DashboardPage.render(container); break;
        case 'cables':    await CablesPage.render(container);    break;
        case 'specs':     await SpecsPage.render(container);     break;
        case 'spec-details': await SpecDetailsPage.render(container); break;
        case 'scan':      await ScanPage.render(container);      break;
        case 'masters':   await MastersPage.render(container);   break;
        case 'logs':      await LogsPage.render(container);      break;
        case 'users':     await UsersPage.render(container);     break;
        default:
          container.innerHTML = UI.emptyState('construction','Coming Soon','This section is under development');
      }
    } catch(err) {
      console.error('[App.navigateTo]', err);
      container.innerHTML = `
        <div class="alert alert-error gap-3">
          <i data-lucide="alert-triangle" class="w-5 h-5 shrink-0"></i>
          <div>
            <p class="font-bold">Page Error</p>
            <p class="text-sm">${Helpers.escape(err.message)}</p>
          </div>
        </div>`;
    }

    // Always re-render Lucide icons after any page load
    if (window.lucide) lucide.createIcons();

    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'instant' });
  },

  globalSearch(e) {
    const q = (e.target.value || '').trim().toLowerCase();
    if (this._currentSection === 'cables') {
      const inp = document.getElementById('cable-search');
      if (inp) {
        inp.value = q;
        CablesPage._filters.search = q;
        CablesPage._renderFiltered();
      }
    } else {
      localStorage.setItem('global_search_term', q);
      this.navigateTo('cables');
    }
  },

  toggleSidebar() {
    const s = document.getElementById('sidebar');
    if (!s) return;
    if (s.classList.contains('hidden')) {
      s.classList.remove('hidden');
      s.classList.add('flex', 'z-50', 'fixed', 'inset-y-0', 'left-0');
    } else {
      s.classList.add('hidden');
      s.classList.remove('flex', 'z-50', 'fixed', 'inset-y-0', 'left-0');
    }
  },

  openHelp() {
    Modal.open('modal-help');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
