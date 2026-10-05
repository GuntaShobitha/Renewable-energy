/**
 * STACKLY ENERGY — AUTH + REAL-TIME DATA ENGINE
 * ---------------------------------------------
 * Client-side authentication & live-data bus (no backend required).
 *
 * HOW IT WORKS
 * - ANY email + ANY password (min 4 chars) can log in. New emails are
 *   auto-registered as "user". Email starting with "admin" (or the seeded
 *   admin@stacklyenergy.com) gets the "admin" role → admin dashboard.
 * - Session persists via sessionStorage (or localStorage if "stay signed in").
 * - All dashboard state (users, tickets, telemetry settings) lives in
 *   localStorage and is broadcast across open tabs in real time via
 *   BroadcastChannel + the storage event, so admin & user views stay in sync.
 */

(function () {
  'use strict';

  var STORAGE = {
    session: 'stackly_session',
    users: 'stackly_users',
    tickets: 'stackly_tickets',
    settings: 'stackly_admin_settings'
  };

  /* ------------------------------------------------------------------
   * Tiny pub/sub used as the real-time bus between tabs & sections
   * ------------------------------------------------------------------ */
  var listeners = {};
  var bc = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('stackly_realtime');
      bc.onmessage = function (e) {
        emitLocal(e.data.type, e.data.payload, true);
      };
    }
  } catch (err) { /* BroadcastChannel unsupported — storage events still work */ }

  window.addEventListener('storage', function (e) {
    if (!e.key) return;
    if (e.key === STORAGE.session) emitLocal('session:changed', readSession(), true);
    if (e.key === STORAGE.users) emitLocal('users:changed', getUsers(), true);
    if (e.key === STORAGE.tickets) emitLocal('tickets:changed', getTickets(), true);
    if (e.key === STORAGE.settings) emitLocal('settings:changed', getSettings(), true);
  });

  function emitLocal(type, payload, fromRemote) {
    (listeners[type] || []).forEach(function (fn) {
      try { fn(payload, fromRemote); } catch (err) { /* keep bus alive */ }
    });
  }

  function broadcast(type, payload) {
    emitLocal(type, payload, false);
    if (bc) {
      try { bc.postMessage({ type: type, payload: payload }); } catch (err) { /* noop */ }
    }
  }

  /** Subscribe to real-time events. Returns an unsubscribe function. */
  function on(type, fn) {
    (listeners[type] = listeners[type] || []).push(fn);
    return function () {
      listeners[type] = (listeners[type] || []).filter(function (f) { return f !== fn; });
    };
  }

  /* ------------------------------------------------------------------
   * Persistent store helpers
   * ------------------------------------------------------------------ */
  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) { return fallback; }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getUsers() { return readJSON(STORAGE.users, []); }
  function getTickets() { return readJSON(STORAGE.tickets, []); }
  function getSettings() {
    return readJSON(STORAGE.settings, { supportEmail: 'support@stacklyenergy.com', maintenanceMode: false, telemetryInterval: 2000 });
  }

  /* ------------------------------------------------------------------
   * Users
   * ------------------------------------------------------------------ */
  function seedUsers() {
    var users = getUsers();
    if (users.length) return;
    users.push({
      id: 'u-admin',
      email: '',
      name: 'Grid Administrator',
      role: 'admin',
      plan: 'Internal',
      siteId: 'HQ-0001',
      createdAt: new Date().toISOString(),
      lastLogin: null,
      status: 'active'
    });
    users.push({
      id: 'u-demo',
      email: '',
      name: 'Priya N.',
      role: 'user',
      plan: 'Residential — 8.4 kW + 20 kWh',
      siteId: 'STK-8492',
      createdAt: new Date(Date.now() - 86400000 * 42).toISOString(),
      lastLogin: new Date(Date.now() - 86400000).toISOString(),
      status: 'active'
    });
    users.push({
      id: 'u-demo2',
      email: 'david@harborlogistics.com',
      name: 'David R.',
      role: 'user',
      plan: 'Commercial — 1.2 MW Microgrid',
      siteId: 'STK-7741',
      createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
      lastLogin: new Date(Date.now() - 86400000 * 3).toISOString(),
      status: 'active'
    });
    writeJSON(STORAGE.users, users);
  }

  function isAdminEmail(email) {
    var e = String(email || '').trim().toLowerCase();
    return e.indexOf('admin') === 0 || e === 'admin@stacklyenergy.com';
  }

  function registerUser(email, password, explicitRole) {
    var users = getUsers();
    var existing = users.filter(function (u) { return u.email === email; })[0];
    if (existing) {
      if (explicitRole) {
        existing.role = explicitRole;
        writeJSON(STORAGE.users, users);
      }
      return existing;
    }

    var now = new Date().toISOString();
    var role = explicitRole || (isAdminEmail(email) ? 'admin' : 'user');
    var user = {
      id: 'u-' + Date.now().toString(36),
      email: email,
      name: deriveName(email),
      role: role,
      plan: role === 'admin' ? 'Internal Administrator' : 'Residential — 6.6 kW + 13.5 kWh',
      siteId: 'STK-' + String(1000 + Math.floor(Math.random() * 9000)),
      createdAt: now,
      lastLogin: now,
      status: 'active'
    };
    users.push(user);
    writeJSON(STORAGE.users, users);
    broadcast('users:changed', users);
    return user;
  }

  function deriveName(email) {
    var local = String(email).split('@')[0] || 'Member';
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  /* ------------------------------------------------------------------
   * Session
   * ------------------------------------------------------------------ */
  function readSession() {
    try {
      var raw = sessionStorage.getItem(STORAGE.session) || localStorage.getItem(STORAGE.session);
      return raw ? JSON.parse(raw) : null;
    } catch (err) { return null; }
  }

  // function writeSession(session, remember) {
  //   var raw = JSON.stringify(session);
  //   if (remember) {
  //     localStorage.setItem(STORAGE.session, raw);
  //   } else {
  //     sessionStorage.setItem(STORAGE.session, raw);
  //   }
  //   broadcast('session:changed', session);
  // }


  function writeSession(session) {
    var raw = JSON.stringify(session);

    // Session exists only while the browser tab/session is active
    sessionStorage.setItem(STORAGE.session, raw);

    // Make sure an old persistent session is removed
    localStorage.removeItem(STORAGE.session);

    broadcast('session:changed', session);
}

  /**
   * Login with email + password (>= 4 chars) and optional role override.
   * Auto-registers unknown emails. Rejects empty/short input.
   */
  function login(email, password, remember, explicitRole) {
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (password.length < 4) {
      return { ok: false, error: 'Password must be at least 4 characters.' };
    }

    var users = getUsers();
    var user = users.filter(function (u) { return u.email === email; })[0];

    if (!user) {
      user = registerUser(email, password, explicitRole);
    } else {
      if (explicitRole) {
        user.role = explicitRole;
      }
      user.lastLogin = new Date().toISOString();
      writeJSON(STORAGE.users, users);
      broadcast('users:changed', users);
    }

    var session = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      siteId: user.siteId,
      plan: user.plan,
      loginAt: new Date().toISOString()
    };
    writeSession(session);
    return { ok: true, user: user, session: session };
  }

  function logout() {
    sessionStorage.removeItem(STORAGE.session);
    localStorage.removeItem(STORAGE.session);
    broadcast('session:changed', null);
  }

  function currentUser() {
    var s = readSession();
    if (!s) return null;
    var users = getUsers();
    return users.filter(function (u) { return u.id === s.userId; })[0] || null;
  }

  function currentSession() { return readSession(); }

  /** Guard for dashboard pages. Redirects to login when signed out. */
  function requireAuth(adminOnly) {
    var session = readSession();
    if (!session) {
      window.location.replace('login.html');
      return null;
    }
    if (adminOnly && session.role !== 'admin') {
      window.location.replace('user-dashboard.html');
      return null;
    }
    return session;
  }

  /* ------------------------------------------------------------------
   * Support tickets (user creates → admin sees live)
   * ------------------------------------------------------------------ */
  function createTicket(subject, message, session) {
    var tickets = getTickets();
    var ticket = {
      id: 'TCK-' + String(2400 + tickets.length + Math.floor(Math.random() * 500)),
      subject: subject,
      message: message,
      userEmail: session.email,
      userName: session.name,
      status: 'open',
      reply: null,
      createdAt: new Date().toISOString()
    };
    tickets.unshift(ticket);
    writeJSON(STORAGE.tickets, tickets);
    broadcast('tickets:changed', tickets);
    return ticket;
  }

  function updateTicket(id, patch) {
    var tickets = getTickets();
    tickets = tickets.map(function (t) {
      if (t.id !== id) return t;
      var next = {};
      for (var k in t) next[k] = t[k];
      for (var p in patch) next[p] = patch[p];
      return next;
    });
    writeJSON(STORAGE.tickets, tickets);
    broadcast('tickets:changed', tickets);
  }

  /* ------------------------------------------------------------------
   * Admin settings (maintenance mode / support email) — live to all tabs
   * ------------------------------------------------------------------ */
  function updateSettings(patch) {
    var s = getSettings();
    for (var k in patch) s[k] = patch[k];
    writeJSON(STORAGE.settings, s);
    broadcast('settings:changed', s);
    return s;
  }

  /* ------------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------------ */
  window.StacklyAuth = {
    login: login,
    logout: logout,
    currentUser: currentUser,
    currentSession: currentSession,
    requireAuth: requireAuth,
    getUsers: getUsers,
    getTickets: getTickets,
    getSettings: getSettings,
    createTicket: createTicket,
    updateTicket: updateTicket,
    updateSettings: updateSettings,
    on: on
  };

  seedUsers();
})();


