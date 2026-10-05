/**
 * STACKLY ENERGY — DASHBOARD ENGINE (SIDEBAR EDITION)
 * Powers user-dashboard.html + admin-dashboard.html.
 * - Sidebar panel router (each nav item = one panel of 3 sections)
 * - Live telemetry (sun-curve simulation) + dependency-free canvas charts
 * - Real-time cross-tab sync via StacklyAuth bus (tickets/users/settings)
 */
'use strict';

/* ============================ helpers ============================ */
function dashReady(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}
function dashEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function dashTimeAgo(iso) {
  if (!iso) return '—';
  var d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d / 60) + ' min ago';
  if (d < 86400) return Math.floor(d / 3600) + ' h ago';
  return Math.floor(d / 86400) + ' d ago';
}
function dashFmt(n, dec) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return Number(n).toFixed(dec == null ? 1 : dec);
}
function dashToast(msg) {
  var t = document.getElementById('dashToast');
  if (!t) return;
  var m = document.getElementById('dashToastMsg');
  if (m) m.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function () { t.classList.remove('show'); }, 3000);
}
function dashBroadcast(type, payload) {
  if (window.BroadcastChannel) {
    try { new BroadcastChannel('stackly_realtime').postMessage({ type: type, payload: payload }); } catch (e) {}
  }
}
function dashSaveUsers(users) {
  localStorage.setItem('stackly_users', JSON.stringify(users));
  dashBroadcast('users:changed', users);
}

/* ======================= sidebar router ======================= */
function initPanelRouter() {
  var sidebar = document.getElementById('dashSidebar');
  var backdrop = document.getElementById('dashBackdrop');
  var toggle = document.getElementById('dashMenuToggle');
  var closeBtn = document.getElementById('dashSidebarClose');
  if (!sidebar) return;

  function setToggleState(open) {
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeDrawer() {
    sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
    document.body.classList.remove('dash-nav-open');
    setToggleState(false);
  }

  function openDrawer() {
    sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('show');
    document.body.classList.add('dash-nav-open');
    setToggleState(true);
  }

  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'dashSidebar');
    toggle.addEventListener('click', function () {
      if (sidebar.classList.contains('open')) closeDrawer();
      else openDrawer();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // Esc key closes the mobile drawer
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) closeDrawer();
  });

  // Returning to desktop width always restores the inline sidebar
  window.addEventListener('resize', function () {
    if (window.innerWidth > 960 && sidebar.classList.contains('open')) closeDrawer();
  });

  function activate(panelId) {
    var panels = document.querySelectorAll('.dash-panel');
    for (var i = 0; i < panels.length; i++) {
      panels[i].classList.toggle('active', panels[i].id === panelId);
    }
    var btns = document.querySelectorAll('.dash-nav-item');
    for (var j = 0; j < btns.length; j++) {
      btns[j].classList.toggle('active', btns[j].getAttribute('data-panel') === panelId);
    }
    closeDrawer();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // redraw charts in the newly visible panel
    window.dispatchEvent(new Event('resize'));
  }

  document.querySelectorAll('.dash-nav-item[data-panel]').forEach(function (btn) {
    btn.addEventListener('click', function () { activate(btn.getAttribute('data-panel')); });
  });
  document.querySelectorAll('[data-goto]').forEach(function (el) {
    el.addEventListener('click', function () { activate(el.getAttribute('data-goto')); });
  });
}

/* ======================= telemetry ======================= */
function dashHash(str) {
  var h = 0;
  for (var i = 0; i < String(str).length; i++) h = ((h << 5) - h + String(str).charCodeAt(i)) | 0;
  return Math.abs(h);
}
function dashRng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function startTelemetry(session, onUpdate) {
  var rand = dashRng(dashHash(session.siteId || session.email || 'site'));
  var isAdmin = session.role === 'admin';
  var isCommercial = session.plan && session.plan.indexOf('Commercial') === 0;
  var capacityKw = isAdmin ? 18000 : (isCommercial ? 1200 : 8.4);
  var batteryKwh = isAdmin ? 42000 : (isCommercial ? 2400 : 20);
  var soc = 0.55 + rand() * 0.35;
  var generatedToday = 6 + rand() * 20;
  var exportedToday = 2 + rand() * 8;
  var buffer = [];

  function sunFactor() {
    var h = new Date().getHours() + new Date().getMinutes() / 60;
    if (h < 6 || h > 19.5) return 0;
    return Math.sin(((h - 6) / 13.5) * Math.PI);
  }

  function tick() {
    var s = sunFactor();
    var production = capacityKw * s * (0.82 + rand() * 0.18);
    var load = capacityKw * (0.22 + rand() * 0.16) * (s > 0 ? 1 : 0.6);
    var surplus = production - load;
    var chargeRate = 0;

    if (surplus > 0 && soc < 1) {
      chargeRate = Math.min(surplus, batteryKwh * 0.004);
      soc = Math.min(1, soc + chargeRate / batteryKwh);
    } else if (surplus < 0 && soc > 0.05) {
      var drawn = Math.min(-surplus, soc * batteryKwh * 0.01);
      soc = Math.max(0.05, soc - drawn / batteryKwh);
      surplus += drawn;
    }
    var gridFlow = surplus - chargeRate;

    if (production > 0) generatedToday += production / 12;
    if (gridFlow > 0) exportedToday += gridFlow / 12;

    var point = { t: Date.now(), production: production, consumption: load, battery: soc * 100, grid: gridFlow };
    buffer.push(point);
    if (buffer.length > 60) buffer.shift();

    onUpdate({
      now: point, buffer: buffer, soc: soc,
      generatedToday: generatedToday, exportedToday: exportedToday,
      co2Today: generatedToday * 0.42,
      autonomy: Math.min(100, Math.round(((production + soc * batteryKwh) / Math.max(load, 0.1)) * 50)),
      status: production > 0.2 ? 'Generating' : (soc > 0.06 ? 'On Battery' : 'Grid Support')
    });
  }

  tick();
  var timer = setInterval(tick, 2000);
  return function () { clearInterval(timer); };
}

