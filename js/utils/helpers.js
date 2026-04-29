/**
 * Utility helpers — formatting, badges, download
 */
const Helpers = {
  formatDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return iso; }
  },
  formatDateTime(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
    catch { return iso; }
  },
  timeAgo(iso) {
    if (!iso) return '';
    const d = Date.now() - new Date(iso).getTime();
    const m = Math.floor(d/60000), h = Math.floor(d/3600000), dy = Math.floor(d/86400000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${dy}d ago`;
  },

  /**
   * Status badge — two statuses only
   */
  statusBadge(status) {
    const map = {
      IN_GODOWN:    { cls:'badge-success', label:'In Godown'    },
      SENT_TO_SITE: { cls:'badge-warning', label:'Sent to Site' },
    };
    const s = map[status] || { cls:'badge-ghost', label: status || '—' };
    return `<span class="badge ${s.cls} badge-sm font-medium">${s.label}</span>`;
  },

  roleBadge(role) {
    const map = {
      SUPER_ADMIN: { cls:'badge-error',   label:'Super Admin' },
      ADMIN:       { cls:'badge-warning', label:'Admin'       },
      VIEWER:      { cls:'badge-info',    label:'Viewer'      },
    };
    const r = map[role] || { cls:'badge-ghost', label: role };
    return `<span class="badge ${r.cls} badge-sm font-medium">${r.label}</span>`;
  },

  escape(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  },

  downloadCSV(rows, filename) {
    if (!rows.length) return;
    const h = Object.keys(rows[0]).join(',');
    const b = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([h+'\n'+b], { type:'text/csv' }));
    a.download = filename; a.click();
  },

  /** Download a plain CSV string as a file */
  downloadCSVRaw(csvString, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csvString], { type:'text/csv;charset=utf-8;' }));
    a.download = filename; a.click();
  },

  /** Download the bulk upload CSV template */
  downloadTemplate() {
    const header = 'no,cableNo,category,core,sqmm,meter,quantity,remarks';
    const sample = [
      '1,CBL-001,Power Cable,3C,10,500,1,',
      '2,CBL-002,Control Cable,2C,1.5,300,2,Test remark',
    ].join('\n');
    Helpers.downloadCSVRaw(header + '\n' + sample, 'bulk_upload_template.csv');
  },

  /**
   * Parse a CSV string into an array of objects.
   * Handles quoted fields with embedded commas/newlines.
   */
  parseCSV(text) {
    const lines = text.trim().replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
    if (!lines.length) return [];
    const headers = Helpers._splitCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g,''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const vals = Helpers._splitCSVLine(lines[i]);
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = (vals[idx]||'').trim(); });
      rows.push(obj);
    }
    return rows;
  },

  _splitCSVLine(line) {
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        result.push(cur); cur = '';
      } else { cur += ch; }
    }
    result.push(cur);
    return result;
  },
};
