// Dark / light mode toggle
const themeToggle = document.getElementById('themeToggle');
const root = document.documentElement;
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
  root.classList.add('dark');
}

themeToggle.addEventListener('click', () => {
  root.classList.toggle('dark');
  localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light');
});

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Expand all / collapse all toggle for sections built from <details> elements
document.querySelectorAll('.toggle-all-btn').forEach(btn => {
  const container = document.querySelector(btn.dataset.target);
  if (!container) return;
  const items = () => Array.from(container.querySelectorAll('details'));

  function syncLabel() {
    const all = items();
    const allOpen = all.length > 0 && all.every(d => d.open);
    btn.textContent = allOpen ? 'Collapse all' : 'Expand all';
  }

  btn.addEventListener('click', () => {
    const all = items();
    const allOpen = all.length > 0 && all.every(d => d.open);
    all.forEach(d => { d.open = !allOpen; });
    syncLabel();
    requestLabelUpdate();
  });

  items().forEach(d => d.addEventListener('toggle', syncLabel));
  syncLabel();
});

// Scroll reveal
const reveal = document.querySelectorAll('.fade-up, .fade-in-up');
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Hero content is above the fold; reveal it immediately rather than waiting on scroll.
document.querySelectorAll('.hero .fade-up').forEach(el => el.classList.add('in-view'));

if (prefersReduced) {
  reveal.forEach(el => el.classList.add('in-view'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  reveal.forEach(el => observer.observe(el));
}

// Nav background shift on scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    nav.style.boxShadow = '0 8px 24px -12px rgba(0,0,0,0.15)';
  } else {
    nav.style.boxShadow = 'none';
  }
});

// Vertical section label: position is fully computed here rather than via
// CSS position:sticky, because sticky's "stuck" offset is anchored to the
// viewport with no awareness of (a) the fixed nav bar overlapping the top of
// the page, or (b) the last section on the page, which can never scroll far
// enough for a viewport-anchored offset to land safely inside it (there's no
// content below it to scroll into). Instead, each frame: find the vertical
// strip of the section that's actually visible (clipped to the viewport and
// below the nav), center the label within that strip, then clamp so the
// label's own rotated height never pushes it outside the section's real
// top/bottom edges. If it can't fit at all, hide it instead of overlapping.
const labelWraps = Array.from(document.querySelectorAll('.vert-label-wrap'))
  .map(wrap => ({ wrap, section: wrap.closest('section'), label: wrap.querySelector('.vert-label') }))
  .filter(item => item.section && item.label);

const NAV_CLEARANCE = 90;

let labelTicking = false;
function updateActiveLabel() {
  // Pass 1: figure out which section currently dominates the viewport (most
  // visible height below the nav). Only that section's label is allowed to
  // show — otherwise, whenever two adjacent sections are both partly in
  // view, both labels could legitimately "fit" and show at once.
  let dominantSection = null;
  let dominantVisible = 0;
  labelWraps.forEach(({ section }) => {
    const r = section.getBoundingClientRect();
    const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, NAV_CLEARANCE);
    if (visible > dominantVisible) {
      dominantVisible = visible;
      dominantSection = section;
    }
  });

  labelWraps.forEach(({ wrap, section, label }) => {
    if (section !== dominantSection) {
      wrap.style.opacity = 0;
      return;
    }

    const sectionRect = section.getBoundingClientRect();
    const labelHeight = label.offsetWidth; // pre-rotation width becomes the rotated height
    const half = labelHeight / 2;

    const visTop = Math.max(sectionRect.top, NAV_CLEARANCE);
    const visBottom = Math.min(sectionRect.bottom, window.innerHeight);

    if (visBottom - visTop < labelHeight * 0.4 || sectionRect.bottom <= NAV_CLEARANCE || sectionRect.top >= window.innerHeight) {
      wrap.style.opacity = 0;
      return;
    }

    let center = (visTop + visBottom) / 2;
    center = Math.max(sectionRect.top + half, Math.min(sectionRect.bottom - half, center));
    center = Math.max(NAV_CLEARANCE + half, center);

    if (center - half < sectionRect.top - 1 || center + half > sectionRect.bottom + 1) {
      wrap.style.opacity = 0;
      return;
    }

    label.style.top = (center - sectionRect.top) + 'px';
    wrap.style.opacity = 1;
  });
  labelTicking = false;
}
function requestLabelUpdate() {
  if (!labelTicking) {
    labelTicking = true;
    requestAnimationFrame(updateActiveLabel);
  }
}
window.addEventListener('scroll', requestLabelUpdate, { passive: true });
window.addEventListener('resize', requestLabelUpdate);
document.querySelectorAll('details').forEach(d => d.addEventListener('toggle', requestLabelUpdate));
updateActiveLabel();
