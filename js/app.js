/**
 * SPICES PnC — app.js
 */

// Fix image paths for file:// protocol
window.addEventListener('error', (e) => {
  const t = e.target;
  if (t && t.tagName === 'IMG') {
    const src = t.getAttribute('src');
    if (src && src.startsWith('/') && !t.dataset.fallbackTried) {
      t.dataset.fallbackTried = 'true';
      t.src = src.replace(/^\/+/, '');
    }
  }
}, true);

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initHeroScroll();
  initMenuFilters();
  initLightbox();
  initReveal();
});

/* NAVBAR */
function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  // Mobile menu (hamburger)
  const toggle = document.getElementById('navToggle');
  if (toggle) {
    const setOpen = (open) => {
      nav.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('nav-open')));
    nav.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('click', (e) => { if (!nav.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 768) setOpen(false); });
  }
}

/* ============================================================
   HERO SCROLL — Windows Virtual Desktop Style Plate Switcher
   Scroll-scrubbed on Desktop (>768px), Timed Slide (0.65s) on Mobile (<=768px)
   ============================================================ */
function initHeroScroll() {
  const spacer   = document.getElementById('heroSpacer');
  const pinned   = document.getElementById('heroPinned') || spacer;
  const plates   = [
    document.querySelector('.plate-sukha'),
    document.querySelector('.plate-moderate'),
    document.querySelector('.plate-gilo'),
  ];
  const thumbs   = document.querySelectorAll('.orbital-thumb-btn');
  const badge    = document.getElementById('heroDishBadge');
  const name     = document.getElementById('heroDishName');
  const price    = document.getElementById('heroDishPrice');
  const dishCard = document.getElementById('heroDishCard');

  if (!spacer || !plates[0]) {
    console.error('Hero elements missing — check HTML');
    return;
  }

  const data = [
    { badge: 'SUKHA',    name: 'Sukha Chatpate',    price: 'Rs. 65 / 40' },
    { badge: 'MODERATE', name: 'Moderate Chatpate',  price: 'Rs. 65 / 40' },
    { badge: 'GILO',     name: 'Gilo Chatpate',      price: 'Rs. 70 / 45' },
  ];

  const mqlDesktop = window.matchMedia('(min-width: 769px)');
  const mqlReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let activeIndex = 0;
  let desktopCurrentPos = 0;
  let desktopTargetPos = 0;
  let rafId = null;
  let isInitialMobile = true;

  // Smoothstep function over [min, max]
  function smoothstep(min, max, val) {
    const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
    return t * t * (3 - 2 * t);
  }

  // Smoothstep transitions around 33% and 66% marks (+/- 9% of scroll progress)
  function getDesktopTargetPos(pct) {
    const t1 = 0.33;
    const t2 = 0.66;
    const delta = 0.09;

    if (pct < t1 - delta) {
      return 0;
    }
    if (pct < t1 + delta) {
      return smoothstep(t1 - delta, t1 + delta, pct);
    }
    if (pct < t2 - delta) {
      return 1;
    }
    if (pct < t2 + delta) {
      return 1 + smoothstep(t2 - delta, t2 + delta, pct);
    }
    return 2;
  }

  function updateDishUI(idx) {
    if (activeIndex === idx) return;
    activeIndex = idx;

    thumbs.forEach((t, i) => t.classList.toggle('active', i === idx));
    if (badge) badge.textContent = data[idx].badge;
    if (name)  name.textContent  = data[idx].name;
    if (price) price.textContent = data[idx].price;

    if (dishCard) {
      dishCard.classList.remove('swap', 'dish-updated');
      void dishCard.offsetWidth;
      dishCard.classList.add('swap');
    }
  }

  // --- REDUCED MOTION ---
  function renderReducedMotion(idx) {
    updateDishUI(idx);
    plates.forEach((p, i) => {
      if (!p) return;
      p.style.transition = 'none';
      p.style.transform = 'none';
      p.style.opacity = i === idx ? '1' : '0';
      p.style.pointerEvents = i === idx ? 'auto' : 'none';
      p.style.zIndex = i === idx ? '2' : '1';
    });
  }

  // --- COMPUTER / DESKTOP (live scrubbed, smoothed via rAF at ~18% per frame) ---
  function applyDesktopTransforms(pos) {
    plates.forEach((plate, i) => {
      if (!plate) return;
      const d = i - pos;
      const tx = d * 95; // 95% of plate width
      const rot = d * 6; // slight rotation of d * 6deg
      const op = Math.max(0, 1 - Math.abs(d) * 1.15);

      plate.style.transition = 'none';
      plate.style.transform = `translateX(${tx.toFixed(3)}%) rotate(${rot.toFixed(3)}deg)`;
      plate.style.opacity = op.toFixed(4);
      plate.style.pointerEvents = Math.abs(d) < 0.4 ? 'auto' : 'none';
      plate.style.zIndex = Math.round(10 - Math.abs(d) * 5);
    });

    const nearestIdx = Math.round(Math.max(0, Math.min(2, pos)));
    updateDishUI(nearestIdx);
  }

  function desktopRafLoop() {
    const diff = desktopTargetPos - desktopCurrentPos;
    if (Math.abs(diff) > 0.0002) {
      desktopCurrentPos += diff * 0.18; // ease movement toward target (~18% per frame)
      applyDesktopTransforms(desktopCurrentPos);
      rafId = requestAnimationFrame(desktopRafLoop);
    } else {
      desktopCurrentPos = desktopTargetPos;
      applyDesktopTransforms(desktopCurrentPos);
      rafId = null;
    }
  }

  function onDesktopScroll(pct) {
    desktopTargetPos = getDesktopTargetPos(pct);
    if (!rafId) {
      rafId = requestAnimationFrame(desktopRafLoop);
    }
  }

  // --- MOBILE (screen <= 768px: timed slide ~0.65s on active plate change) ---
  function setMobilePlate(idx, animate = true) {
    updateDishUI(idx);

    plates.forEach((plate, i) => {
      if (!plate) return;

      if (!animate || isInitialMobile) {
        plate.style.transition = 'none';
      } else {
        plate.style.transition = 'transform 0.65s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.65s cubic-bezier(0.25, 1, 0.5, 1)';
      }

      if (i === idx) {
        // Active plate centered
        plate.style.transform = 'translateX(0%) rotate(0deg)';
        plate.style.opacity = '1';
        plate.style.pointerEvents = 'auto';
        plate.style.zIndex = '2';
      } else if (i < idx) {
        // Passed plates wait on left with opacity 0
        plate.style.transform = 'translateX(-95%) rotate(-6deg)';
        plate.style.opacity = '0';
        plate.style.pointerEvents = 'none';
        plate.style.zIndex = '1';
      } else {
        // Upcoming plates wait on right with opacity 0
        plate.style.transform = 'translateX(95%) rotate(6deg)';
        plate.style.opacity = '0';
        plate.style.pointerEvents = 'none';
        plate.style.zIndex = '1';
      }
    });

    if (isInitialMobile) {
      void pinned.offsetWidth;
      isInitialMobile = false;
    }
  }

  function onMobileScroll(pct) {
    let nextIdx = 0;
    if (pct < 0.33) {
      nextIdx = 0;
    } else if (pct < 0.66) {
      nextIdx = 1;
    } else {
      nextIdx = 2;
    }
    if (nextIdx !== activeIndex) {
      setMobilePlate(nextIdx, true);
    }
  }

  // --- SCROLL DRIVER ---
  function getScrollPct() {
    const rect = spacer.getBoundingClientRect();
    const total = spacer.offsetHeight - window.innerHeight;
    const scrolled = -rect.top;
    return total > 0 ? Math.max(0, Math.min(1, scrolled / total)) : 0;
  }

  function handleScroll() {
    const pct = getScrollPct();

    if (mqlReduced.matches) {
      const idx = pct < 0.33 ? 0 : pct < 0.66 ? 1 : 2;
      renderReducedMotion(idx);
      return;
    }

    if (mqlDesktop.matches) {
      onDesktopScroll(pct);
    } else {
      onMobileScroll(pct);
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  // Mode switcher (resize / breakpoint change)
  function handleModeChange() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    const pct = getScrollPct();
    if (mqlReduced.matches) {
      const idx = pct < 0.33 ? 0 : pct < 0.66 ? 1 : 2;
      renderReducedMotion(idx);
    } else if (mqlDesktop.matches) {
      desktopTargetPos = getDesktopTargetPos(pct);
      desktopCurrentPos = desktopTargetPos;
      applyDesktopTransforms(desktopCurrentPos);
    } else {
      const idx = pct < 0.33 ? 0 : pct < 0.66 ? 1 : 2;
      setMobilePlate(idx, false);
    }
  }

  mqlDesktop.addEventListener('change', handleModeChange);
  mqlReduced.addEventListener('change', handleModeChange);

  // Initialize layout immediately
  handleModeChange();

  // ScrollTo helper for thumbnails & swipe
  function scrollToPlate(i) {
    const top = spacer.getBoundingClientRect().top + window.pageYOffset;
    const total = spacer.offsetHeight - window.innerHeight;
    const targets = [0.08, 0.50, 0.90];
    const targetY = top + total * targets[i];
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  }

  // Thumbnail buttons keep working
  thumbs.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const i = parseInt(btn.dataset.plate, 10);
      if (mqlReduced.matches) {
        renderReducedMotion(i);
      } else if (!mqlDesktop.matches) {
        setMobilePlate(i, true);
      }
      scrollToPlate(i);
    });
  });

  // Mobile Touch Swipe Gesture Support (Swipe left/right to change plates)
  let touchStartX = 0;
  let touchStartY = 0;

  pinned.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  pinned.addEventListener('touchend', (e) => {
    const diffX = e.changedTouches[0].screenX - touchStartX;
    const diffY = e.changedTouches[0].screenY - touchStartY;

    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        const next = Math.min(2, activeIndex + 1);
        if (next !== activeIndex) {
          if (!mqlDesktop.matches && !mqlReduced.matches) {
            setMobilePlate(next, true);
          }
          scrollToPlate(next);
        }
      } else {
        const prev = Math.max(0, activeIndex - 1);
        if (prev !== activeIndex) {
          if (!mqlDesktop.matches && !mqlReduced.matches) {
            setMobilePlate(prev, true);
          }
          scrollToPlate(prev);
        }
      }
    }
  }, { passive: true });
}

