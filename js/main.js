/**
 * STACKLY ENERGY — MODERN EDITORIAL INTERACTION ENGINE
 * Lightweight, Vanilla JavaScript, High Performance
 */

document.addEventListener('DOMContentLoaded', () => {
  initPreloader();
  initNavbar();
  initMobileDrawer();
  initScrollAnimations();
  initRevealAuto();
  initSplitTextHeadlines();
  initNumberCounters();
  initSolutionsTabs();
  initCalculator();
  initFaqAccordion();
  initForms();
  initAuthTabs();
  initCarousels();
  initPageTransitions();
  initParticles();
});

/* ==========================================================================
   1. NAVBAR SCROLL EFFECT & ACTIVE STATE
   ========================================================================== */
function initNavbar() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* ==========================================================================
   2. MOBILE DRAWER NAVIGATION
   ========================================================================== */
function initMobileDrawer() {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  const backdrop = document.querySelector('.mobile-drawer-backdrop');

  if (!toggleBtn || !drawer || !backdrop) return;

  const toggleDrawer = () => {
    const isOpen = drawer.classList.toggle('open');
    toggleBtn.classList.toggle('active', isOpen);
    backdrop.classList.toggle('show', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    toggleBtn.classList.remove('active');
    backdrop.classList.remove('show');
    document.body.style.overflow = '';
  };

  toggleBtn.addEventListener('click', toggleDrawer);
  backdrop.addEventListener('click', closeDrawer);

  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });
}

/* ==========================================================================
   3. SCROLL TRIGGERED ELEMENT REVEALS
   ========================================================================== */
