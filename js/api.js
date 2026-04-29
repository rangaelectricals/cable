/**
 * CABLE MANAGEMENT SYSTEM — API Module
 *
 * WHY ALL-GET?
 * Google Apps Script Web Apps redirect POST requests (302), which causes
 * browsers to convert POST → GET and drop the body, making `action` undefined.
 * Using GET with all params in the URL query string avoids this entirely and
 * also avoids CORS preflight (no custom headers needed).
 */

const API = (() => {

  // ── CACHE ─────────────────────────────────────────────────────────────────
  const _cache = {};
  function _cached(k)       { const c = _cache[k]; return c && (Date.now()-c.ts < CONFIG.CACHE_TTL) ? c.data : null; }
  function _setCache(k, d)  { _cache[k] = { data: d, ts: Date.now() }; }
  function clearCache(k)    { if (k) delete _cache[k]; else Object.keys(_cache).forEach(x => delete _cache[x]); }

  // ── CORE REQUEST (all-GET, no custom headers → no CORS preflight) ─────────
  async function _get(action, params = {}, useCache = false) {
    const key = action + ':' + JSON.stringify(params);
    if (useCache) { const c = _cached(key); if (c) return c; }

    const url = new URL(CONFIG.API_BASE_URL);
    url.searchParams.set('action', action);

    // Flatten all params into URL query string
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    });

    const resp = await fetch(url.toString());
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

    const data = await resp.json();
    if (useCache) _setCache(key, data);
    return data;
  }

  // ── AUTH ──────────────────────────────────────────────────────────────────
  async function login(username, password) {
    return _get('login', { username, password });
  }

  // ── PRODUCTS ──────────────────────────────────────────────────────────────
  async function getProducts(filters = {}) {
    return _get('getProducts', filters, false);
  }

  async function addProduct(data) {
    const res = await _get('addProduct', data);
    clearCache();
    return res;
  }

  async function updateProduct(id, data) {
    const res = await _get('updateProduct', { id, ...data });
    clearCache();
    return res;
  }

  async function deleteProduct(id) {
    const res = await _get('deleteProduct', { id });
    clearCache();
    return res;
  }

  async function bulkAddProducts(rows) {
    // rows = array of { cableNo, category, core, sqmm, meter, quantity, remarks }
    const res = await _get('bulkAddProducts', { rows: JSON.stringify(rows) });
    clearCache();
    return res;
  }

  async function getStats() {
    return _get('getStats', {}, false);
  }

  // ── SCAN ──────────────────────────────────────────────────────────────────
  async function scanAction(action, barcode, extra = {}) {
    const user = Auth.getUser();
    const res  = await _get('scanAction', {
      action,
      barcode,
      user: user?.username || 'unknown',
      ...extra,
    });
    clearCache();
    return res;
  }

  // ── LOGS ──────────────────────────────────────────────────────────────────
  async function getLogs(params = {}) {
    // Accept legacy numeric argument (old callers passing limit as number)
    if (typeof params === 'number') params = { pageSize: params, page: 1 };
    return _get('getLogs', params);
  }

  // ── USERS ─────────────────────────────────────────────────────────────────
  async function getUsers() {
    return _get('getUsers', {});
  }

  async function addUser(data) {
    const res = await _get('addUser', data);
    clearCache();
    return res;
  }

  async function updateUser(id, data) {
    const res = await _get('updateUser', { id, ...data });
    clearCache();
    return res;
  }

  async function deleteUser(id) {
    const res = await _get('deleteUser', { id });
    clearCache();
    return res;
  }

  // ── MASTERS ───────────────────────────────────────────────────────────────
  async function getMasters(type) {
    return _get('getMasters', type ? { type } : {}, true);
  }

  async function addMaster(type, value, sortOrder) {
    const res = await _get('addMaster', { type, value, sortOrder: sortOrder || 999 });
    clearCache();
    return res;
  }

  async function updateMaster(id, value, sortOrder) {
    const params = { id };
    if (value     !== undefined) params.value     = value;
    if (sortOrder !== undefined) params.sortOrder = sortOrder;
    const res = await _get('updateMaster', params);
    clearCache();
    return res;
  }

  async function deleteMaster(id) {
    const res = await _get('deleteMaster', { id });
    clearCache();
    return res;
  }

  // ── PING ───────────────────────────────────────────────────────────────────
  async function ping() {
    return _get('ping');
  }

  return {
    clearCache, ping,
    login,
    getProducts, addProduct, updateProduct, deleteProduct, bulkAddProducts, getStats,
    scanAction,
    getLogs,
    getUsers, addUser, updateUser, deleteUser,
    getMasters, addMaster, updateMaster, deleteMaster,
  };
})();