// ================= Login Page Controller ==================

(function () {
  var form = document.getElementById('loginForm');
  if (!form) return;

  var status = document.getElementById('loginStatus');
  var roleInput = document.getElementById('loginRoleInput');
  var roleTabs = document.querySelectorAll('.login-role-tab');
  var roleNotice = document.getElementById('loginRoleNotice');

  // Handle Role selection tabs
  function setRole(role) {
    if (roleInput) roleInput.value = role;
    roleTabs.forEach(function (tab) {
      var isTarget = tab.getAttribute('data-role') === role;
      tab.classList.toggle('active', isTarget);
      tab.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    if (roleNotice) {
      if (role === 'admin') {
        roleNotice.innerHTML = '<span class="material-symbols-outlined">shield_person</span> <span><strong>Admin Gateway:</strong> Direct telemetry stream, fleet inverter controls, and system tickets.</span>';
        roleNotice.className = 'login-role-notice notice-admin';
      } else {
        roleNotice.innerHTML = '<span class="material-symbols-outlined">solar_power</span> <span><strong>Customer Gateway:</strong> Live generation, battery state-of-charge, and utility statements.</span>';
        roleNotice.className = 'login-role-notice notice-user';
      }
    }
  }

  roleTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var role = this.getAttribute('data-role') || 'user';
      setRole(role);
    });
  });

  // Demo autofill triggers
  var demoAdminBtn = document.getElementById('btnDemoAdmin');
  var demoUserBtn = document.getElementById('btnDemoUser');

  if (demoAdminBtn) {
    demoAdminBtn.addEventListener('click', function (e) {
      e.preventDefault();
      setRole('admin');
      if (form.elements.email) form.elements.email.value = 'admin@stacklyenergy.com';
      if (form.elements.password) form.elements.password.value = 'admin123';
      if (status) {
        status.className = 'login-status';
        status.textContent = 'Login Sucesss';
      }
    });
  }

  if (demoUserBtn) {
    demoUserBtn.addEventListener('click', function (e) {
      e.preventDefault();
      setRole('user');
      if (form.elements.email) form.elements.email.value = 'priya@example.com';
      if (form.elements.password) form.elements.password.value = 'user123';
      if (status) {
        status.className = 'login-status';
        status.textContent = 'Login Success.';
      }
    });
  }

  // Login form submission & auth execution
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = form.elements.email.value.trim();
    var pass = form.elements.password.value;
    var remember = form.elements.remember ? form.elements.remember.checked : false;
    var selectedRole = (roleInput ? roleInput.value : 'user') || 'user';

    var fields = form.querySelectorAll('.login-field');
    fields.forEach(function (f) { f.classList.remove('login-field-error'); });
    if (status) {
      status.className = 'login-status';
      status.textContent = '';
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      var emailField = form.elements.email.closest('.login-field');
      if (emailField) emailField.classList.add('login-field-error');
      if (status) {
        status.classList.add('login-error');
        status.textContent = 'Please enter a valid email address.';
      }
      form.elements.email.focus();
      return;
    }

    if (pass.length < 4) {
      var passField = form.elements.password.closest('.login-field');
      if (passField) passField.classList.add('login-field-error');
      if (status) {
        status.classList.add('login-error');
        status.textContent = 'Password must be at least 4 characters.';
      }
      form.elements.password.focus();
      return;
    }

    if (remember) {
      try { localStorage.setItem('loginEmail', email); } catch (err) {}
    }

    // Execute authentication via StacklyAuth
    var authResult = window.StacklyAuth.login(email, pass, remember, selectedRole);

    if (!authResult.ok) {
      if (status) {
        status.classList.add('login-error');
        status.textContent = authResult.error || 'Authentication failed.';
      }
      return;
    }

    var targetRole = authResult.user.role || selectedRole;
    var dest = targetRole === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
    // var targetLabel = targetRole === 'admin' ? 'Grid Administrator Portal' : 'Customer System Dashboard';

    if (status) {
      status.classList.add('login-ok');
      status.innerHTML = '<span class="login-spinner"></span> Login Success <strong>';
    }

    var submitBtn = form.querySelector('.login-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Launching Dashboard…';
    }

    setTimeout(function () {
      window.location.href = dest;
    }, 600);
  });

})();
