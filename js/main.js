/**
 * STACKLY ENERGY — MODERN EDITORIAL INTERACTION ENGINE
 * Lightweight, Vanilla JavaScript, High Performance
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileDrawer();
  initScrollAnimations();
  initNumberCounters();
  initSolutionsTabs();
  initCalculator();
  initFaqAccordion();
  initForms();
  initAuthTabs();
  initCarousels();
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
   ========================================================================== */
function initNumberCounters() {
  const counterItems = document.querySelectorAll('[data-counter-target]');
  if (!counterItems.length) return;

  const runCounter = (el) => {
    const target = parseFloat(el.getAttribute('data-counter-target'));
    const prefix = el.getAttribute('data-counter-prefix') || '';
    const suffix = el.getAttribute('data-counter-suffix') || '';
    const decimals = parseInt(el.getAttribute('data-counter-decimals') || '0', 10);
    const duration = 2000;
    const startTime = performance.now();

    const updateCount = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = (ease * target).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });

      el.textContent = `${prefix}${currentVal}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        el.textContent = `${prefix}${target.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        })}${suffix}`;
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
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?fm=webp&fit=crop&w=800&q=55'
  },
  commercial: {
    title: 'COMMERCIAL & INDUSTRIAL MICROGRIDS',
    tag: 'Enterprise • Demand Shaving',
    desc: 'Megawatt-scale rooftop and ground installations with smart power electronics. Designed to eliminate expensive peak demand utility surcharges, provide industrial backup, and achieve corporate ESG sustainability mandates with verified carbon offsets.',
    image: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?fm=webp&fit=crop&w=800&q=55'
  },
  community: {
    title: 'COMMUNITY & SHARED MICRO-STORAGE',
    tag: 'Co-ops • Distributed Grid',
    desc: 'Shared clean energy networks and wind-solar hybrid infrastructure engineered for suburban cooperatives, rural districts, and apartment complexes, enabling clean power access without requiring individual roof ownership.',
    image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?fm=webp&fit=crop&w=800&q=55'
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
      if (role === 'commercial') {
        roleLabel.textContent = 'Commercial Microgrid Fleet ID / Portal';
      } else {
        roleLabel.textContent = 'Residential System Account / Email';
      }
    });
  });
}