/* ======================= canvas charts ======================= */
function drawSeriesChart(canvas, seriesList, opts) {
  if (!canvas) return;
  var dpr = window.devicePixelRatio || 1;
  var w = canvas.clientWidth || canvas.parentElement.clientWidth || 600;
  var h = canvas.clientHeight || 230;
  canvas.width = w * dpr; canvas.height = h * dpr;
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  var padL = 44, padR = 10, padT = 12, padB = 22;
  var maxVal = 1;
  seriesList.forEach(function (s) {
    s.data.forEach(function (v) { if (v > maxVal) maxVal = v; });
  });
  maxVal *= 1.15;

  function x(i, n) { return padL + (i / Math.max(n - 1, 1)) * (w - padL - padR); }
  function y(v) { return padT + (1 - v / maxVal) * (h - padT - padB); }

  ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.font = '10px "Plus Jakarta Sans", sans-serif';
  ctx.lineWidth = 1;
  for (var g = 0; g <= 4; g++) {
    var gy = padT + (g / 4) * (h - padT - padB);
    ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(w - padR, gy); ctx.stroke();
    var lab = maxVal * (1 - g / 4);
    ctx.fillText(opts && opts.labels ? String(opts.labels[4 - g] || '') : (lab >= 1000 ? (lab / 1000).toFixed(1) + 'k' : lab.toFixed(1)), 6, gy + 3);
  }

  seriesList.forEach(function (s) {
    if (!s.data.length) return;
    ctx.beginPath();
    s.data.forEach(function (v, i) { i === 0 ? ctx.moveTo(x(i, s.data.length), y(v)) : ctx.lineTo(x(i, s.data.length), y(v)); });
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.stroke();
    if (s.fill) {
      ctx.lineTo(x(s.data.length - 1, s.data.length), h - padB);
      ctx.lineTo(x(0, s.data.length), h - padB);
      ctx.closePath();
      ctx.fillStyle = s.fill;
      ctx.fill();
    }
    // end dot
    ctx.beginPath();
    ctx.arc(x(s.data.length - 1, s.data.length), y(s.data[s.data.length - 1]), 4.5, 0, Math.PI * 2);
    ctx.fillStyle = s.color;
    ctx.fill();
  });
}

/* ======================= shared render ======================= */
function renderDashUser(session) {
  var nameEl = document.getElementById('dashUserName');
  var roleEl = document.getElementById('dashUserRole');
  var avatarEl = document.getElementById('dashAvatar');
  if (nameEl) {
    nameEl.textContent = session.email || session.name || 'User';
    nameEl.title = session.email || '';
  }
  if (roleEl) roleEl.textContent = session.role === 'admin' ? 'Administrator' : (session.plan || 'Client Member');
  if (avatarEl) {
    var em = String(session.email || '').toLowerCase();
    var photo = (em.indexOf('priya') !== -1) ? 'img/avatar-priya.webp'
              : (em.indexOf('david') !== -1) ? 'img/avatar-david.webp'
              : (em.indexOf('aria') !== -1) ? 'img/avatar-aria.webp'
              : (em.indexOf('elena') !== -1) ? 'img/avatar-elena.webp'
              : (session.role === 'admin' && em.indexOf('admin') !== -1) ? 'img/about-leader-1.webp'
              : null;
    if (photo) {
      avatarEl.innerHTML = '<img src="' + photo + '" alt="' + dashEsc(session.email) + '" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;">';
    } else {
      var initial = (session.email || 'U').charAt(0).toUpperCase();
      avatarEl.innerHTML = '<span style="font-family:var(--font-display); font-weight:800; font-size:1.05rem; color:#10b981; line-height:1; display:flex; align-items:center; justify-content:center; width:100%; height:100%;">' + dashEsc(initial) + '</span>';
    }
  }
}
function bindDashLogout() {
  var btns = document.querySelectorAll('[data-logout]');
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      if (window.StacklyAuth) StacklyAuth.logout();
      window.location.href = 'login.html';
    });
  });
}
function applyMaintenanceBanner(settings) {
  var banner = document.getElementById('maintenanceBanner');
  if (banner) banner.classList.toggle('show', !!(settings && settings.maintenanceMode));
}