function initScrollAnimations() {
  const revealElements = document.querySelectorAll('.fade-in-up, .timeline-track-wrapper');
  if (!revealElements.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

/* ==========================================================================
   4. IMPACT NUMBER COUNT-UP ANIMATION
   ========================================================================== */function initNumberCounters() {
  const counterItems = document.querySelectorAll('[data-counter-target]');
  if (!counterItems.length) return;

  const runCounter = (el) => {
    const target = parseFloat(el.getAttribute('data-counter-target'));
    const prefix = el.getAttribute('data-counter-prefix') || '';
    const suffix = el.getAttribute('data-counter-suffix') || '';
    const decimals = parseInt(el.getAttribute('data-counter-decimals') || '0', 10);
    const plain = el.hasAttribute('data-counter-plain'); // no thousands separators (e.g. years)
    const format = (n) => plain
      ? String(Math.round(n))
      : n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const duration = 2000;
    const startTime = performance.now();

    const updateCount = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      el.textContent = `${prefix}${format(ease * target)}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        el.textContent = `${prefix}${format(target)}${suffix}`;
        el.classList.add('counted'); // pop animation on completion
      }
    };

    requestAnimationFrame(updateCount);
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        runCounter(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  counterItems.forEach(item => observer.observe(item));
}

/* ==========================================================================
   5. ENERGY SOLUTIONS TAB INTERACTION
   ========================================================================== */
const solutionsData = {
  residential: {
    title: 'RESIDENTIAL SOLAR & STORAGE',
    tag: 'Homeowners • High Autonomy',
    desc: 'Bespoke rooftop photovoltaic arrays integrated with high-density lithium-iron-phosphate (LFP) storage. Gain up to 98% grid independence, reduce electric bills to minimum connection fees, and keep essential loads running during blackout events.',
    image: 'img/proj-residential.webp'
  },
  commercial: {
    title: 'COMMERCIAL & INDUSTRIAL MICROGRIDS',
    tag: 'Enterprise • Demand Shaving',
    desc: 'Megawatt-scale rooftop and ground installations with smart power electronics. Designed to eliminate expensive peak demand utility surcharges, provide industrial backup, and achieve corporate ESG sustainability mandates with verified carbon offsets.',
    image: 'img/hero-home.webp'
  },
  community: {
    title: 'COMMUNITY & SHARED MICRO-STORAGE',
    tag: 'Co-ops • Distributed Grid',
    desc: 'Shared clean energy networks and wind-solar hybrid infrastructure engineered for suburban cooperatives, rural districts, and apartment complexes, enabling clean power access without requiring individual roof ownership.',
    image: 'img/svc-wind.webp'
  }
};

function initSolutionsTabs() {
  const tabs = document.querySelectorAll('.solution-tab-item');
  const displayImage = document.getElementById('solutionDisplayImg');
  if (!tabs.length || !displayImage) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const key = tab.getAttribute('data-solution-key');
      const data = solutionsData[key];
      if (data) {
        displayImage.style.opacity = '0';
        setTimeout(() => {
          displayImage.src = data.image;
          displayImage.style.opacity = '1';
        }, 200);
      }
    });
  });
}

/* ==========================================================================
   6. INTERACTIVE SOLAR SYSTEM & SAVINGS CALCULATOR (SERVICES PAGE)
   ========================================================================== */
function initCalculator() {
  const billSlider = document.getElementById('calcBillSlider');
  const billValDisplay = document.getElementById('calcBillVal');
  const propertyBtns = document.querySelectorAll('.calc-prop-btn');
  const resSystemSize = document.getElementById('calcResSystemSize');
  const resAnnualSavings = document.getElementById('calcResAnnualSavings');
  const resOffsetCo2 = document.getElementById('calcResOffsetCo2');

  if (!billSlider || !billValDisplay) return;

  let propertyMultiplier = 1.0; // Residential

  propertyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      propertyBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      propertyMultiplier = parseFloat(btn.getAttribute('data-multiplier') || '1.0');
      updateCalc();
    });
  });

  const updateCalc = () => {
    const monthlyBill = parseFloat(billSlider.value);
    billValDisplay.textContent = `$${monthlyBill}`;

    // Solar sizing calculations
    const annualSpend = monthlyBill * 12 * propertyMultiplier;
    const estKwSize = (monthlyBill / 26) * propertyMultiplier;
    const estAnnualSavings = Math.round(annualSpend * 0.88);
    const estCo2Tons = (estKwSize * 1.35).toFixed(1);

    if (resSystemSize) resSystemSize.textContent = `${estKwSize.toFixed(1)} kW`;
    if (resAnnualSavings) resAnnualSavings.textContent = `$${estAnnualSavings.toLocaleString()}`;
    if (resOffsetCo2) resOffsetCo2.textContent = `${estCo2Tons} Tons`;
  };

  billSlider.addEventListener('input', updateCalc);
  updateCalc();
}

/* ==========================================================================
   7. INTERACTIVE FAQ ACCORDION (CONTACT PAGE)
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

/* ==========================================================================
   8. FORM SUBMISSIONS & TOAST NOTIFICATION
   ========================================================================== */
function showToast(message) {
  let toast = document.querySelector('.toast-notice');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <span class="material-symbols-outlined" style="color: var(--color-accent);">check_circle</span>
    <span>${message}</span>
  `;

  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

function initForms() {
  const forms = document.querySelectorAll('form[data-ajax-form]');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const successMsg = form.getAttribute('data-success-msg') || 'Thank you! Your inquiry has been submitted.';
      showToast(successMsg);
      form.reset();
    });
  });
}

/* ==========================================================================
   9. CAROUSEL ENGINE (INSTALL CARDS + TESTIMONIALS)
   Generic: works on any [data-carousel] wrapper with a [data-carousel-track].
   Supports arrows, dots, autoplay (data-autoplay ms), hover-pause & swipe.
   ========================================================================== */
function initCarousels() {
  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('[data-carousel-track]');
    if (!track) return;

    const slides = Array.from(track.children);
    if (slides.length < 2) return;

    let index = 0;
    let timer = null;
    const autoplayDelay = parseInt(carousel.getAttribute('data-autoplay') || '0', 10);

    const prevBtn = carousel.querySelector('[data-carousel-prev]');
    const nextBtn = carousel.querySelector('[data-carousel-next]');
    const dotsWrap = carousel.querySelector('[data-carousel-dots]');

    const dots = [];
    if (dotsWrap) {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.addEventListener('click', () => { goTo(i); restartAutoplay(); });
        dotsWrap.appendChild(dot);
        dots.push(dot);
      });
    }

    const update = () => {
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === index));
    };

    const goTo = (i) => {
      index = (i + slides.length) % slides.length;
      update();
    };
    const next = () => goTo(index + 1);
    const prev = () => goTo(index - 1);

    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); restartAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); restartAutoplay(); });

    const startAutoplay = () => {
      if (!autoplayDelay) return;
      stopAutoplay();
      timer = setInterval(next, autoplayDelay);
    };
    const stopAutoplay = () => { if (timer) clearInterval(timer); timer = null; };
    const restartAutoplay = () => { stopAutoplay(); startAutoplay(); };

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);

    // Touch / pointer swipe support
    let startX = null;
    track.addEventListener('pointerdown', (e) => { startX = e.clientX; stopAutoplay(); });
    track.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
      startX = null;
      startAutoplay();
    });

    update();
    startAutoplay();
  });
}