/* MENU FILTERS */
function initMenuFilters() {
  const btns    = document.querySelectorAll('.menu-filter-btn');
  const secs    = {
    chatpate : document.getElementById('chatpateSection'),
    puri     : document.getElementById('puriSection'),
    combo    : document.getElementById('comboSection'),
  };

  if (!btns.length) return;

  function show(key, visible) {
    const el = secs[key];
    if (!el) return;
    el.style.display = visible ? 'block' : 'none';
  }

  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      show('chatpate', f === 'all' || f === 'chatpate');
      show('puri',     f === 'all' || f === 'puri');
      show('combo',    f === 'all' || f === 'combo');
    });
  });
}

/* LIGHTBOX */
function initLightbox() {
  const cards    = document.querySelectorAll('.wall-photo-card');
  const lightbox = document.querySelector('.lightbox-modal');
  const lbImg    = lightbox?.querySelector('.lightbox-img');
  const lbClose  = lightbox?.querySelector('.lightbox-close');

  if (!lightbox || !cards.length || !lbImg) return;

  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const img = card.querySelector('img');
      if (!img) return;
      lbImg.src = img.src;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  const close = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  };

  lbClose?.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/* SCROLL REVEAL (subtle fade-up as elements enter the screen) */
function initReveal() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const groups = [
    '.menu-header, .gallery-header, .vibe-header, .combos-panel-header',
    '.menu-filter-btn',
    '.menu-card, .combo-card, .puri-card-simple, .extra-card',
    '.vibe-card-minimal',
    '.wall-photo-card',
    '.location-info > *, .info-item',
    '.location-map-card',
    '.footer-inner > *'
  ];
  const targets = [];
  groups.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const idx = Array.prototype.indexOf.call(el.parentElement.children, el);
      el.style.setProperty('--rd', (Math.min(idx, 5) * 70) + 'ms');
      el.setAttribute('data-reveal', '');
      targets.push(el);
    });
  });

  document.documentElement.classList.add('js-anim');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  targets.forEach((el) => io.observe(el));
}