/* ======================= USER DASHBOARD ======================= */
window.initUserDashboard = function () {
  if (!document.getElementById('userDashboardRoot') || !window.StacklyAuth) return;
  var session = StacklyAuth.requireAuth(false);
  if (!session) return;

  initPanelRouter();
  renderDashUser(session);
  bindDashLogout();

  var hello = document.getElementById('udHello');
  if (hello) hello.textContent = 'Welcome back, ' + (session.email || session.name);
  var siteEl = document.getElementById('udSiteId');
  if (siteEl) siteEl.textContent = session.siteId || '—';
  var facSite = document.getElementById('udFacilitySiteId');
  if (facSite) facSite.textContent = session.siteId || 'STK-8492';
  var facEmail = document.getElementById('udFacilityEmail');
  if (facEmail) facEmail.textContent = session.email;
  var userEmailDisp = document.getElementById('udUserEmailDisplay');
  if (userEmailDisp) userEmailDisp.textContent = session.email;
  var sideEmail = document.getElementById('udSidebarEmail');
  if (sideEmail) sideEmail.textContent = session.email;

  /* -- live telemetry feeds both overview + telemetry panels -- */
  var ids = ['udPower', 'udStatus', 'udBattery', 'udGrid', 'udCo2', 'udUpdated',
             'udTelPower', 'udTelLoad', 'udTelBattery', 'udTelGrid', 'udTelAutonomy', 'udTelUpdated'];
  var el = {};
  ids.forEach(function (id) { el[id] = document.getElementById(id); });

  startTelemetry(session, function (d) {
    if (el.udPower) el.udPower.textContent = dashFmt(d.now.production) + ' kW';
    if (el.udStatus) el.udStatus.textContent = d.status;
    if (el.udBattery) el.udBattery.textContent = Math.round(d.now.battery) + '%';
    if (el.udSocBar) el.udSocBar.style.width = Math.round(d.soc * 100) + '%';
    if (el.udGrid) el.udGrid.textContent = (d.now.grid >= 0 ? '+' : '') + dashFmt(d.now.grid) + ' kW';
    if (el.udCo2) el.udCo2.textContent = dashFmt(d.co2Today) + ' kg';
    if (el.udUpdated) el.udUpdated.textContent = new Date().toLocaleTimeString();
    if (el.udTelPower) el.udTelPower.textContent = dashFmt(d.now.production) + ' kW';
    if (el.udTelLoad) el.udTelLoad.textContent = dashFmt(d.now.consumption) + ' kW';
    if (el.udTelBattery) el.udTelBattery.textContent = Math.round(d.now.battery) + '%';
    if (el.udTelSocBar) el.udTelSocBar.style.width = Math.round(d.soc * 100) + '%';
    if (el.udTelGrid) el.udTelGrid.textContent = (d.now.grid >= 0 ? '+' : '') + dashFmt(d.now.grid) + ' kW';
    if (el.udTelAutonomy) el.udTelAutonomy.textContent = d.autonomy + '%';
    if (el.udTelUpdated) el.udTelUpdated.textContent = new Date().toLocaleTimeString();
    var gen = document.getElementById('udGenerated');
    var exp = document.getElementById('udExported');
    if (gen) gen.textContent = dashFmt(d.generatedToday) + ' kWh';
    if (exp) exp.textContent = dashFmt(d.exportedToday) + ' kWh';
    drawSeriesChart(document.getElementById('udChart'), [
      { data: d.buffer.map(function (p) { return p.production; }), color: '#10b981', fill: 'rgba(16, 185, 129, 0.22)' },
      { data: d.buffer.map(function (p) { return p.consumption; }), color: '#ffffff' }
    ]);
    drawSeriesChart(document.getElementById('udTelChart'), [
      { data: d.buffer.map(function (p) { return p.production; }), color: '#10b981', fill: 'rgba(16, 185, 129, 0.22)' },
      { data: d.buffer.map(function (p) { return p.consumption; }), color: '#ffffff' }
    ]);
  });

  /* -- analytics: 14-day history + savings + impact -- */
  (function renderAnalytics() {
    var rand = dashRng(dashHash(session.email));
    var base = session.plan && session.plan.indexOf('Commercial') === 0 ? 900 : 28;
    var hist = [];
    for (var i = 13; i >= 0; i--) hist.push(Math.round(base * (0.55 + rand() * 0.6)));
    drawSeriesChart(document.getElementById('udHistChart'), [
      { data: hist, color: '#10b981', fill: 'rgba(16, 185, 129, 0.25)' }
    ]);
    var month = Math.round(base * 30 * 0.24);
    var set = function (id, v) { var n = document.getElementById(id); if (n) n.textContent = v; };
    set('udSaveMonth', '$' + month.toLocaleString());
    set('udSaveYear', '$' + (month * 12).toLocaleString());
    set('udSaveLife', '$' + dashFmt(month * 12 * 6, 0));
    set('udImpactCo2', dashFmt(month * 12 * 6 * 0.42 * 1000, 0) + ' kg');
    set('udImpactTrees', Math.round(month * 12 * 6 * 0.42 * 1000 / 42) + ' trees');
    set('udImpactKm', dashFmt(month * 12 * 6 * 0.42 * 1000 / 0.12, 0) + ' km');
  })();

  /* -- devices -- */
  (function renderDevices() {
    var tbody = document.getElementById('udDeviceTable');
    if (!tbody) return;
    var isCommercial = session.plan && session.plan.indexOf('Commercial') === 0;
    var devices = [
      { id: 'INV-01', name: 'Primary Inverter', type: 'Hybrid Inverter', status: 'online', value: '98.2% eff.' },
      { id: 'BMS-01', name: 'LFP Battery Bank', type: 'Storage • 20 kWh', status: 'online', value: '94% SoC' },
      { id: 'MTR-01', name: 'Grid Meter', type: 'Bi-directional', status: 'online', value: 'CT-clamp' },
      { id: 'ENV-01', name: 'Weather Station', type: 'Irradiance Sensor', status: 'online', value: '842 W/m²' }
    ];
    if (isCommercial) {
      devices.push({ id: 'WT-01', name: 'Wind Turbine A', type: '60 kW HAWT', status: 'service', value: 'yaw service' });
      devices.push({ id: 'INV-02', name: 'Inverter B', type: 'Central String', status: 'online', value: '97.6% eff.' });
    }
    var count = document.getElementById('udDeviceCount');
    if (count) count.textContent = devices.length + ' devices reporting';
    tbody.innerHTML = devices.map(function (d) {
      var badge = d.status === 'online'
        ? '<span class="dash-badge badge-open"><span class="material-symbols-outlined">check_circle</span>Online</span>'
        : '<span class="dash-badge badge-pending"><span class="material-symbols-outlined">engineering</span>Service</span>';
      return '<tr><td><strong>' + d.id + '</strong></td><td>' + d.name + '</td><td>' + d.type + '</td><td>' + badge + '</td><td>' + d.value + '</td></tr>';
    }).join('');
    var alerts = document.getElementById('udDeviceAlerts');
    if (alerts) {
      var serv = devices.filter(function (d) { return d.status !== 'online'; });
      alerts.innerHTML = serv.length
        ? serv.map(function (d) {
            return '<div class="dash-list-row"><div class="l-main"><span class="material-symbols-outlined">warning</span><div><div class="l-title">' + d.name + ' scheduled for service</div><div class="l-sub">' + d.value + ' — crew dispatched</div></div></div><span class="dash-badge badge-pending">In progress</span></div>';
          }).join('')
        : '<div class="ticket-empty">No active alerts — all systems nominal.</div>';
    }
  })();

  /* -- billing -- */
  (function renderBilling() {
    var isCommercial = session.plan && session.plan.indexOf('Commercial') === 0;
    var name = document.getElementById('udPlanName');
    var desc = document.getElementById('udPlanDesc');
    var price = document.getElementById('udPlanPrice');
    if (name) name.textContent = isCommercial ? 'Commercial Microgrid Care' : 'Residential Care Plan';
    if (desc) desc.textContent = session.plan || 'Residential — 6.6 kW + 13.5 kWh';
    if (price) price.textContent = isCommercial ? '$289/mo' : '$29/mo';
    var list = document.getElementById('udInvoiceList');
    if (list) {
      var rows = '';
      for (var i = 0; i < 5; i++) {
        var d = new Date(); d.setMonth(d.getMonth() - i);
        var amt = isCommercial ? 289 : 29;
        rows += '<div class="dash-list-row"><div class="l-main"><span class="material-symbols-outlined">description</span><div><div class="l-title">Invoice #' + (2600 - i) + ' — ' + d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '</div><div class="l-sub">Monitoring &amp; maintenance plan</div></div></div><span class="l-end">' + (i === 0 ? 'Due soon' : 'Paid') + '</span></div>';
      }
      list.innerHTML = rows;
    }
  })();

  /* -- profile -- */
  (function renderProfile() {
    var set = function (id, v) { var n = document.getElementById(id); if (n) { if ('value' in n) n.value = v; n.textContent = v; } };
    set('udProfileName', session.name || (session.email ? session.email.split('@')[0] : 'User'));
    set('udProfileEmail', session.email || '—');
    var av = document.getElementById('udProfileAvatar');
    if (av) {
      var em = String(session.email || '').toLowerCase();
      var photo = (em.indexOf('priya') !== -1) ? 'img/avatar-priya.webp'
                : (em.indexOf('david') !== -1) ? 'img/avatar-david.webp'
                : (em.indexOf('aria') !== -1) ? 'img/avatar-aria.webp'
                : (em.indexOf('elena') !== -1) ? 'img/avatar-elena.webp'
                : null;
      if (photo) {
        av.innerHTML = '<img src="' + photo + '" alt="' + dashEsc(session.email) + '" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;">';
      } else {
        var initial = (session.email || 'U').charAt(0).toUpperCase();
        av.textContent = initial;
      }
    }
    var role = document.getElementById('udProfileRole');
    if (role) role.textContent = (session.role || 'user').toUpperCase();
    set('udProfileSite', session.siteId || '—');
    set('udProfilePlan', session.plan || '—');
    var pw = document.getElementById('udPasswordForm');

if (pw) {
  pw.addEventListener('submit', function (e) {
    e.preventDefault();

    var newPass = document.getElementById('udNewPass');
    var confirmPass = document.getElementById('udNewPass2');

    // Remove previous errors
    newPass.classList.remove('input-error');
    confirmPass.classList.remove('input-error');

    var hasError = false;

    // Empty new password
    if (newPass.value.trim() === '') {
      newPass.classList.add('input-error');
      hasError = true;
    }

    // Empty confirm password
    if (confirmPass.value.trim() === '') {
      confirmPass.classList.add('input-error');
      hasError = true;
    }

    // Stop here if any field is empty
    if (hasError) {
      dashToast('Please fill in all password fields.');
      return;
    }

    // Check passwords match
    if (newPass.value !== confirmPass.value) {
      confirmPass.classList.add('input-error');
      dashToast('Passwords do not match.');
      return;
    }

    // Success
    pw.reset();
    dashToast('Password updated successfully.');

    // Redirect only after successful validation
    window.location.href = './404.html';
  });
}
  })();

  /* -- support tickets -- */
  function renderTickets() {
    var list = document.getElementById('udTicketList');
    if (!list) return;
    var tickets = StacklyAuth.getTickets().filter(function (t) { return t.userEmail === session.email; });
    var count = document.getElementById('udTicketCount');
    if (count) count.textContent = tickets.filter(function (t) { return t.status !== 'resolved'; }).length;
    var sub = document.getElementById('udTicketSub');
    if (sub) sub.textContent = tickets.length + ' ticket(s) total';
    if (!tickets.length) {
      list.innerHTML = '<div class="ticket-empty">No tickets yet — submit the form above and it appears here (and on the admin side) instantly.</div>';
      return;
    }
    list.innerHTML = tickets.map(function (t) {
      var badge = t.status === 'open' ? '<span class="dash-badge badge-open">Open</span>'
        : t.status === 'pending' ? '<span class="dash-badge badge-pending">Awaiting you</span>'
        : '<span class="dash-badge badge-resolved">Resolved</span>';
      var reply = t.reply ? '<div style="margin-top:10px; padding:10px 14px; background:rgba(16, 185, 129, 0.12); border-left:3px solid #10b981; border-radius:8px; font-size:0.84rem; color:#ffffff;"><strong style="color:#10b981;">Support:</strong> ' + dashEsc(t.reply) + '</div>' : '';
      return '<div class="ticket-item"><h4>' + dashEsc(t.subject) + '</h4><div class="t-meta"><span>#' + t.id + '</span><span>' + dashTimeAgo(t.createdAt) + '</span>' + badge + '</div><p>' + dashEsc(t.message) + '</p>' + reply + '</div>';
    }).join('');
  }
  renderTickets();

  var form = document.getElementById('ticketForm');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var s = document.getElementById('ticketSubject');
    var m = document.getElementById('ticketMessage');
    if (!s.value.trim() || !m.value.trim()) return;
    StacklyAuth.createTicket(s.value.trim(), m.value.trim(), session);
    form.reset();
    dashToast('Ticket submitted — the admin dashboard sees it live.');
  });

  StacklyAuth.on('tickets:changed', renderTickets);
  StacklyAuth.on('settings:changed', applyMaintenanceBanner);
  StacklyAuth.on('users:changed', function (users) {
    var me = users.filter(function (u) { return u.id === session.userId; })[0];
    if (!me) return;
    session.name = me.name; session.plan = me.plan; session.role = me.role;
    renderDashUser(session);
    if (me.status === 'suspended') dashToast('Your account was suspended by an administrator.');
  });
  applyMaintenanceBanner(StacklyAuth.getSettings());
};