/* ==========================================================================
   10. AUTH TAB SWITCHER (LOGIN PAGE)
   ========================================================================== */
function initAuthTabs() {
  const tabBtns = document.querySelectorAll('.auth-tab-btn');
  const roleLabel = document.getElementById('authRoleLabel');
  if (!tabBtns.length || !roleLabel) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const role = btn.getAttribute('data-auth-type');
      roleLabel.textContent = role === 'commercial'
        ? 'Commercial Microgrid Fleet ID / Portal'
        : 'Residential System Account / Email';
    });
  });
}

/* ==========================================================================
   11. BOOTSTRAP AUTH WIRING (defined in js/auth.js)
   ========================================================================== */
// Login page boot only — dashboards boot themselves inside js/dashboard.js
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initAuthPage === 'function') initAuthPage();
});

/* ==========================================================================
   12. LOGIN PAGE HANDLER (uses StacklyAuth from js/auth.js)
   ========================================================================== */
function initAuthPage() {
  // Only run on the login page (guards against dashboard pages that also load main.js)
  if (!document.getElementById('loginForm')) return;
  const form = document.getElementById('loginForm');
  if (!form || typeof StacklyAuth === 'undefined') return;

  const errorBox = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  const btnText = document.getElementById('loginBtnText');

  // Already signed in? Skip straight to the right dashboard.
  const existing = StacklyAuth.currentSession();
  if (existing) {
    window.location.replace(existing.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html');
    return;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('loginRemember').checked;

    btn.disabled = true;
    btnText.textContent = 'Authenticating…';

    // Simulated network latency for a real-app feel
    setTimeout(() => {
      const result = StacklyAuth.login(email, password, remember);
      if (!result.ok) {
        errorBox.textContent = result.error;
        errorBox.style.display = 'block';
        btn.disabled = false;
        btnText.textContent = 'Sign In To Portal';
        return;
      }
      btnText.textContent = 'Success — opening dashboard…';
      const dest = result.session.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
      setTimeout(() => { window.location.href = dest; }, 600);
    }, 700);
  });
}

/* ==========================================================================
   13. DASHBOARD BOOTSTRAPS (bodies live in js/dashboard.js)
   ========================================================================== */
function initDashboard() {
  if (typeof window.initUserDashboard === 'function') window.initUserDashboard();
}

function initAdminDashboard() {
  if (typeof window.initAdminDashboardPage === 'function') window.initAdminDashboardPage();
}

/* ==========================================================================
   14. OPTIMIZED PRELOADER
   - Overlay markup is injected by JS (zero HTML edits, zero render block).
   - Hides on window 'load' OR after a 2.2s hard cap — whichever comes first.
   - Progress bar is time-based estimation (no fake waiting).
   - Session flag: shown once per session so navigation feels instant.
   ========================================================================== */
const PRELOADER_MAX_MS = 2200; // never block longer than this

