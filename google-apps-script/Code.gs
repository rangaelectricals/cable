/**
 * ============================================================
 * CABLE MANAGEMENT SYSTEM — Google Apps Script Backend
 * ============================================================
 * Deploy as: Web App → Execute as: Me → Access: Anyone
 *
 * ✅ SELF-INITIALIZING: Sheets are created automatically on the
 *    very first API call. No manual setup step required.
 *
 * STATUS MODEL:
 *   IN_GODOWN    = Cable is at the godown (home/store location)
 *   SENT_TO_SITE = Cable is currently at a site
 *
 * WORKFLOW:
 *   ACTIVATE         → status = IN_GODOWN  (once per barcode)
 *   SEND_TO_SITE     → IN_GODOWN → SENT_TO_SITE
 *   RETURN_TO_GODOWN → SENT_TO_SITE → IN_GODOWN
 * ============================================================
 */

// ── SHEET NAMES ───────────────────────────────────────────────────────────────
var SHEET_NAMES = {
  USERS:        'USERS',
  PRODUCTS:     'PRODUCTS',
  TRANSACTIONS: 'TRANSACTIONS',
  SCAN_LOG:     'SCAN_LOG',
  MASTERS:      'MASTERS',
};

// ── SHEET COLUMN DEFINITIONS ──────────────────────────────────────────────────
// Order matters — it defines the column layout in the spreadsheet
var SHEET_HEADERS = {
  USERS:        ['id','username','password','role','name'],
  PRODUCTS:     ['id','no','cableNo','barcode','category','core','sqmm','meter','quantity',
                 'status','siteName','personAssigned','dateOut','dateIn',
                 'remarks','activated','createdAt','updatedAt'],
  TRANSACTIONS: ['id','no','barcode','action','cableNo','user','timestamp','note','siteName','personAssigned'],
  SCAN_LOG:     ['barcode','action','timestamp'],
  MASTERS:      ['id','type','value','sortOrder','createdAt'],
};

// ── RESPONSE HELPERS ──────────────────────────────────────────────────────────
function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function _ok(data, extra)  { return _json({ success: true,  data: data || null, ...(extra || {}) }); }
function _err(message)     { return _json({ success: false, message: message }); }

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-INITIALIZING SHEET ACCESS
// getSheet(name) always returns a valid sheet object:
//   • If the sheet exists → returns it
//   • If it does NOT exist → creates it, writes the header row, formats it,
//     then returns the new sheet
// ─────────────────────────────────────────────────────────────────────────────
function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);

  // If exact match fails, try case-insensitive search to prevent duplicates
  if (!sheet) {
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().trim().toUpperCase() === name.toUpperCase()) {
        return sheets[i];
      }
    }

    // Truly missing? Create it and initialize
    sheet = ss.insertSheet(name);
    _initSheetHeaders(sheet, name);

    if (name === SHEET_NAMES.USERS)   _seedDefaultAdmin(sheet);
    if (name === SHEET_NAMES.MASTERS) _seedDefaultMasters(sheet);
    
    // Clean up: If we just created the first system sheet and "Sheet1" is empty, remove "Sheet1"
    var sheet1 = ss.getSheetByName('Sheet1');
    if (sheet1 && sheet1.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(sheet1);
    }
  }

  return sheet;
}

/**
 * Write and format the header row for a sheet.
 */
function _initSheetHeaders(sheet, name) {
  var headers = SHEET_HEADERS[name];
  if (!headers || headers.length === 0) return;

  var range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setFontWeight('bold')
       .setBackground('#1e40af')
       .setFontColor('#ffffff')
       .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  // Auto-resize each column for readability
  for (var i = 1; i <= headers.length; i++) {
    sheet.setColumnWidth(i, 140);
  }
}

/**
 * Seed one default Super Admin user so the system is usable immediately.
 * Change the password after first login!
 */
function _seedDefaultAdmin(sheet) {
  var now = new Date().toISOString();
  sheet.appendRow([
    String(Date.now()),  // id
    'admin',             // username
    'admin123',          // password  ← CHANGE THIS AFTER FIRST LOGIN
    'SUPER_ADMIN',       // role
    'Super Administrator'// name
  ]);
}

// ── SHEET DATA HELPERS ────────────────────────────────────────────────────────

