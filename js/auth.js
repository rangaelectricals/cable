/**
 * Authentication Module
 */
const Auth = (() => {

  function getSession() {
    try { const r = localStorage.getItem(CONFIG.SESSION_KEY); return r ? JSON.parse(r) : null; }
    catch { return null; }
  }

  function setSession(user) {
    const s = { id:user.id, username:user.username, name:user.name, role:user.role,
      token: btoa(`${user.username}:${Date.now()}`), loginAt: new Date().toISOString() };
    localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(s));
    return s;
  }

  function clearSession() { localStorage.removeItem(CONFIG.SESSION_KEY); }
  function isLoggedIn()   { const s = getSession(); return !!s?.token; }
  function getUser()      { return getSession(); }
  function getRole()      { return getSession()?.role || null; }

  // Role checks
  function isSuperAdmin()   { return getRole() === ROLES.SUPER_ADMIN; }
  function isAdmin()        { return getRole() === ROLES.ADMIN || isSuperAdmin(); }
  function canEdit()        { return isAdmin(); }
  function canDelete()      { return isSuperAdmin(); }
  function canScan()        { return isAdmin(); }
  function canManageUsers() { return isSuperAdmin(); }

  function logout() { clearSession(); window.location.href = 'login.html'; }

  function requireLogin() {
    if (!isLoggedIn()) { window.location.href = 'login.html'; return false; }
    return true;
  }

  function requireRole(minRole) {
    const order   = [ROLES.VIEWER, ROLES.ADMIN, ROLES.SUPER_ADMIN];
    const current = order.indexOf(getRole());
    const required= order.indexOf(minRole);
    if (current < required) {
      Toast.show('error','Access Denied','You do not have permission for this action.');
      return false;
    }
    return true;
  }

  return { getSession, setSession, clearSession, isLoggedIn, getUser, getRole,
    isSuperAdmin, isAdmin, canEdit, canDelete, canScan, canManageUsers,
    logout, requireLogin, requireRole };
})();
