/**
 * CABLE MANAGEMENT SYSTEM — Local In-Memory API Module
 * 
 * Re-architected to match 'vendor-outstanding' instant-sync logic.
 * The database is loaded ONCE on app load, and all subsequent operations
 * read from and write to local memory instantly (0.0s), while sending 
 * 'fire-and-forget' background updates to Google Sheets.
 */

window.AppDB = {
  products: [],
  logs: [],
  users: [],
  masters: [],
  isLoaded: false
};

const API = (() => {

  // ── BACKGROUND SYNC ────────────────────────────────────────────────────────
  function _bgFetch(action, params = {}) {
    const url = new URL(CONFIG.API_BASE_URL);
    
    // For bulk uploads or large payloads, use POST to avoid URL length limits
    if (action === 'bulkAddProducts' || action === 'scanAction') {
      const formData = new FormData();
      formData.append('action', action);
      Object.entries(params).forEach(([k, v]) => {
        formData.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      });
      
      fetch(url.toString(), {
        method: 'POST',
        body: formData,
        mode: 'no-cors' // Use no-cors for fire-and-forget with Google Apps Script
      }).catch(err => console.error("Google Sheets Sync Error (POST):", err));
      return;
    }

    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    });
    // Fire and forget - do not await
    fetch(url.toString()).catch(err => console.error("Google Sheets Sync Error (GET):", err));
  }

  // ── INITIAL BOOT ──────────────────────────────────────────────────────────
  async function initDatabase() {
    if (window.AppDB.isLoaded) return true;
    
    const url = new URL(CONFIG.API_BASE_URL);
    url.searchParams.set('action', 'getData');
    
    try {
      const resp = await fetch(url.toString());
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const res = await resp.json();
      
      if (res.success && res.data) {
        window.AppDB.products = res.data.products || [];
        window.AppDB.logs = res.data.logs || [];
        window.AppDB.users = res.data.users || [];
        window.AppDB.masters = res.data.masters || [];
        
        // Sort logs descending by default
        window.AppDB.logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        window.AppDB.isLoaded = true;
        return true;
      }
    } catch(err) {
      console.error("Failed to init database:", err);
      throw err;
    }
  }

  // ── AUTH ──────────────────────────────────────────────────────────────────
  async function login(username, password) {
    await initDatabase();
    const user = window.AppDB.users.find(u => u.username === username && u.password === password);
    if (!user) return { success: false, message: 'Invalid credentials' };
    return { success: true, data: user };
  }

  // ── PRODUCTS ──────────────────────────────────────────────────────────────
  async function getProducts(filters = {}) {
    await initDatabase();
    let rows = [...window.AppDB.products];

    // Filtering
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(r => 
        (r.no && String(r.no).toLowerCase().includes(q)) ||
        (r.cableNo && r.cableNo.toLowerCase().includes(q)) ||
        (r.barcode && r.barcode.toLowerCase().includes(q)) ||
        (r.siteName && r.siteName.toLowerCase().includes(q)) ||
        (r.remarks && r.remarks.toLowerCase().includes(q))
      );
    }
    if (filters.status)   rows = rows.filter(r => r.status === filters.status);
    if (filters.category) rows = rows.filter(r => r.category === filters.category);
    if (filters.core)     rows = rows.filter(r => String(r.core) === String(filters.core));
    if (filters.sqmm)     rows = rows.filter(r => String(r.sqmm) === String(filters.sqmm));

    // Sorting
    const sortBy  = filters.sortBy  || 'createdAt';
    const sortDir = filters.sortDir || 'desc';
    
    rows.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      
      // Handle numeric values
      if (['meter', 'quantity', 'no'].includes(sortBy)) {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const total = rows.length;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const paged = rows.slice(start, start + pageSize);

    return { success: true, data: paged, total, page, pageSize, totalPages };
  }

  async function addProduct(data) {
    const newId = String(Date.now()) + Math.floor(Math.random()*1000);
    const newBarcode = 'CBL-' + Date.now() + '-' + Math.random().toString(36).substring(2,6).toUpperCase();
    
    const obj = {
      id: newId,
      cableNo: String(data.cableNo).trim(),
      barcode: newBarcode,
      category: data.category,
      core: data.core,
      sqmm: data.sqmm,
      meter: Number(data.meter) || 0,
      quantity: Number(data.quantity) || 1,
      status: 'IN_GODOWN',
      siteName: '',
      personAssigned: '',
      dateOut: '',
      dateIn: '',
      remarks: data.remarks || '',
      activated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    window.AppDB.products.unshift(obj);
    _bgFetch('addProduct', { ...data, id: newId, barcode: newBarcode });
    return { success: true, data: obj };
  }

  async function updateProduct(id, data) {
    const idx = window.AppDB.products.findIndex(p => String(p.id) === String(id));
    if (idx > -1) {
      window.AppDB.products[idx] = { ...window.AppDB.products[idx], ...data, updatedAt: new Date().toISOString() };
      _bgFetch('updateProduct', { id, ...data });
      return { success: true };
    }
    throw new Error("Product not found");
  }

  async function deleteProduct(id) {
    window.AppDB.products = window.AppDB.products.filter(p => String(p.id) !== String(id));
    _bgFetch('deleteProduct', { id });
    return { success: true };
  }

  async function bulkAddProducts(rows) {
    // Generate IDs for all rows and push locally
    rows.forEach(r => {
       const newId = String(Date.now()) + Math.floor(Math.random()*10000);
       const newBarcode = 'CBL-' + Date.now() + '-' + Math.random().toString(36).substring(2,6).toUpperCase();
       
       // Parse status field (default to IN_GODOWN if not provided)
       const status = r.status && String(r.status).trim() ? String(r.status).trim() : 'IN_GODOWN';
       
       // Parse boolean activated field (default to false)
       const activatedVal = r.activated && String(r.activated).toLowerCase().trim();
       const activated = activatedVal === 'true' || activatedVal === '1' || activatedVal === 'yes';
       
       window.AppDB.products.unshift({
          id: newId, 
          cableNo: String(r.cableNo).trim(), 
          barcode: newBarcode,
          no: r.no ? String(r.no).trim() : '',
          category: String(r.category).trim(), 
          core: String(r.core).trim(), 
          sqmm: String(r.sqmm).trim(), 
          meter: Number(r.meter) || 0,
          quantity: Number(r.quantity) || 1, 
          status: status, 
          siteName: r.siteName ? String(r.siteName).trim() : '', 
          personAssigned: r.personAssigned ? String(r.personAssigned).trim() : '', 
          dateOut: '', 
          dateIn: '', 
          remarks: r.remarks ? String(r.remarks).trim() : '', 
          activated: activated,
          createdAt: new Date().toISOString(), 
          updatedAt: new Date().toISOString()
       });
       r.id = newId; r.barcode = newBarcode;
    });
    _bgFetch('bulkAddProducts', { rows: JSON.stringify(rows) });
    return { success: true, data: { inserted: rows.length, skipped: 0, errors: [] } };
  }

  async function getStats() {
    await initDatabase();
    const products = window.AppDB.products;
    const godown = products.filter(p => p.status === 'IN_GODOWN').length;
    const site = products.filter(p => p.status === 'SENT_TO_SITE').length;
    return { success: true, data: { total: products.length, inGodown: godown, atSite: site } };
  }

  // ── SCAN ──────────────────────────────────────────────────────────────────
  async function scanAction(mode, barcode, extra = {}) {
    const user = Auth.getUser();
    const idx = window.AppDB.products.findIndex(p => p.barcode === barcode);
    if (idx === -1) throw new Error('Barcode not found in inventory.');
    
    const product = window.AppDB.products[idx];

    if (mode === 'ACTIVATE') {
      if (String(product.activated) === 'true' || product.activated === true) 
        throw new Error('Already activated. Duplicate activation is not allowed.');
      product.activated = true;
      product.status = 'IN_GODOWN';
    } else if (mode === 'SEND_TO_SITE') {
      if (String(product.activated) !== 'true' && product.activated !== true) 
        throw new Error('Cable is not activated yet. Activate it first.');
      if (product.status !== 'IN_GODOWN') throw new Error('Cable is not in Godown.');
      if (!extra.siteName) throw new Error('Site name is required.');
      if (!extra.personAssigned) throw new Error('Person assigned is required.');
      product.status = 'SENT_TO_SITE';
      product.siteName = extra.siteName;
      product.personAssigned = extra.personAssigned;
      product.dateOut = new Date().toISOString();
      product.dateIn = '';
    } else if (mode === 'RETURN_TO_GODOWN') {
      if (product.status !== 'SENT_TO_SITE') throw new Error('Cable is not at site.');
      product.status = 'IN_GODOWN';
      product.dateIn = new Date().toISOString();
      product.dateOut = '';
      if (extra.meterBalance !== undefined && extra.meterBalance !== '') {
        product.meter = Number(extra.meterBalance);
      }
      product.siteName = '';
      product.personAssigned = '';
    } else if (mode === 'SITE_TO_SITE') {
      if (product.status !== 'SENT_TO_SITE') throw new Error('Cable must be at a site to transfer.');
      if (!extra.siteName) throw new Error('New Site name is required.');
      if (!extra.personAssigned) throw new Error('New Person assigned is required.');
      product.siteName = extra.siteName;
      product.personAssigned = extra.personAssigned;
      product.dateOut = new Date().toISOString();
    } else {
      throw new Error('Unknown scan action: ' + mode);
    }

    const logId = String(Date.now()) + Math.floor(Math.random()*1000);
    window.AppDB.logs.unshift({
      id: logId,
      barcode: barcode,
      cableNo: product.cableNo,
      action: mode.toUpperCase(),
      siteName: product.siteName,
      personAssigned: product.personAssigned,
      meter: product.meter,
      timestamp: new Date().toISOString(),
      user: user?.username || 'unknown',
      remarks: extra.remarks || ''
    });

    _bgFetch('scanAction', { mode, barcode, user: user?.username || 'unknown', ...extra });
    return { success: true, data: { message: 'Scan successful', product } };
  }

  // ── LOGS ──────────────────────────────────────────────────────────────────
  async function getLogs(params = {}) {
    await initDatabase();
    if (typeof params === 'number') params = { pageSize: params, page: 1 };
    
    let rows = window.AppDB.logs;
    
    // Date Range Filtering
    if (params.startDate) {
      const s = new Date(params.startDate);
      s.setHours(0,0,0,0);
      rows = rows.filter(r => new Date(r.timestamp) >= s);
    }
    if (params.endDate) {
      const e = new Date(params.endDate);
      e.setHours(23,59,59,999);
      rows = rows.filter(r => new Date(r.timestamp) <= e);
    }

    const total = rows.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 25;
    const start = (page - 1) * pageSize;
    return { success: true, data: rows.slice(start, start + pageSize), total, page, pageSize };
  }

  // ── USERS ─────────────────────────────────────────────────────────────────
  async function getUsers() {
    await initDatabase();
    return { success: true, data: window.AppDB.users };
  }

  async function addUser(data) {
    const newId = String(Date.now());
    const obj = { id: newId, ...data, createdAt: new Date().toISOString() };
    window.AppDB.users.push(obj);
    _bgFetch('addUser', { ...data, id: newId });
    return { success: true, data: obj };
  }

  async function updateUser(id, data) {
    const idx = window.AppDB.users.findIndex(u => String(u.id) === String(id));
    if (idx > -1) {
       window.AppDB.users[idx] = { ...window.AppDB.users[idx], ...data };
       _bgFetch('updateUser', { id, ...data });
       return { success: true };
    }
    throw new Error("User not found");
  }

  async function deleteUser(id) {
    window.AppDB.users = window.AppDB.users.filter(u => String(u.id) !== String(id));
    _bgFetch('deleteUser', { id });
    return { success: true };
  }

  // ── MASTERS ───────────────────────────────────────────────────────────────
  async function getMasters(type) {
    await initDatabase();
    let m = window.AppDB.masters;
    if (type) m = m.filter(x => x.type === type);
    m.sort((a,b) => Number(a.sortOrder) - Number(b.sortOrder));
    return { success: true, data: m };
  }

  async function addMaster(type, value, sortOrder) {
    const newId = String(Date.now());
    const obj = { id: newId, type, value, sortOrder: sortOrder || 999 };
    window.AppDB.masters.push(obj);
    _bgFetch('addMaster', { id: newId, type, value, sortOrder: sortOrder || 999 });
    return { success: true, data: obj };
  }

  async function updateMaster(id, value, sortOrder) {
    const idx = window.AppDB.masters.findIndex(m => String(m.id) === String(id));
    if (idx > -1) {
       if (value !== undefined) window.AppDB.masters[idx].value = value;
       if (sortOrder !== undefined) window.AppDB.masters[idx].sortOrder = sortOrder;
       _bgFetch('updateMaster', { id, value, sortOrder });
       return { success: true };
    }
    throw new Error("Master not found");
  }

  async function deleteMaster(id) {
    window.AppDB.masters = window.AppDB.masters.filter(m => String(m.id) !== String(id));
    _bgFetch('deleteMaster', { id });
    return { success: true };
  }

  async function ping() {
    return { success: true, data: 'pong' };
  }
  
  function clearCache() {
    // No-op for in-memory architecture
  }

  return {
    initDatabase, clearCache, ping,
    login,
    getProducts, addProduct, updateProduct, deleteProduct, bulkAddProducts, getStats,
    scanAction,
    getLogs,
    getUsers, addUser, updateUser, deleteUser,
    getMasters, addMaster, updateMaster, deleteMaster,
  };
})();