/** Convert all sheet rows (excluding header) to an array of plain objects. */
function sheetToObjects(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  var values  = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(String);

  return values.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      obj[h] = row[i] !== undefined ? row[i] : '';
    });
    return obj;
  });
}

/** Get the header row of a sheet. */
function _getHeaders(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
}

/** Map an object to an ordered row array matching the sheet headers. */
function _objectToRow(headers, obj) {
  return headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
}

/** Append a new row to a sheet from an object. */
function appendObject(sheetName, obj) {
  var sheet   = getSheet(sheetName);
  var headers = SHEET_HEADERS[sheetName] || _getHeaders(sheet);
  sheet.appendRow(_objectToRow(headers, obj));
}

/** Update a row by its 'id' column value. Returns true if found. */
function updateById(sheetName, id, updates) {
  var sheet   = getSheet(sheetName);
  var values  = sheet.getDataRange().getValues();
  if (values.length < 2) return false;

  var headers = values[0].map(String);
  var idCol   = headers.indexOf('id');
  if (idCol < 0) return false;

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      var row = values[i];
      headers.forEach(function(h, ci) {
        if (h in updates) row[ci] = updates[h];
      });
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return true;
    }
  }
  return false;
}

/** Delete a row by its 'id' column value. Returns true if found. */
function deleteById(sheetName, id) {
  var sheet   = getSheet(sheetName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return false;

  var values  = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(String);
  var idCol   = headers.indexOf('id');
  if (idCol < 0) return false;

  // Iterate bottom-up so row deletion doesn't shift indices
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

/** Generate a unique barcode string. */
function _generateBarcode() {
  var rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return 'CBL-' + Date.now() + '-' + rand;
}

// ── HTTP ENTRY POINTS ─────────────────────────────────────────────────────────
// ALL requests come in as GET (params in URL query string).
// This avoids the GAS POST-redirect issue where the browser converts
// POST → GET after a 302 redirect, dropping the body and losing `action`.
function doGet(e) {
  try {
    var action = e.parameter.action;
    if (!action) return _err('action parameter is required.');
    return dispatch(action, e.parameter);
  } catch(err) {
    return _err('Server error: ' + err.message);
  }
}

// Keep doPost for any direct POST clients, but forward everything to doGet logic.
function doPost(e) {
  try {
    var action;
    var params = {};

    // First try URL query params (most reliable)
    if (e.parameter && e.parameter.action) {
      action = e.parameter.action;
      params = e.parameter;
    }
    // Fallback: parse JSON body
    else if (e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      action = body.action;
      params = body;
    }

    if (!action) return _err('action parameter is required.');
    return dispatch(action, params);
  } catch(err) {
    return _err('Server error: ' + err.message);
  }
}

function dispatch(action, p) {
  switch (action) {
    case 'login':               return handleLogin(p);
    case 'getProducts':         return handleGetProducts(p);
    case 'getProductByBarcode': return handleGetProductByBarcode(p);
    case 'addProduct':          return handleAddProduct(p);
    case 'bulkAddProducts':     return handleBulkAddProducts(p);
    case 'updateProduct':       return handleUpdateProduct(p);
    case 'deleteProduct':       return handleDeleteProduct(p);
    case 'scanAction':          return handleScanAction(p);
    case 'getLogs':             return handleGetLogs(p);
    case 'getData':             return handleGetData();
    case 'getStats':            return handleGetStats(p);
    case 'getUsers':            return handleGetUsers(p);
    case 'addUser':             return handleAddUser(p);
    case 'updateUser':          return handleUpdateUser(p);
    case 'deleteUser':          return handleDeleteUser(p);
    case 'getMasters':          return handleGetMasters(p);
    case 'addMaster':           return handleAddMaster(p);
    case 'updateMaster':        return handleUpdateMaster(p);
    case 'deleteMaster':        return handleDeleteMaster(p);
    case 'ping':                return _ok({ pong: true, ts: new Date().toISOString() });
    default:                    return _err('Unknown action: ' + action);
  }
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function handleLogin(p) {
  if (!p.username || !p.password) return _err('username and password are required.');
  var users = sheetToObjects(getSheet(SHEET_NAMES.USERS));
  var user  = users.filter(function(u) {
    return u.username === p.username && u.password === p.password;
  })[0];
  if (!user) return _err('Invalid username or password.');
  return _ok(null, {
    success: true,
    user: { id: user.id, username: user.username, name: user.name, role: user.role }
  });
}

// ── PRODUCTS ─────────────────────────────────────────────────────────────────
function handleGetProducts(p) {
  var rows = sheetToObjects(getSheet(SHEET_NAMES.PRODUCTS));

  // ── Filters ───────────────────────────────────────────────────────────────
  if (p.status)   rows = rows.filter(function(r) { return r.status   === p.status;   });
  if (p.category) rows = rows.filter(function(r) { return r.category === p.category; });
  if (p.search) {
    var q = String(p.search).toLowerCase();
    rows = rows.filter(function(r) {
      return String(r.no        || '').toLowerCase().indexOf(q) >= 0 ||
             String(r.cableNo   || '').toLowerCase().indexOf(q) >= 0 ||
             String(r.barcode   || '').toLowerCase().indexOf(q) >= 0 ||
             String(r.siteName  || '').toLowerCase().indexOf(q) >= 0;
    });
  }

  var total = rows.length;

  // ── Pagination ────────────────────────────────────────────────────────────
  var pageSize   = Math.min(200, Math.max(5, parseInt(p.pageSize) || 20));
  var page       = Math.max(1, parseInt(p.page) || 1);
  var totalPages = Math.ceil(total / pageSize) || 1;
  page = Math.min(page, totalPages); // clamp
  var start = (page - 1) * pageSize;
  var paged = rows.slice(start, start + pageSize);

  return _ok(paged, { total: total, page: page, pageSize: pageSize, totalPages: totalPages });
}

function handleGetProductByBarcode(p) {
  if (!p.barcode) return _err('barcode is required.');
  var rows = sheetToObjects(getSheet(SHEET_NAMES.PRODUCTS));
  var row  = rows.filter(function(r) { return r.barcode === p.barcode; })[0];
  if (!row) return _err('Barcode not found.');
  return _ok(row);
}

function handleAddProduct(p) {
  if (!p.cableNo || !p.category || !p.core || !p.sqmm || !p.meter)
    return _err('cableNo, category, core, sqmm, and meter are required.');

  var rows = sheetToObjects(getSheet(SHEET_NAMES.PRODUCTS));
  if (rows.filter(function(r) { return r.cableNo === p.cableNo; }).length > 0)
    return _err('Cable No "' + p.cableNo + '" already exists.');

  var now = new Date().toISOString();
  var obj = {
    id:             p.id ? String(p.id) : String(Date.now()),
    no:             p.no ? String(p.no).trim() : '',
    cableNo:        String(p.cableNo).trim(),
    barcode:        p.barcode ? String(p.barcode) : _generateBarcode(),
    category:       String(p.category),
    core:           String(p.core),
    sqmm:           String(p.sqmm),
    meter:          Number(p.meter) || 0,
    quantity:       Number(p.quantity) || 1,
    status:         'IN_GODOWN',
    siteName:       '',
    personAssigned: '',
    dateOut:        '',
    dateIn:         '',
    remarks:        String(p.remarks || ''),
    activated:      false,
    createdAt:      now,
    updatedAt:      now,
  };

  appendObject(SHEET_NAMES.PRODUCTS, obj);
  return _ok(obj);
}

function handleUpdateProduct(p) {
  if (!p.id) return _err('id is required.');
  var allowed = ['no','cableNo','category','core','sqmm','meter','quantity','remarks'];
  var updates = { updatedAt: new Date().toISOString() };
  allowed.forEach(function(k) { if (p[k] !== undefined) updates[k] = p[k]; });
  if (!updateById(SHEET_NAMES.PRODUCTS, p.id, updates)) return _err('Product not found.');
  return _ok({ updated: true });
}

function handleDeleteProduct(p) {
  if (!p.id) return _err('id is required.');
  if (!deleteById(SHEET_NAMES.PRODUCTS, p.id)) return _err('Product not found.');
  return _ok({ deleted: true });
}

// ── BULK ADD PRODUCTS ─────────────────────────────────────────────────────────
/**
 * Accepts a JSON-encoded array of product rows via the `rows` param.
 * Each row must have: cableNo, category, core, sqmm, meter
 * Optional: quantity, remarks
 * Returns: { inserted, skipped, errors[] }
 */
function handleBulkAddProducts(p) {
  var rowsRaw = p.rows;
  if (!rowsRaw) return _err('rows parameter is required.');

  var rowsArr;
  try {
    rowsArr = JSON.parse(rowsRaw);
  } catch(e) {
    return _err('rows must be valid JSON array.');
  }
  if (!Array.isArray(rowsArr) || rowsArr.length === 0)
    return _err('rows must be a non-empty array.');
  if (rowsArr.length > 2000)
    return _err('Maximum 2000 rows per bulk upload.');

  var sheet   = getSheet(SHEET_NAMES.PRODUCTS);
  var existing = sheetToObjects(sheet);
  var existingNos = {};
  existing.forEach(function(r) { existingNos[String(r.cableNo).trim().toLowerCase()] = true; });

  var now      = new Date().toISOString();
  var inserted = 0;
  var skipped  = 0;
  var errors   = [];
  var headers  = _getHeaders(sheet);

  rowsArr.forEach(function(row, idx) {
    var lineNo = idx + 1;
    var cableNo = String(row.cableNo || '').trim();
    if (!cableNo || !row.category || !row.core || !row.sqmm || !row.meter) {
      errors.push('Row ' + lineNo + ': missing required field (cableNo/category/core/sqmm/meter)');
      return;
    }
    if (existingNos[cableNo.toLowerCase()]) {
      skipped++;
      errors.push('Row ' + lineNo + ': "' + cableNo + '" already exists (skipped)');
      return;
    }
    var obj = {
      id:             String(Date.now() + idx),
      no:             String(row.no || '').trim(),
      cableNo:        cableNo,
      barcode:        _generateBarcode(),
      category:       String(row.category).trim(),
      core:           String(row.core).trim(),
      sqmm:           String(row.sqmm).trim(),
      meter:          Number(row.meter) || 0,
      quantity:       Number(row.quantity) || 1,
      status:         'IN_GODOWN',
      siteName:       '',
      personAssigned: '',
      dateOut:        '',
      dateIn:         '',
      remarks:        String(row.remarks || '').trim(),
      activated:      false,
      createdAt:      now,
      updatedAt:      now,
    };
    sheet.appendRow(_objectToRow(headers, obj));
    existingNos[cableNo.toLowerCase()] = true; // prevent duplicates within batch
    inserted++;
  });

  return _ok({ inserted: inserted, skipped: skipped, errors: errors });
}


// ── SCAN ACTION ───────────────────────────────────────────────────────────────
function handleScanAction(p) {
  var action  = p.mode || p.action;
  var barcode = p.barcode;
  if (!action || !barcode) return _err('action and barcode are required.');

  var sheet = getSheet(SHEET_NAMES.PRODUCTS);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return _err('ID / Cable No "' + barcode + '" not found. Register the cable first.');

  var headers = data[0].map(String);
  var barcodeIdx = headers.indexOf('barcode');
  var cableNoIdx = headers.indexOf('cableNo');
  
  var searchKey = String(barcode).trim().toLowerCase();
  var productRow = null;

  for (var i = 1; i < data.length; i++) {
    var b = String(data[i][barcodeIdx] || '').toLowerCase();
    var c = String(data[i][cableNoIdx] || '').toLowerCase();
    if (b === searchKey || c === searchKey) {
      productRow = data[i];
      break;
    }
  }
  
  if (!productRow) return _err('ID / Cable No "' + barcode + '" not found. Register the cable first.');

  var product = {};
  headers.forEach(function(h, idx) { product[h] = productRow[idx] !== undefined ? productRow[idx] : ''; });

  // Always use the true barcode for logs
  barcode = product.barcode;

  var now     = new Date().toISOString();
  var updates = { updatedAt: now };

  // ── ACTIVATE ───────────────────────────────────────────────────────────────
  if (action === 'ACTIVATE') {
    var isActivated = String(product.activated) === 'true' || product.activated === true;
    if (isActivated)
      return _err('Already activated. Duplicate activation is not allowed for barcode: ' + barcode);
    updates.activated = true;
    updates.status    = 'IN_GODOWN';
  }

  // ── SEND TO SITE  (IN_GODOWN → SENT_TO_SITE) ──────────────────────────────
  else if (action === 'SEND_TO_SITE') {
    var activated2 = String(product.activated) === 'true' || product.activated === true;
    if (!activated2)
      return _err('Cable is not activated yet. Activate it first before sending to site.');
    if (product.status !== 'IN_GODOWN')
      return _err('Cannot send to site. Cable status is "' + product.status + '". Must be IN_GODOWN.');
    if (!p.siteName || !String(p.siteName).trim())
      return _err('Site name is required for SEND_TO_SITE.');
    if (!p.personAssigned || !String(p.personAssigned).trim())
      return _err('Person assigned is required for SEND_TO_SITE.');

    updates.status         = 'SENT_TO_SITE';
    updates.siteName       = String(p.siteName).trim();
    updates.personAssigned = String(p.personAssigned).trim();
    var et = p.eventType ? String(p.eventType).trim().toUpperCase() : 'DAILY';
    updates.eventType      = (et === 'MONTHLY' || et === 'EVENT') ? et : 'DAILY';
    updates.dateOut        = now.slice(0, 10);
    updates.dateIn         = '';
  }

  // ── SITE TO SITE (SENT_TO_SITE → SENT_TO_SITE) ──────────────────────────
  else if (action === 'SITE_TO_SITE') {
    if (product.status !== 'SENT_TO_SITE')
      return _err('Cannot transfer. Cable status is "' + product.status + '". Must be at a site.');
    if (!p.siteName || !String(p.siteName).trim())
      return _err('New Site name is required for SITE_TO_SITE.');
    if (!p.personAssigned || !String(p.personAssigned).trim())
      return _err('New Person assigned is required for SITE_TO_SITE.');

    updates.siteName       = String(p.siteName).trim();
    updates.personAssigned = String(p.personAssigned).trim();
    var et = p.eventType ? String(p.eventType).trim().toUpperCase() : 'DAILY';
    updates.eventType      = (et === 'MONTHLY' || et === 'EVENT') ? et : 'DAILY';
    updates.dateOut        = now.slice(0, 10);
    // status remains 'SENT_TO_SITE'
  }

  // ── RETURN TO GODOWN  (SENT_TO_SITE → IN_GODOWN) ──────────────────────────
  else if (action === 'RETURN_TO_GODOWN') {
    if (product.status !== 'SENT_TO_SITE')
      return _err('Cannot return. Cable status is "' + product.status + '". Must be SENT_TO_SITE.');

    updates.status = 'IN_GODOWN';
    updates.dateIn = now.slice(0, 10);
    updates.dateOut = '';
    updates.siteName = '';
    updates.personAssigned = '';

    if (p.meterBalance !== undefined && p.meterBalance !== '') {
      var mb = parseFloat(p.meterBalance);
      if (!isNaN(mb) && mb >= 0) updates.meter = mb;
    }
  }

  else {
    return _err('Unknown scan action: ' + action);
  }

  // Persist the product update
  updateById(SHEET_NAMES.PRODUCTS, product.id, updates);

  // Write transaction log
  var txn = {
    id:             String(Date.now()),
    no:             product.no || '',
    barcode:        barcode,
    action:         action,
    cableNo:        product.cableNo,
    user:           String(p.user || 'unknown'),
    timestamp:      now,
    note:           String(p.note || ''),
    siteName:       String(p.siteName       || product.siteName       || ''),
    personAssigned: String(p.personAssigned || product.personAssigned || ''),
    eventType:      String(p.eventType      || product.eventType      || 'DAILY'),
  };
  appendObject(SHEET_NAMES.TRANSACTIONS, txn);

  // Write scan dedup log
  appendObject(SHEET_NAMES.SCAN_LOG, { barcode: barcode, action: action, timestamp: now });

  // Return the merged updated product
  var updatedProduct = {};
  Object.keys(product).forEach(function(k)  { updatedProduct[k] = product[k]; });
  Object.keys(updates).forEach(function(k)  { updatedProduct[k] = updates[k]; });

  return _ok(updatedProduct, { transaction: txn });
}

// ── LOGS ──────────────────────────────────────────────────────────────────
function handleGetLogs(p) {
  var rows = sheetToObjects(getSheet(SHEET_NAMES.TRANSACTIONS));

  // Filter by action
  if (p.action)   rows = rows.filter(function(r) { return r.action  === p.action; });
  // Filter by cableNo / NO (partial match)
  if (p.cableNo) {
    var q = String(p.cableNo).toLowerCase();
    rows = rows.filter(function(r) {
      return String(r.no      || '').toLowerCase().indexOf(q) >= 0 ||
             String(r.cableNo || '').toLowerCase().indexOf(q) >= 0;
    });
  }
  // Filter by site (partial match)
  if (p.siteName) rows = rows.filter(function(r) {
    return String(r.siteName||'').toLowerCase().indexOf(String(p.siteName).toLowerCase()) >= 0;
  });
  // Date range filter (dateFrom / dateTo — ISO date strings, e.g. '2025-01-01')
  if (p.dateFrom) {
    var df = new Date(p.dateFrom).getTime();
    rows = rows.filter(function(r) { return r.timestamp && new Date(r.timestamp).getTime() >= df; });
  }
  if (p.dateTo) {
    var dt = new Date(p.dateTo).getTime() + 86400000; // inclusive end
    rows = rows.filter(function(r) { return r.timestamp && new Date(r.timestamp).getTime() <= dt; });
  }

  // Newest first
  rows.reverse();

  var total      = rows.length;
  var pageSize   = Math.min(200, Math.max(5, parseInt(p.pageSize) || 20));
  var page       = Math.max(1, parseInt(p.page) || 1);
  var totalPages = Math.ceil(total / pageSize) || 1;
  page = Math.min(page, totalPages);
  var start = (page - 1) * pageSize;
  var paged = rows.slice(start, start + pageSize);

  return _ok(paged, { total: total, page: page, pageSize: pageSize, totalPages: totalPages });
}

// ── GET ALL DATA (Local In-Memory Architecture) ──────────────────────────────
function handleGetData() {
  return _ok({
    products: sheetToObjects(getSheet(SHEET_NAMES.PRODUCTS)),
    logs:     sheetToObjects(getSheet(SHEET_NAMES.TRANSACTIONS)),
    users:    sheetToObjects(getSheet(SHEET_NAMES.USERS)),
    masters:  sheetToObjects(getSheet(SHEET_NAMES.MASTERS))
  });
}

// ── STATS (for Dashboard refresh) ─────────────────────────────────────────────
function handleGetStats(p) {
  var products = sheetToObjects(getSheet(SHEET_NAMES.PRODUCTS));
  var logs     = sheetToObjects(getSheet(SHEET_NAMES.TRANSACTIONS));

  var total        = products.length;
  var inGodown     = products.filter(function(r) { return r.status === 'IN_GODOWN';    }).length;
  var onSite       = products.filter(function(r) { return r.status === 'SENT_TO_SITE'; }).length;
  var activated    = products.filter(function(r) { return String(r.activated) === 'true'; }).length;

  // Category breakdown
  var catMap = {};
  products.forEach(function(r) {
    var c = r.category || 'Unknown';
    catMap[c] = (catMap[c] || 0) + 1;
  });
  var categories = Object.keys(catMap).map(function(k) { return { name:k, count:catMap[k] }; });

  // Last 5 log entries
  var recentLogs = logs.slice(-5).reverse();

  return _ok({ total:total, inGodown:inGodown, onSite:onSite, activated:activated,
               notActivated: total - activated, categories:categories,
               recentLogs: recentLogs });
}


// ── USERS ─────────────────────────────────────────────────────────────────────
function handleGetUsers(p) {
  var users = sheetToObjects(getSheet(SHEET_NAMES.USERS)).map(function(u) {
    return { id: u.id, username: u.username, name: u.name, role: u.role, password: '••••••••' };
  });
  return _ok(users);
}

function handleAddUser(p) {
  if (!p.username || !p.password || !p.role || !p.name)
    return _err('username, password, role, and name are all required.');
  var users = sheetToObjects(getSheet(SHEET_NAMES.USERS));
  if (users.filter(function(u) { return u.username === p.username; }).length > 0)
    return _err('Username "' + p.username + '" already exists.');
  var obj = {
    id:       String(Date.now()),
    username: String(p.username).trim(),
    password: String(p.password),
    role:     String(p.role),
    name:     String(p.name).trim(),
  };
  appendObject(SHEET_NAMES.USERS, obj);
  return _ok({ id: obj.id, username: obj.username, name: obj.name, role: obj.role });
}

function handleUpdateUser(p) {
  if (!p.id) return _err('id is required.');
  var updates = { name: String(p.name || ''), role: String(p.role || '') };
  if (p.password && p.password !== '••••••••') updates.password = String(p.password);
  if (!updateById(SHEET_NAMES.USERS, p.id, updates)) return _err('User not found.');
  return _ok({ updated: true });
}

function handleDeleteUser(p) {
  if (!p.id) return _err('id is required.');
  if (!deleteById(SHEET_NAMES.USERS, p.id)) return _err('User not found.');
  return _ok({ deleted: true });
}

// ── MASTERS ───────────────────────────────────────────────────────────────────
// Valid types: CATEGORY | CORE | SQMM

var MASTER_TYPES = ['CATEGORY', 'CORE', 'SQMM'];

// Default seed values written on first sheet creation
var MASTER_DEFAULTS = {
  CATEGORY: ['Power Cable','Control Cable','Instrumentation Cable','Communication Cable',
             'Armoured Cable','Flexible Cable','Fire Resistant Cable','XLPE Cable',
             'PVC Cable','Data Cable'],
  CORE:     ['1C','2C','3C','3.5C','4C','5C','6C','7C','12C','19C','24C'],
  SQMM:     ['0.5','0.75','1','1.5','2.5','4','6','10','16','25','35','50',
             '70','95','120','150','185','240','300'],
};

function handleGetMasters(p) {
  var rows = sheetToObjects(getSheet(SHEET_NAMES.MASTERS));

  // Filter by type if requested
  if (p.type) {
    rows = rows.filter(function(r) { return r.type === p.type; });
  }

  // Sort by sortOrder then value
  rows.sort(function(a, b) {
    var so = Number(a.sortOrder || 9999) - Number(b.sortOrder || 9999);
    if (so !== 0) return so;
    return String(a.value).localeCompare(String(b.value));
  });

  return _ok(rows);
}

function handleAddMaster(p) {
  if (!p.type || !p.value)
    return _err('type and value are required.');
  if (MASTER_TYPES.indexOf(p.type) < 0)
    return _err('Invalid type. Must be one of: ' + MASTER_TYPES.join(', '));

  var rows = sheetToObjects(getSheet(SHEET_NAMES.MASTERS));
  // Check duplicate (case-insensitive)
  var dup = rows.filter(function(r) {
    return r.type === p.type && String(r.value).toLowerCase() === String(p.value).toLowerCase();
  });
  if (dup.length > 0) return _err('"' + p.value + '" already exists in ' + p.type + ' master.');

  var obj = {
    id:        String(Date.now()),
    type:      String(p.type),
    value:     String(p.value).trim(),
    sortOrder: Number(p.sortOrder) || 999,
    createdAt: new Date().toISOString(),
  };
  appendObject(SHEET_NAMES.MASTERS, obj);
  return _ok(obj);
}

function handleUpdateMaster(p) {
  if (!p.id) return _err('id is required.');
  var updates = {};
  if (p.value)     updates.value     = String(p.value).trim();
  if (p.sortOrder !== undefined) updates.sortOrder = Number(p.sortOrder);
  if (!updateById(SHEET_NAMES.MASTERS, p.id, updates)) return _err('Master item not found.');
  return _ok({ updated: true });
}

function handleDeleteMaster(p) {
  if (!p.id) return _err('id is required.');
  if (!deleteById(SHEET_NAMES.MASTERS, p.id)) return _err('Master item not found.');
  return _ok({ deleted: true });
}

/** Seed default master values if the MASTERS sheet is empty. Called from getSheet override. */
function _seedDefaultMasters(sheet) {
  var now = new Date().toISOString();
  var order = 1;
  MASTER_TYPES.forEach(function(type) {
    var defaults = MASTER_DEFAULTS[type] || [];
    defaults.forEach(function(val) {
      sheet.appendRow([String(Date.now() + order), type, val, order, now]);
      order++;
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL SETUP (optional helper — safe to run multiple times)
// Run this from Apps Script Editor → Run → setupSheets
// ─────────────────────────────────────────────────────────────────────────────
function setupSheets() {
  Object.keys(SHEET_NAMES).forEach(function(key) {
    getSheet(SHEET_NAMES[key]);
  });

  SpreadsheetApp.getUi().alert(
    '✅ RE CABLETRACK — All sheets are ready!\n\n' +
    'Sheets: USERS · PRODUCTS · TRANSACTIONS · SCAN_LOG · MASTERS\n\n' +
    'Default admin account: admin / admin123\n' +
    'Masters seeded: Categories, Core options, SQMM options\n' +
    '⚠️  Change the admin password after first login.'
  );
}
