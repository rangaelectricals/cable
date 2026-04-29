/**
 * CABLE MANAGEMENT SYSTEM
 * Global Configuration & Constants
 */

// ─── GOOGLE APPS SCRIPT ENDPOINT ──────────────────────────────────────────────
// Replace this URL with your deployed Google Apps Script Web App URL
const CONFIG = {
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycbwRzr6yDKrIOVP6FrytM0l9V8BSVwZqbEbEtfPzajfwJACli60WfnDMFazoClvWwLNT/exec',
  APP_NAME: 'CableTrack Pro',
  VERSION: '2.0.0',
  CACHE_TTL: 5 * 60 * 1000,     // 5 minutes cache
  SESSION_KEY: 'cabletrack_session',
  DEMO_MODE: false,              // false = always hit real Google Apps Script API
};

// ─── STATUS CONSTANTS ─────────────────────────────────────────────────────────
// Workflow:  IN_GODOWN  →  SENT_TO_SITE  →  IN_GODOWN
// "In Godown" is the home/store location. There is NO separate "In Store" state.
const STATUS = {
  IN_GODOWN: 'IN_GODOWN',
  SENT_TO_SITE: 'SENT_TO_SITE',
};

const STATUS_LABELS = {
  IN_GODOWN: 'In Godown',
  SENT_TO_SITE: 'Sent to Site',
};

const STATUS_ICONS = {
  IN_GODOWN: '🏭',
  SENT_TO_SITE: '🚚',
};

// ─── STATUS FLOW ─────────────────────────────────────────────────────────────
// Allowed transitions:
//   ACTIVATE      → sets status = IN_GODOWN
//   SEND_TO_SITE  → IN_GODOWN  → SENT_TO_SITE   (requires site + person)
//   RETURN        → SENT_TO_SITE → IN_GODOWN     (optional meter balance update)
const STATUS_FLOW = {
  SEND_TO_SITE: 'IN_GODOWN',    // must be IN_GODOWN to send
  RETURN_TO_GODOWN: 'SENT_TO_SITE', // must be SENT_TO_SITE to return
};

// ─── ROLE CONSTANTS ──────────────────────────────────────────────────────────
const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  VIEWER: 'VIEWER',
};

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  VIEWER: 'Viewer',
};

// ─── CABLE CATEGORIES ────────────────────────────────────────────────────────
const CABLE_CATEGORIES = [
  'Power Cable',
  'Control Cable',
  'Instrumentation Cable',
  'Communication Cable',
  'Armoured Cable',
  'Flexible Cable',
  'Fire Resistant Cable',
  'XLPE Cable',
  'PVC Cable',
  'Data Cable',
];

// ─── CORE OPTIONS ────────────────────────────────────────────────────────────
const CORE_OPTIONS = ['1C', '2C', '3C', '3.5C', '4C', '5C', '6C', '7C', '12C', '19C', '24C'];

// ─── SQMM OPTIONS ────────────────────────────────────────────────────────────
const SQMM_OPTIONS = ['0.5', '0.75', '1', '1.5', '2.5', '4', '6', '10', '16', '25', '35', '50', '70', '95', '120', '150', '185', '240', '300'];

// ─── SCAN ACTION TYPES ───────────────────────────────────────────────────────
const SCAN_ACTIONS = {
  ACTIVATE: 'ACTIVATE',
  SEND_TO_SITE: 'SEND_TO_SITE',
  RETURN_TO_GODOWN: 'RETURN_TO_GODOWN',
};

// ─── FALLBACK USER LIST (login only — real users come from Google Sheets) ────
// Used ONLY for login page credential display. Actual validation is via API.
const DEFAULT_USERS = [
  { username: 'admin', role: ROLES.SUPER_ADMIN, name: 'Super Administrator' },
  { username: 'store', role: ROLES.ADMIN, name: 'Store Manager' },
  { username: 'viewer', role: ROLES.VIEWER, name: 'Site Viewer' },
];