function initPreloader() {
  // Skip entirely for users who prefer reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('app-ready');    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'preloader';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <div class="preloader-inner">
      <div class="preloader-logo"><span class="material-symbols-outlined">solar_power</span></div>
      <div class="preloader-word">STACKLY<span>ENERGY</span></div>
      <div class="preloader-bar"><span></span></div>
      <div class="preloader-pct">0%</div>
    </div>`;
  document.body.appendChild(overlay);


  const bar = overlay.querySelector('.preloader-bar span');
  const pct = overlay.querySelector('.preloader-pct');
  const start = performance.now();

  const tick = (now) => {
    const elapsed = now - start;
    // Fast attack, asymptotic approach — reads as real progress
    const est = Math.min(92, 92 * (1 - Math.exp(-elapsed / 420)));
    bar.style.width = est + '%';
    pct.textContent = Math.round(est) + '%';
    if (!overlay.classList.contains('done')) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const finish = () => {
    bar.style.width = '100%';
    pct.textContent = '100%';
    setTimeout(() => {
      overlay.classList.add('done');
      document.documentElement.classList.add('app-ready');
      setTimeout(() => overlay.remove(), 600);
    }, 180);
  };

  if (document.readyState === 'complete') {
    finish();
  } else {
    window.addEventListener('load', finish, { once: true });
    setTimeout(finish, PRELOADER_MAX_MS); // hard cap — page never feels stuck
  }
}

/* ==========================================================================
   15. AUTO SCROLL-REVEAL (cards animate with zero HTML changes)
   ========================================================================== */
const REVEAL_SELECTOR = [
  '.pay-card', '.blog-card', '.project-card', '.timeline-step', '.faq-item',
  '.choose-reason-item', '.choose-media-frame', '.metric-card-dark', '.impact-item',
  '.calc-card', '.calc-res-item', '.contact-card-info', '.contact-grid > *', '.auth-card',
  '.solutions-list', '.solutions-media-frame', '.install-header', '.page-hero-inner',
  '.hero-content', '.hero-media-wrapper', '.about-hero', '.about-stats', '.about-mission',
  '.about-story', '.about-timeline-item', '.dash-metric', '.dash-panel > *'
].join(',');

function initRevealAuto() {
  const targets = document.querySelectorAll(REVEAL_SELECTOR);
  if (!targets.length) return;

  targets.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => observer.observe(el));

  // Safety net: reveal anything still hidden after 4s (e.g. odd layouts)
  setTimeout(() => {
    document.querySelectorAll('.reveal:not(.in-view)').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in-view');
    });
  }, 4000);
}

/* ==========================================================================
   16. HEADLINE TEXT ANIMATION (word-by-word blur reveal)
   Applied to section headings; wrapper keeps existing layout intact.
   ========================================================================== */
function initSplitTextHeadlines() {
  const headings = document.querySelectorAll('.display-1, .display-2, .about-hero-title, .about-section-title, .about-story-title, .dash-hero h1');
  if (!headings.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  headings.forEach((heading) => {
    if (heading.dataset.splitDone) return;
    heading.dataset.splitDone = '1';

    // Wrap child nodes (text, spans, <br>) preserving the .highlight span
    let wordIndex = 0;
    const wrapWords = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(' '));
            } else {
              const span = document.createElement('span');
              span.className = 'w';
              span.style.setProperty('--wi', wordIndex++);
              span.textContent = part;
              frag.appendChild(span);
            }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          wrapWords(child);
        }
      });
    };

    wrapWords(heading);
    heading.classList.add('split-ready');
    observer.observe(heading);
  });
}

/* ==========================================================================
   17. SOFT PAGE TRANSITIONS (fade-out before internal navigation)
   ========================================================================== */
function initPageTransitions() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (typeof StacklyAuth !== 'undefined' && link.closest('[data-logout]')) return;

    e.preventDefault();
    document.body.classList.add('page-exit');
    setTimeout(() => { window.location.href = href; }, 200);
  });

  // Back/forward cache restore
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) document.body.classList.remove('page-exit');
  });
}

/* ==========================================================================
   18. AMBIENT PARTICLES (404 page only — ultra light, CSS driven)
   ========================================================================== */
function initParticles() {  const page = document.querySelector('.error-page');
  if (!page) return;

  const count = window.innerWidth < 700 ? 12 : 20;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'error-particle';
    p.style.left = (Math.random() * 100) + '%';
    p.style.animationDuration = (9 + Math.random() * 14) + 's';
    p.style.animationDelay = (-Math.random() * 18) + 's';
    const size = 3 + Math.random() * 5;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.opacity = 0.25 + Math.random() * 0.5;
    frag.appendChild(p);
  }
  page.appendChild(frag);
}


// ================ service js ==============

(function () {
  'use strict';

  /* ---------- Mobile navigation ---------- */
  var burger = document.getElementById('servicesBurger');
  var nav = document.getElementById('servicesNav');

  function closeNav() {
    nav.classList.remove('services-open');
    burger.classList.remove('services-open');
    burger.setAttribute('aria-expanded', 'false');
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('services-open');
      burger.classList.toggle('services-open', open);
      burger.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !burger.contains(e.target)) closeNav();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) closeNav();
    });
  }

  /* ---------- FAQ accordion (one open at a time) ---------- */
  var items = document.querySelectorAll('.services-faq-item');

  items.forEach(function (item) {
    var btn = item.querySelector('.services-faq-q');
    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('services-open');

      items.forEach(function (other) {
        other.classList.remove('services-open');
        other.querySelector('.services-faq-q').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('services-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();






// ================== blog js ===============


(function () {
  'use strict';

  /* ---------- Mobile navigation ---------- */
  var burger = document.getElementById('blogBurger');
  var nav = document.getElementById('blogNav');

  function closeNav() {
    nav.classList.remove('blog-open');
    burger.classList.remove('blog-open');
    burger.setAttribute('aria-expanded', 'false');
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('blog-open');
      burger.classList.toggle('blog-open', open);
      burger.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !burger.contains(e.target)) closeNav();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) closeNav();
    });
  }

  /* ---------- Topic chips (toggle selection) ---------- */
  var chips = document.querySelectorAll('.blog-chip');
  chips.forEach(function (chip) {
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', function () {
      var wasSelected = chip.classList.contains('blog-selected');
      chips.forEach(function (c) {
        c.classList.remove('blog-selected');
        c.setAttribute('aria-pressed', 'false');
      });
      if (!wasSelected) {
        chip.classList.add('blog-selected');
        chip.setAttribute('aria-pressed', 'true');
      }
    });
  });

  /* ---------- Newsletter form ---------- */
  var form = document.getElementById('blogForm');
  var email = document.getElementById('blogEmail');
  var msg = document.getElementById('blogMsg');

  if (form && email && msg) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = email.value.trim();
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

      if (!valid) {
        msg.textContent = 'Enter a valid email address, like you@example.com.';
        msg.style.color = '#8a1f0f';
        email.focus();
        return;
      }

      msg.textContent = 'You are subscribed. Look out for the next issue.';
      msg.style.color = '#0f2418';
      form.reset();
    });

    email.addEventListener('input', function () { msg.textContent = ''; });
  }
})();




// ============= contact js ================

(function () {
  // Mobile menu
  var burger = document.querySelector('.contact-burger');
  var nav = document.getElementById('contactNav');
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('contact-nav-open');
    burger.setAttribute('aria-expanded', open);
  });

  // FAQ accordion (one open at a time)
  var items = document.querySelectorAll('.contact-faq-item');
  items.forEach(function (item) {
    item.querySelector('.contact-faq-q').addEventListener('click', function () {
      var wasOpen = item.classList.contains('contact-open');
      items.forEach(function (i) {
        i.classList.remove('contact-open');
        i.querySelector('.contact-faq-q').setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('contact-open');
        item.querySelector('.contact-faq-q').setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Form validation + confirmation
  var form = document.getElementById('contactForm');
  var status = document.getElementById('contactStatus');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = form.elements.email.value.trim();
    if (!form.elements.name.value.trim() || !/^\S+@\S+\.\S+$/.test(email) || !form.elements.message.value.trim()) {
      status.style.color = '#c0392b';
      status.textContent = 'Please enter your name, a valid email and a message.';
      return;
    }
    status.style.color = '';
    status.textContent = 'Thanks! We will reply within one business day.';
    form.reset();
  });
})();





  const blogData = {

    solar: [
      {
        meta: "Solar · 6 min read",
        title: "How to size a solar system for your home",
        description:
          "Understand how roof space, household consumption, and seasonal production affect the right system size."
      },
      {
        meta: "Solar · 5 min read",
        title: "What actually affects solar production?",
        description:
          "A practical look at orientation, shading, temperature, module efficiency, and system losses."
      },
      {
        meta: "Solar · 4 min read",
        title: "What happens after your solar system is installed?",
        description:
          "From inspection and utility approval to monitoring your first kilowatt-hour."
      }
    ],

    wind: [
      {
        meta: "Wind · 7 min read",
        title: "Is small-scale wind right for your property?",
        description:
          "The site conditions, wind resource, tower height, and permitting factors that determine feasibility."
      },
      {
        meta: "Wind · 5 min read",
        title: "Understanding residential wind systems",
        description:
          "A practical introduction to turbines, energy production, maintenance, and system sizing."
      },
      {
        meta: "Wind · 6 min read",
        title: "Solar vs. wind: understanding the difference",
        description:
          "How generation profiles, site conditions, and infrastructure requirements differ between technologies."
      }
    ],

    storage: [
      {
        meta: "Storage · 5 min read",
        title: "How home batteries actually work",
        description:
          "Learn how batteries store excess generation and deliver energy when your solar system isn't producing."
      },
      {
        meta: "Storage · 6 min read",
        title: "How much battery storage does a home need?",
        description:
          "The key factors behind battery sizing, including household loads, backup requirements, and solar production."
      },
      {
        meta: "Storage · 4 min read",
        title: "Battery backup during a grid outage",
        description:
          "What happens when the grid goes down and how an appropriately designed storage system responds."
      }
    ],

    policy: [
      {
        meta: "Policy & incentives · 6 min read",
        title: "Understanding solar incentives",
        description:
          "A straightforward guide to the incentives, credits, and local programs that may affect project economics."
      },
      {
        meta: "Policy & incentives · 5 min read",
        title: "How utility rules affect solar projects",
        description:
          "Why interconnection requirements, utility policies, and local regulations matter before installation."
      },
      {
        meta: "Policy & incentives · 7 min read",
        title: "What to check before claiming an incentive",
        description:
          "Important eligibility, documentation, and installation considerations to review before making assumptions."
      }
    ],

    maintenance: [
      {
        meta: "Maintenance · 4 min read",
        title: "How much maintenance does solar require?",
        description:
          "The routine inspections, monitoring, and occasional service that help keep an energy system performing."
      },
      {
        meta: "Maintenance · 5 min read",
        title: "Five signs your solar system needs attention",
        description:
          "Production changes, equipment alerts, physical issues, and other signals worth investigating."
      },
      {
        meta: "Maintenance · 6 min read",
        title: "Keeping your battery system healthy",
        description:
          "Best practices for monitoring storage performance and identifying potential issues early."
      }
    ],

    field: [
      {
        meta: "Field notes · 5 min read",
        title: "Inside a typical solar installation",
        description:
          "A behind-the-scenes look at what our field teams evaluate, install, test, and commission."
      },
      {
        meta: "Field notes · 6 min read",
        title: "The details that make an installation last",
        description:
          "Why cable routing, equipment placement, weather protection, and commissioning matter."
      },
      {
        meta: "Field notes · 4 min read",
        title: "From site survey to system activation",
        description:
          "A project timeline showing how engineering, permitting, installation, and utility approval come together."
      }
    ]

  };


  const chips = document.querySelectorAll(".blog-chip");
  const results = document.getElementById("blogTopicResults");


  function renderTopic(topic) {

    const articles = blogData[topic];

    results.innerHTML = articles.map((article, index) => {

      const number = String(index + 1).padStart(2, "0");

      return `
        <article class="blog-notification is-entering">

          <div class="blog-notification-number">
            ${number}
          </div>

          <div class="blog-notification-content">

            <span>${article.meta}</span>

            <h3>${article.title}</h3>

            <p>${article.description}</p>

          </div>

          <a
            href="#"
            class="blog-notification-link"
            aria-label="Read ${article.title}"
          >
            →
          </a>

        </article>
      `;

    }).join("");

  }


  chips.forEach(chip => {

    chip.addEventListener("click", () => {

      // Remove active state
      chips.forEach(item => {
        item.classList.remove("active");
      });

      // Activate clicked topic
      chip.classList.add("active");

      // Render related articles
      renderTopic(chip.dataset.topic);

    });

  });


  // Load first topic
  renderTopic("solar");