/* ======================= ADMIN DASHBOARD ======================= */
window.initAdminDashboard = function () {
  if (!document.getElementById('adminDashboardRoot') || !window.StacklyAuth) return;
  var session = StacklyAuth.requireAuth(true);
  if (!session) return;

  initPanelRouter();
  renderDashUser(session);
  bindDashLogout();

  var adSigned = document.getElementById('adSignedEmail');
  if (adSigned) adSigned.textContent = session.email;
  var adSide = document.getElementById('adSidebarEmail');
  if (adSide) adSide.textContent = session.email;

  /* -- 1A live fleet metrics + chart -- */
  var el = {};
  ['adFleetPower', 'adFleetStatus', 'adEnergyToday', 'adFleetUpdated', 'adUsers', 'adSessions', 'adOpenTickets', 'adTicketsSub', 'adCapacity'].forEach(function (id) {
    el[id] = document.getElementById(id);
  });

  function refreshStats() {
    var users = StacklyAuth.getUsers();
    var tickets = StacklyAuth.getTickets();
    var open = tickets.filter(function (t) { return t.status !== 'resolved'; }).length;
    if (el.adUsers) el.adUsers.textContent = users.length;
    if (el.adSessions) el.adSessions.textContent = Math.max(1, Math.round(users.length * 0.6));
    if (el.adOpenTickets) el.adOpenTickets.textContent = open;
    var count = document.getElementById('adTicketCount');
    if (count) count.textContent = open;
    if (el.adTicketsSub) el.adTicketsSub.textContent = open + ' awaiting response';
  }

  startTelemetry(session, function (d) {
    if (el.adFleetPower) el.adFleetPower.textContent = dashFmt(d.now.production / 1000) + ' MW';
    if (el.adFleetStatus) el.adFleetStatus.textContent = d.status;
    if (el.adEnergyToday) el.adEnergyToday.textContent = dashFmt(d.generatedToday / 1000, 2) + ' GWh';
    if (el.adCapacity) el.adCapacity.textContent = dashFmt(d.now.production / 1000) + ' MW peak';
    if (el.adFleetUpdated) el.adFleetUpdated.textContent = new Date().toLocaleTimeString();
    drawSeriesChart(document.getElementById('adChart'), [
      { data: d.buffer.map(function (p) { return p.production; }), color: '#10b981', fill: 'rgba(16, 185, 129, 0.22)' },
      { data: d.buffer.map(function (p) { return p.consumption; }), color: '#ffffff' }
    ]);
    refreshStats();
  });

  /* -- 1B region table -- */
  (function renderRegions() {
    var tbody = document.getElementById('adRegionTable');
    if (!tbody) return;
    var regions = [
      { name: 'North District', sites: 412, output: '48.2 MW', status: 'online' },
      { name: 'Harbor Commercial Zone', sites: 238, output: '61.7 MW', status: 'online' },
      { name: 'Willow Valley Co-op', sites: 86, output: '12.4 MW', status: 'service' },
      { name: 'South Residential Belt', sites: 590, output: '44.9 MW', status: 'online' },
      { name: 'East Industrial Park', sites: 154, output: '27.3 MW', status: 'offline' }
    ];
    tbody.innerHTML = regions.map(function (r) {
      var badge = r.status === 'online'
        ? '<span class="dash-badge badge-open"><span class="material-symbols-outlined">check_circle</span>Online</span>'
        : r.status === 'service' ? '<span class="dash-badge badge-pending"><span class="material-symbols-outlined">engineering</span>Service</span>'
        : '<span class="dash-badge badge-resolved"><span class="material-symbols-outlined">sleep</span>Offline</span>';
      return '<tr><td><strong>' + r.name + '</strong></td><td>' + r.sites + '</td><td>' + r.output + '</td><td>' + badge + '</td></tr>';
    }).join('');
  })();

  /* -- 1C quick actions -- */
  document.querySelectorAll('[data-goto]').forEach(function () {}); // router handles these

  /* -- 2B users table + modal -- */
  function renderUsers() {
    var tbody = document.getElementById('adUserTable');
    if (!tbody) return;
    var search = (document.getElementById('adUserSearch') || {}).value || '';
    search = search.toLowerCase();
    var users = StacklyAuth.getUsers().filter(function (u) {
      return !search || ((u.email + ' ' + u.name + ' ' + (u.plan || '')).toLowerCase().indexOf(search) !== -1);
    });
    var total = document.getElementById('adUserCount');
    if (total) total.textContent = StacklyAuth.getUsers().length + ' accounts';
    tbody.innerHTML = users.map(function (u) {
      var isSelf = StacklyAuth.currentSession() && StacklyAuth.currentSession().userId === u.id;
      var roleBadge = u.role === 'admin' ? '<span class="dash-badge badge-admin">Admin</span>' : '<span class="dash-badge badge-user">User</span>';
      var statusBadge = u.status === 'active'
        ? '<span class="dash-badge badge-open"><span class="material-symbols-outlined">check_circle</span>Active</span>'
        : '<span class="dash-badge badge-pending"><span class="material-symbols-outlined">block</span>Suspended</span>';
      var photo = u.role === 'admin' ? 'img/about-leader-1.webp' : (u.email.indexOf('david') !== -1 ? 'img/avatar-david.webp' : (u.email.indexOf('elena') !== -1 ? 'img/avatar-elena.webp' : (u.email.indexOf('aria') !== -1 ? 'img/avatar-aria.webp' : 'img/avatar-priya.webp')));
      return '<tr>' +
        '<td><div style="display:flex; align-items:center; gap:12px;"><img src="' + photo + '" alt="' + dashEsc(u.name) + '" class="dash-avatar-photo" style="width:36px; height:36px;"><div><strong style="color:#ffffff;">' + dashEsc(u.name) + '</strong><br><span style="font-size:0.75rem; color:rgba(255,255,255,0.6);">' + dashEsc(u.email) + '</span></div></div></td>' +
        '<td>' + roleBadge + '</td><td>' + dashEsc(u.plan || '—') + '</td><td>' + statusBadge + '</td><td>' + dashTimeAgo(u.lastLogin) + '</td>' +
        '<td style="white-space:nowrap;"><button class="dash-btn sm" data-action="view" data-user="' + u.id + '">View</button>' +
        (isSelf ? '' : ' <button class="dash-btn sm" data-action="role" data-user="' + u.id + '">' + (u.role === 'admin' ? 'Make User' : 'Make Admin') + '</button> <button class="dash-btn sm ' + (u.status === 'active' ? 'danger' : 'primary') + '" data-action="status" data-user="' + u.id + '">' + (u.status === 'active' ? 'Suspend' : 'Activate') + '</button>') +
        '</td></tr>';
    }).join('') || '<tr><td colspan="6" style="text-align:center; color:var(--dark-65);">No accounts match.</td></tr>';
  }
  renderUsers();

  var search = document.getElementById('adUserSearch');
  if (search) search.addEventListener('input', renderUsers);

  var userTable = document.getElementById('adUserTable');
  if (userTable) userTable.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var users = StacklyAuth.getUsers();
    var user = users.filter(function (u) { return u.id === btn.getAttribute('data-user'); })[0];
    if (!user) return;
    var action = btn.getAttribute('data-action');

    if (action === 'view') {
      var modal = document.getElementById('userModal');
      var preview = document.getElementById('modalUserPreview');
      var select = document.getElementById('modalRoleSelect');
      if (!modal || !preview) return;
      preview.innerHTML = '<strong>' + dashEsc(user.name) + '</strong> — ' + dashEsc(user.email) + '<br>Role: ' + dashEsc(user.role) + ' • Status: ' + dashEsc(user.status) + '<br>Plan: ' + dashEsc(user.plan || '—') + ' • Site: ' + dashEsc(user.siteId || '—') + '<br>Joined: ' + new Date(user.createdAt).toLocaleDateString() + ' • Last login: ' + dashTimeAgo(user.lastLogin);
      if (select) select.value = user.role;
      modal.classList.add('show');
      var save = document.getElementById('modalSaveBtn');
      if (save) save.onclick = function () {
        user.role = select ? select.value : user.role;
        dashSaveUsers(users);
        modal.classList.remove('show');
        renderUsers();
        dashToast('Saved changes for ' + user.email + '.');
      };
      return;
    }
    if (action === 'role') {
      user.role = user.role === 'admin' ? 'user' : 'admin';
      dashToast(user.email + ' is now ' + user.role + '.');
    } else if (action === 'status') {
      user.status = user.status === 'active' ? 'suspended' : 'active';
      dashToast(user.email + (user.status === 'active' ? ' re-activated.' : ' suspended.'));
    }
    dashSaveUsers(users);
    renderUsers();
    refreshStats();
  });

  var closeBtn = document.getElementById('modalCloseBtn');
  var modalEl = document.getElementById('userModal');
  if (closeBtn && modalEl) closeBtn.addEventListener('click', function () { modalEl.classList.remove('show'); });
  if (modalEl) modalEl.addEventListener('click', function (e) { if (e.target === modalEl) modalEl.classList.remove('show'); });

  /* -- 3A tickets queue -- */
  function renderTickets() {
    var list = document.getElementById('adTicketList');
    if (!list) return;
    var tickets = StacklyAuth.getTickets();
    if (!tickets.length) {
      list.innerHTML = '<div class="ticket-empty">No tickets. Open the client portal in another tab and submit one — it lands here instantly.</div>';
      return;
    }
    list.innerHTML = tickets.map(function (t) {
      var badge = t.status === 'open' ? '<span class="dash-badge badge-open">New</span>'
        : t.status === 'pending' ? '<span class="dash-badge badge-pending">Pending</span>'
        : '<span class="dash-badge badge-resolved">Resolved</span>';
      var replyBlock = t.reply
        ? '<div style="margin-top:10px; padding:10px 14px; background:rgba(16, 185, 129, 0.12); border-left:3px solid #10b981; border-radius:8px; font-size:0.84rem; color:#ffffff;"><strong style="color:#10b981;">Your reply:</strong> ' + dashEsc(t.reply) + '</div>'
        : '<div class="ticket-reply"><input class="dash-input" type="text" placeholder="Type a reply to ' + dashEsc(t.userEmail) + '…" data-reply-input="' + t.id + '"><button class="dash-btn primary sm" style="margin-top:10px;" data-reply-send="' + t.id + '">Send Reply &amp; Resolve</button></div>';
      return '<div class="ticket-item" data-ticket-item="' + t.id + '"><h4>' + dashEsc(t.subject) + '</h4><div class="t-meta"><span>#' + t.id + '</span><span>' + dashEsc(t.userEmail) + '</span><span>' + dashTimeAgo(t.createdAt) + '</span>' + badge + '</div><p>' + dashEsc(t.message) + '</p>' + replyBlock +
        (t.reply ? '' : '<div style="margin-top:10px;"><button class="dash-btn sm" data-toggle-ticket="' + t.id + '">Reply</button></div>') +
        '</div>';
    }).join('');
  }
  renderTickets();

  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-toggle-ticket]');
    if (toggle) {
      var item = toggle.closest('[data-ticket-item]');
      if (item) item.classList.toggle('expanded');
      return;
    }
    var send = e.target.closest('[data-reply-send]');
    if (send) {
      var wrap = send.closest('.ticket-reply');
      var input = wrap ? wrap.querySelector('[data-reply-input]') : null;
      var text = input ? input.value.trim() : '';
      if (!text) { if (input) input.focus(); return; }
      StacklyAuth.updateTicket(send.getAttribute('data-reply-send'), { status: 'resolved', reply: text });
      dashToast('Reply sent — ticket resolved.');
    }
  });

  /* -- 3B settings form -- */
  function renderSettings() {
    var s = StacklyAuth.getSettings();
    var email = document.getElementById('setSupportEmail');
    var maint = document.getElementById('setMaintenance');
    var interval = document.getElementById('setInterval');
    if (email && document.activeElement !== email) email.value = s.supportEmail || '';
    if (maint) maint.checked = !!s.maintenanceMode;
    if (interval) interval.value = String(s.telemetryInterval || 2000);
  }
  renderSettings();

  var settingsForm = document.getElementById('adminSettingsForm');
  if (settingsForm) settingsForm.addEventListener('submit', function (e) {
    e.preventDefault();
    StacklyAuth.updateSettings({
      supportEmail: document.getElementById('setSupportEmail').value.trim(),
      maintenanceMode: document.getElementById('setMaintenance').checked,
      telemetryInterval: parseInt(document.getElementById('setInterval').value, 10) || 2000
    });
    dashToast('Settings saved — live on every portal.');
    window.location.href='./404.html'
  });

  /* -- 3C support contacts -- */
  (function renderContacts() {
    var s = StacklyAuth.getSettings();
    var n = document.getElementById('adSupportEmail');
    if (n) n.textContent = s.supportEmail || 'support@stacklyenergy.com';
  })();

  StacklyAuth.on('tickets:changed', function () { renderTickets(); refreshStats(); });
  StacklyAuth.on('users:changed', function () { renderUsers(); refreshStats(); });
  StacklyAuth.on('settings:changed', function (s) { applyMaintenanceBanner(s); renderSettings(); });
  applyMaintenanceBanner(StacklyAuth.getSettings());

  // seed last-login times for a populated table
  (function seedLogins() {
    var users = StacklyAuth.getUsers();
    var changed = false;
    users.forEach(function (u) {
      if (!u.lastLogin) { u.lastLogin = new Date(Date.now() - 36e5 * (1 + Math.floor(Math.random() * 72))).toISOString(); changed = true; }
    });
    if (changed) dashSaveUsers(users);
  })();
  renderUsers();
};

/* ======================= boot ======================= */
dashReady(function () {
  if (typeof initAuthPage === 'function') initAuthPage();
  if (typeof window.initUserDashboard === 'function') window.initUserDashboard();
  if (typeof window.initAdminDashboard === 'function') window.initAdminDashboard();
});
