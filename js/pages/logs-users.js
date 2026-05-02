/**
 * Activity Logs page — mobile 2-col rectangular grid + desktop table
 * Server-side pagination
 */
const LogsPage = {
  _logs:       [],
  _page:       1,
  _pageSize:   20,
  _total:      0,
  _totalPages: 1,
  _filters:    { action:'', cableNo:'', dateFrom:'', dateTo:'' },

  async render(container) {
    container.innerHTML = `<div class="flex items-center justify-center h-64">
      <span class="loading loading-spinner loading-lg text-indigo-600"></span></div>`;
    this._page = 1;
    await this._fetchPage(container, true);
  },

  async _fetchPage(container, buildShell = false) {
    try {
      const params = {
        page:     this._page,
        pageSize: this._pageSize,
        ...(this._filters.action   ? { action:   this._filters.action   } : {}),
        ...(this._filters.cableNo  ? { cableNo:  this._filters.cableNo  } : {}),
        ...(this._filters.dateFrom ? { dateFrom: this._filters.dateFrom } : {}),
        ...(this._filters.dateTo   ? { dateTo:   this._filters.dateTo   } : {}),
      };
      const res = await API.getLogs(params);
      this._logs       = res.data       || [];
      this._total      = res.total      || 0;
      this._totalPages = res.totalPages || 1;
      this._page       = res.page       || 1;
      this._pageSize   = res.pageSize   || this._pageSize;
    } catch(err) {
      if (buildShell) {
        container.innerHTML = `
          <div class="alert alert-error gap-3">
            <i data-lucide="wifi-off" class="w-5 h-5 shrink-0"></i>
            <span>${Helpers.escape(err.message)}</span>
          </div>`;
        if (window.lucide && container) lucide.createIcons({ nodes: [container] });
      } else {
        Toast.show('error','Load Error', err.message);
      }
      return;
    }

    if (buildShell) {
      container.innerHTML = `
      <div class="space-y-4 page-enter">
        ${UI.pageHeader('Activity Logs',
          `<span id="logs-total-count">${this._total}</span> transactions`,
          `<button class="btn btn-ghost btn-sm gap-2" onclick="LogsPage.exportCSV()">
            <i data-lucide="download" class="w-4 h-4"></i>
            <span class="hidden sm:inline">Export</span>
          </button>`
        )}

        <!-- Filter bar -->
        <div class="card bg-white shadow-sm border border-slate-200">
          <div class="card-body py-3 px-4">
            <div class="grid grid-cols-2 sm:flex gap-2 flex-wrap">
              <label class="input input-bordered input-sm flex items-center gap-2 col-span-2 sm:flex-1">
                <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                <input type="text" id="log-cable" class="grow text-sm" placeholder="Search NO / Cable No / QR…"
                  oninput="LogsPage._onFilter()" />
              </label>
              <select id="log-action"
                class="select select-bordered select-sm flex-1 min-w-36"
                onchange="LogsPage._onFilter()">
                <option value="">All Actions</option>
                <option value="ACTIVATE">Activate</option>
                <option value="SEND_TO_SITE">Send to Site</option>
                <option value="RETURN_TO_GODOWN">Return to Godown</option>
              </select>
              <input type="date" id="log-date-from" class="input input-bordered input-sm flex-1 min-w-32"
                onchange="LogsPage._onFilter()" title="From date" />
              <input type="date" id="log-date-to" class="input input-bordered input-sm flex-1 min-w-32"
                onchange="LogsPage._onFilter()" title="To date" />
              <button class="btn btn-ghost btn-sm gap-1.5 col-span-2 sm:col-span-1"
                onclick="LogsPage._clearFilters()">
                <i data-lucide="filter-x" class="w-3.5 h-3.5"></i>
                <span class="text-xs">Clear</span>
              </button>
            </div>
          </div>
        </div>

        <!-- MOBILE: 2-col rectangular grid (hidden on lg) -->
        <div id="logs-cards" class="lg:hidden grid grid-cols-2 gap-3"></div>

        <!-- DESKTOP: table (hidden on mobile) -->
        <div class="hidden lg:block card bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="table table-sm table-zebra">
              <thead class="bg-slate-100 text-xs uppercase tracking-wide">
                <tr>
                  <th>#</th>
                  <th>Date / Time</th>
                  <th>Cable No</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Site / Note</th>
                </tr>
              </thead>
              <tbody id="logs-body"></tbody>
            </table>
          </div>
          <div id="logs-pagination-desktop" class="px-4 pb-3"></div>
        </div>

        <!-- Mobile pagination -->
        <div id="logs-pagination-mobile" class="lg:hidden"></div>
      </div>`;
    } else {
      const el = document.getElementById('logs-total-count');
      if (el) el.textContent = this._total;
    }

    this._renderGrid();
    this._renderTable();
    this._renderPagination();
    if (window.lucide) lucide.createIcons({ nodes: [container || document.getElementById('main-content')] });
  },

  // ── Mobile 2-col rectangular grid ─────────────────────────────────────────
  _renderGrid() {
    const wrap = document.getElementById('logs-cards');
    if (!wrap) return;

    if (!this._logs.length) {
      wrap.innerHTML = `
        <div class="col-span-2 bg-white border border-slate-200 rounded-xl">
          ${UI.emptyState('activity','No activity yet','QR operations will appear here')}
        </div>`;
      if (window.lucide) lucide.createIcons({ nodes: [wrap] });
      return;
    }

    const meta = {
      ACTIVATE:         { icon:'check-circle', bg:'bg-indigo-100',  text:'text-indigo-600', badge:'badge-primary', label:'Activate' },
      SEND_TO_SITE:     { icon:'truck',         bg:'bg-amber-100',  text:'text-amber-600', badge:'badge-warning', label:'Send'     },
      RETURN_TO_GODOWN: { icon:'warehouse',     bg:'bg-emerald-100',  text:'text-emerald-600', badge:'badge-success', label:'Return'   },
    };

    wrap.innerHTML = this._logs.map(l => {
      const m = meta[l.action] || { icon:'circle', bg:'bg-slate-100', text:'text-slate-400', badge:'badge-ghost', label:l.action };
      return `
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">

        <!-- Coloured header strip -->
        <div class="${m.bg} border-b border-slate-200 px-2.5 py-2 flex items-center gap-2">
          <i data-lucide="${m.icon}" class="w-4 h-4 ${m.text} shrink-0"></i>
          <span class="badge ${m.badge} badge-xs font-bold">${m.label}</span>
        </div>

        <!-- Cable info -->
        <div class="px-2.5 py-2.5 flex-1 space-y-1">
          <div class="font-bold text-sm truncate leading-tight">${Helpers.escape(l.cableNo)}</div>
          <div class="flex items-center gap-1 text-[10px] text-slate-500">
            <i data-lucide="user" class="w-2.5 h-2.5 shrink-0"></i>
            <span class="truncate">${Helpers.escape(l.user||'—')}</span>
          </div>
          ${l.siteName||l.note ? `
          <div class="flex items-center gap-1 text-[10px] text-slate-400">
            <i data-lucide="map-pin" class="w-2.5 h-2.5 shrink-0"></i>
            <span class="truncate">${Helpers.escape(l.siteName||l.note)}</span>
          </div>` : ''}
          <div class="text-[10px] text-slate-400">${Helpers.timeAgo(l.timestamp)}</div>
        </div>

        <!-- Timestamp footer -->
        <div class="border-t border-base-100 px-2.5 py-1.5">
          <span class="text-[10px] font-mono text-slate-300">${Helpers.formatDateTime(l.timestamp)}</span>
        </div>
      </div>`;
    }).join('');

    if (window.lucide) lucide.createIcons({ nodes: [wrap] });
  },

  // ── Desktop table ─────────────────────────────────────────────────────────
  _renderTable() {
    const body = document.getElementById('logs-body');
    if (!body) return;
    const rowStart = (this._page - 1) * this._pageSize;
    if (!this._logs.length) {
      body.innerHTML = `<tr><td colspan="6">${UI.emptyState('activity','No activity yet','QR operations will appear here')}</td></tr>`;
      if (window.lucide) lucide.createIcons({ nodes: [body] });
      return;
    }
    body.innerHTML = this._logs.map((l, i) => `
    <tr class="hover">
      <td class="text-slate-400 text-xs">${rowStart+i+1}</td>
      <td class="text-xs whitespace-nowrap">${Helpers.formatDateTime(l.timestamp)}</td>
      <td class="text-sm">
        <div class="flex items-center gap-2">
          ${l.no ? `<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-white text-slate-900 font-black text-[11px] border border-slate-200 shadow-sm min-w-[24px] justify-center">${Helpers.escape(l.no)}</span>` : ''}
          <div class="font-black text-slate-800 text-[14px] tracking-tight uppercase">${Helpers.escape(l.cableNo)}</div>
        </div>
      </td>
      <td>${UI.actionBadge(l.action)}</td>
      <td class="text-sm">${Helpers.escape(l.user||'—')}</td>
      <td class="text-sm text-slate-500 max-w-[160px] truncate">
        ${Helpers.escape(l.note||l.siteName||'—')}
      </td>
    </tr>`).join('');
  },

  _renderPagination() {
    const opts = {
      current: this._page, totalPages: this._totalPages,
      total: this._total, pageSize: this._pageSize,
      onPage: 'LogsPage.goToPage', onSize: 'LogsPage.setPageSize',
    };
    const d = document.getElementById('logs-pagination-desktop');
    const m = document.getElementById('logs-pagination-mobile');
    if (d) d.innerHTML = UI.pagination(opts);
    if (m) m.innerHTML = UI.pagination(opts);
  },

  _filterTimer: null,
  _onFilter() {
    this._filters = {
      action:   document.getElementById('log-action')?.value    || '',
      cableNo:  document.getElementById('log-cable')?.value?.trim() || '',
      dateFrom: document.getElementById('log-date-from')?.value || '',
      dateTo:   document.getElementById('log-date-to')?.value   || '',
    };
    this._page = 1;
    clearTimeout(this._filterTimer);
    this._filterTimer = setTimeout(() => this._fetchPage(null, false), 300);
  },

  _clearFilters() {
    this._filters = { action:'', cableNo:'', dateFrom:'', dateTo:'' };
    this._page = 1;
    const ac = document.getElementById('log-action');
    const cn = document.getElementById('log-cable');
    const df = document.getElementById('log-date-from');
    const dt = document.getElementById('log-date-to');
    if (ac) ac.value = '';
    if (cn) cn.value = '';
    if (df) df.value = '';
    if (dt) dt.value = '';
    this._fetchPage(null, false);
  },

  async goToPage(page) {
    this._page = page;
    Loading.show();
    await this._fetchPage(null, false);
    Loading.hide();
    window.scrollTo({ top:0, behavior:'smooth' });
  },

  async setPageSize(size) {
    this._pageSize = size; this._page = 1;
    Loading.show();
    await this._fetchPage(null, false);
    Loading.hide();
  },

  async exportCSV() {
    if (!this._total) { Toast.show('warning','No Data','No logs to export.'); return; }
    Loading.show('Preparing export…');
    try {
      const res = await API.getLogs({ pageSize:9999, page:1 });
      Loading.hide();
      if (res.data?.length) {
        Helpers.downloadCSV(res.data, `logs_${new Date().toISOString().slice(0,10)}.csv`);
        Toast.show('success','Exported',`${res.data.length} logs downloaded.`);
      }
    } catch(err) { Loading.hide(); Toast.show('error','Export Error', err.message); }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * User Management page — mobile 2-col rectangular grid + desktop table
 * Client-side pagination
 */
const UsersPage = {
  _users:    [],
  _page:     1,
  _pageSize: 10,

  async render(container) {
    if (!Auth.canManageUsers()) {
      container.innerHTML = UI.emptyState('lock','Access Denied','Super Admin required.');
      if (window.lucide && container) lucide.createIcons({ nodes: [container] });
      return;
    }
    container.innerHTML = `<div class="flex items-center justify-center h-40">
      <span class="loading loading-spinner loading-lg text-indigo-600"></span></div>`;

    try {
      const res = await API.getUsers();
      this._users = res.data || [];
    } catch(err) {
      container.innerHTML = `<div class="alert alert-error gap-3">
        <i data-lucide="wifi-off" class="w-5 h-5"></i>
        <span>${Helpers.escape(err.message)}</span></div>`;
      if (window.lucide && container) lucide.createIcons({ nodes: [container] });
      return;
    }
    this._page = 1;

    container.innerHTML = `
    <div class="space-y-4 page-enter">
      ${UI.pageHeader('User Management',
        `${this._users.length} users`,
        `<button class="btn btn-primary btn-sm gap-2" onclick="UsersPage.openAdd()">
          <i data-lucide="user-plus" class="w-4 h-4"></i>
          <span class="hidden sm:inline">Add User</span>
        </button>`
      )}

      <!-- MOBILE: 2-col rectangular grid (hidden on sm+) -->
      <div id="users-cards" class="sm:hidden grid grid-cols-2 gap-3"></div>

      <!-- DESKTOP: table (hidden on mobile) -->
      <div class="hidden sm:block card bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-sm table-zebra">
            <thead class="bg-slate-100 text-xs uppercase tracking-wide">
              <tr>
                <th>#</th><th>Username</th><th>Full Name</th><th>Role</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="users-body"></tbody>
          </table>
        </div>
        <div id="users-pagination" class="px-4 pb-3"></div>
      </div>

      <!-- Mobile pagination -->
      <div id="users-pagination-mobile" class="sm:hidden"></div>
    </div>

    <!-- User Modal -->
    <dialog id="modal-user" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box w-full max-w-md">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </form>
        <h3 id="modal-user-title" class="font-bold text-lg mb-5">Add User</h3>
        <form id="form-user" onsubmit="UsersPage.save(event)">
          <input type="hidden" id="u-id" />
          <div class="space-y-3">
            ${UI.field('Full Name',
              `<label class="input input-bordered flex items-center gap-2">
                <i data-lucide="user" class="w-4 h-4 text-slate-400 shrink-0"></i>
                <input type="text" id="u-name" class="grow" placeholder="John Doe" required />
              </label>`, true)}
            ${UI.field('Username',
              `<label class="input input-bordered flex items-center gap-2">
                <i data-lucide="at-sign" class="w-4 h-4 text-slate-400 shrink-0"></i>
                <input type="text" id="u-username" class="grow" placeholder="john_doe" required autocomplete="off" />
              </label>`, true)}
            ${UI.field('Password',
              `<label class="input input-bordered flex items-center gap-2">
                <i data-lucide="lock" class="w-4 h-4 text-slate-400 shrink-0"></i>
                <input type="password" id="u-password" class="grow" placeholder="Password" autocomplete="new-password" />
              </label>
              <label class="label pt-1">
                <span id="u-pwd-hint" class="label-text-alt text-slate-400">Required for new user</span>
              </label>`)}
            ${UI.field('Role',
              `<select id="u-role" class="select select-bordered w-full" required>
                <option value="">Select Role…</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>`, true)}
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" onclick="Modal.close('modal-user')">Cancel</button>
            <button type="submit" id="btn-save-user" class="btn btn-primary gap-2">
              <i data-lucide="save" class="w-4 h-4"></i> Save User
            </button>
          </div>
        </form>
      </div>
    </dialog>`;

    this._renderAll();
    if (window.lucide && container) lucide.createIcons({ nodes: [container] });
  },

  _renderAll() {
    this._renderGrid();
    this._renderTable();
    this._renderPagination();
  },

  _slice() {
    const start = (this._page - 1) * this._pageSize;
    return this._users.slice(start, start + this._pageSize);
  },

  // ── Mobile 2-col rectangular grid ─────────────────────────────────────────
  _renderGrid() {
    const wrap = document.getElementById('users-cards');
    if (!wrap) return;
    const me    = Auth.getUser();
    const paged = this._slice();

    if (!paged.length) {
      wrap.innerHTML = `<div class="col-span-2 bg-white border border-slate-200 rounded-xl">
        ${UI.emptyState('users','No users found')}</div>`;
      if (window.lucide) lucide.createIcons({ nodes: [wrap] });
      return;
    }

    wrap.innerHTML = paged.map(u => {
      const initials = (u.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const isSelf   = u.username === me?.username;
      return `
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">

        <!-- Avatar header -->
        <div class="bg-indigo-50 border-b border-slate-200 px-2.5 py-3 flex flex-col items-center gap-1.5">
          <div class="avatar placeholder">
            <div class="bg-primary text-indigo-600-content rounded-xl w-10">
              <span class="text-sm font-bold">${initials}</span>
            </div>
          </div>
          ${Helpers.roleBadge(u.role)}
        </div>

        <!-- Name / username -->
        <div class="px-2.5 py-2 flex-1 min-w-0 space-y-0.5">
          <div class="font-bold text-sm truncate">${Helpers.escape(u.name)}</div>
          <div class="text-[10px] font-mono text-slate-400 truncate">@${Helpers.escape(u.username)}</div>
          ${isSelf ? `<span class="badge badge-outline badge-xs text-[9px]">You</span>` : ''}
        </div>

        <!-- Actions -->
        <div class="border-t border-base-100 grid ${isSelf?'grid-cols-1':'grid-cols-2'} divide-x divide-base-100">
          <button class="py-2 flex items-center justify-center gap-1 text-[11px] font-medium
            text-slate-500 hover:bg-white hover:text-indigo-600 transition-colors"
            onclick="UsersPage.openEdit('${u.id}')">
            <i data-lucide="pencil" class="w-3 h-3"></i> Edit
          </button>
          ${!isSelf ? `
          <button class="py-2 flex items-center justify-center gap-1 text-[11px] font-medium
            text-slate-500 hover:bg-white hover:text-red-600 transition-colors"
            onclick="UsersPage.delete('${u.id}','${Helpers.escape(u.username)}')">
            <i data-lucide="trash-2" class="w-3 h-3"></i> Del
          </button>` : ''}
        </div>
      </div>`;
    }).join('');

    if (window.lucide) lucide.createIcons({ nodes: [wrap] });
  },

  // ── Desktop table ─────────────────────────────────────────────────────────
  _renderTable() {
    const body = document.getElementById('users-body');
    if (!body) return;
    const me    = Auth.getUser();
    const paged = this._slice();
    const start = (this._page - 1) * this._pageSize;

    if (!paged.length) {
      body.innerHTML = `<tr><td colspan="5">${UI.emptyState('users','No users found')}</td></tr>`;
      if (window.lucide) lucide.createIcons({ nodes: [body] });
      return;
    }
    body.innerHTML = paged.map((u,i) => {
      const initials = (u.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const isSelf   = u.username === me?.username;
      return `
      <tr class="hover group">
        <td class="text-slate-400 text-xs">${start+i+1}</td>
        <td>
          <div class="flex items-center gap-2">
            <div class="avatar placeholder">
              <div class="bg-indigo-100 text-indigo-600 rounded-full w-8">
                <span class="text-xs font-bold">${initials}</span>
              </div>
            </div>
            <span class="font-mono font-semibold text-sm">${Helpers.escape(u.username)}</span>
          </div>
        </td>
        <td class="text-sm">${Helpers.escape(u.name)}</td>
        <td>${Helpers.roleBadge(u.role)}</td>
        <td>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="btn btn-ghost btn-xs btn-square" title="Edit"
              onclick="UsersPage.openEdit('${u.id}')">
              <i data-lucide="pencil" class="w-4 h-4"></i>
            </button>
            ${!isSelf ? `
            <button class="btn btn-ghost btn-xs btn-square text-red-600" title="Delete"
              onclick="UsersPage.delete('${u.id}','${Helpers.escape(u.username)}')">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>` : `<span class="badge badge-outline badge-xs">You</span>`}
          </div>
        </td>
      </tr>`;
    }).join('');
    if (window.lucide) lucide.createIcons({ nodes: [body] });
  },

  _renderPagination() {
    const totalPages = Math.ceil(this._users.length / this._pageSize) || 1;
    const opts = {
      current: this._page, totalPages, total: this._users.length,
      pageSize: this._pageSize,
      onPage: 'UsersPage.goToPage', onSize: 'UsersPage.setPageSize',
    };
    const d = document.getElementById('users-pagination');
    const m = document.getElementById('users-pagination-mobile');
    if (d) d.innerHTML = UI.pagination(opts);
    if (m) m.innerHTML = UI.pagination(opts);
  },

  goToPage(page)  { this._page = page; this._renderAll(); },
  setPageSize(sz) { this._pageSize = sz; this._page = 1; this._renderAll(); },

  openAdd() {
    document.getElementById('modal-user-title').textContent = 'Add New User';
    document.getElementById('u-id').value = '';
    document.getElementById('form-user').reset();
    document.getElementById('u-pwd-hint').textContent = 'Required for new user';
    document.getElementById('u-password').required = true;
    Modal.open('modal-user');
    if (window.lucide) lucide.createIcons({ nodes: [document.getElementById('modal-user')] });
  },

  openEdit(id) {
    const u = this._users.find(u => String(u.id) === String(id));
    if (!u) return;
    document.getElementById('modal-user-title').textContent = 'Edit User';
    document.getElementById('u-id').value       = u.id;
    document.getElementById('u-name').value     = u.name;
    document.getElementById('u-username').value = u.username;
    document.getElementById('u-password').value = '';
    document.getElementById('u-role').value     = u.role;
    document.getElementById('u-pwd-hint').textContent = 'Leave blank to keep current password';
    document.getElementById('u-password').required = false;
    Modal.open('modal-user');
    if (window.lucide) lucide.createIcons({ nodes: [document.getElementById('modal-user')] });
  },

  async save(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-user');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';
    const id   = document.getElementById('u-id').value;
    const data = {
      name:     document.getElementById('u-name').value.trim(),
      username: document.getElementById('u-username').value.trim(),
      role:     document.getElementById('u-role').value,
    };
    const pwd = document.getElementById('u-password').value.trim();
    if (pwd) data.password = pwd;
    try {
      const res = id ? await API.updateUser(id, data) : await API.addUser({ ...data, password: pwd });
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Save User';
      if (window.lucide) lucide.createIcons({ nodes: [btn.parentElement] });
      if (res.success) {
        Toast.show('success', id ? 'User Updated' : 'User Added', data.username);
        Modal.close('modal-user');
        await this.render(document.getElementById('main-content'));
      } else { Toast.show('error','Failed', res.message); }
    } catch(err) {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Save User';
      Toast.show('error','Error', err.message);
    }
  },

  async delete(id, username) {
    if (!confirm(`Delete user "${username}"?\nThis cannot be undone.`)) return;
    try {
      const res = await API.deleteUser(id);
      if (res.success) {
        Toast.show('success','User Deleted', username);
        await this.render(document.getElementById('main-content'));
      } else { Toast.show('error','Failed', res.message); }
    } catch(err) { Toast.show('error','Error', err.message); }
  },
};
