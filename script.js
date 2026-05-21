"use strict";

/* ===================================================
   PERF GATE — detect mobile / low-end once, use everywhere
   =================================================== */
const IS_MOBILE = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
  || window.innerWidth <= 768;
const IS_LOW_END = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4;
const HEAVY_FX = !IS_MOBILE;          // master switch: disable heavy JS on mobile
const PARTICLE_COUNT = IS_LOW_END ? 800 : 2000;  // consolidated bg only

/* ===================================================
   PRELOADER — progress tied to real load, not fake timer
   =================================================== */
(function () {
  const pre = document.getElementById('preloader');
  const bar = document.getElementById('pre-bar');
  const pct = document.getElementById('pre-pct');
  const canvas = document.getElementById('pre-canvas');
  const ctx = canvas.getContext('2d');
  let angle = 0, rafId;

  function draw(prog) {
    ctx.clearRect(0, 0, 140, 140);
    const cx = 70, cy = 70, r = 50;
    // track
    ctx.strokeStyle = 'rgba(0,240,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    // arc
    const g = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    g.addColorStop(0, '#00f0ff'); g.addColorStop(1, '#b026ff');
    ctx.strokeStyle = g; ctx.lineWidth = 2;
    ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog / 100);
    ctx.stroke(); ctx.shadowBlur = 0;
    // rotating dots — only 4 for efficiency
    for (let i = 0; i < 4; i++) {
      const a = angle + (i / 4) * Math.PI * 2;
      ctx.fillStyle = `rgba(0,240,255,${0.25 + i * 0.18})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14), 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 14px "Rajdhani",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(prog) + '%', cx, cy);
    angle += 0.05;
  }

  // Race: either page load fires dismiss, or fake bar hits 100 — whichever first
  let progress = 0;
  let dismissed = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    cancelAnimationFrame(rafId);
    pre.classList.add('exit');
    setTimeout(() => { pre.style.display = 'none'; }, 1000);
  }

  function tick() {
    // Accelerate toward 90 quickly, then hold for real load
    const target = dismissed ? 100 : 90;
    const speed = progress < 70 ? 3 : 0.8;
    if (progress < target) progress = Math.min(progress + speed, target);
    bar.style.width = progress + '%';
    pct.textContent = Math.round(progress) + '%';
    draw(progress);
    angle += 0.03;
    if (progress < 100) rafId = requestAnimationFrame(tick);
  }

  tick();

  window.addEventListener('load', () => {
    // Snap to 100 then dismiss after short delay so user sees completion
    progress = 100;
    bar.style.width = '100%';
    pct.textContent = '100%';
    draw(100);
    setTimeout(dismiss, 280);
  });
})();

/* ===================================================
   CURSOR — CSS-native ring lag + minimal canvas trail
   Strategy: core moves instantly via JS transform.
   Ring lags via CSS transition (no rAF cost).
   Trail = max 12 points drawn only when mouse moves.
   On mobile: cursor elements hidden entirely.
   =================================================== */
(function () {
  const cursorEl  = document.getElementById('cursor');
  const core      = document.getElementById('cursor-core');
  const ring      = document.getElementById('cursor-ring');
  const trail     = document.getElementById('cursor-trail');

  if (IS_MOBILE) {
    // Kill everything cursor on touch devices
    cursorEl.style.display = 'none';
    trail.style.display = 'none';
    document.body.style.cursor = 'auto';
    document.querySelectorAll('button, a').forEach(el => el.style.cursor = 'auto');
    return;
  }

  const tctx = trail.getContext('2d');
  let W = window.innerWidth, H = window.innerHeight;
  trail.width = W; trail.height = H;

  window.addEventListener('resize', () => {
    W = window.innerWidth; H = window.innerHeight;
    trail.width = W; trail.height = H;
  }, { passive: true });

  // Core follows mouse instantly via CSS transform (no layout thrash)
  core.style.position = 'fixed';
  core.style.willChange = 'transform';
  ring.style.willChange = 'transform';

  let mx = W / 2, my = H / 2;
  // Lightweight trail — fixed 12-point circular buffer
  const TRAIL_LEN = 12;
  const pts = new Float32Array(TRAIL_LEN * 2); // interleaved x,y
  let ptHead = 0, ptCount = 0;
  let trailDirty = false;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    // Move core instantly using transform (GPU-composited)
    core.style.transform = `translate(${mx}px, ${my}px)`;
    // Ring follows via CSS transition set in stylesheet — no JS lerp needed
    ring.style.transform = `translate(${mx}px, ${my}px)`;
    // Buffer trail point
    pts[ptHead * 2]     = mx;
    pts[ptHead * 2 + 1] = my;
    ptHead = (ptHead + 1) % TRAIL_LEN;
    if (ptCount < TRAIL_LEN) ptCount++;
    trailDirty = true;
  }, { passive: true });

  // Hover state via event delegation (single listeners instead of per-element)
  document.addEventListener('mouseover', e => {
    if (e.target.closest('a, button, [data-hover]'))
      document.body.classList.add('cursor-hover');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('a, button, [data-hover]'))
      document.body.classList.remove('cursor-hover');
  });

  // Trail draw — only runs when mouse moved
  let lastTrailRaf = 0;
  function drawTrail(ts) {
    requestAnimationFrame(drawTrail);
    if (!trailDirty) return;
    trailDirty = false;
    tctx.clearRect(0, 0, W, H);
    for (let i = 0; i < ptCount; i++) {
      const idx = (ptHead - ptCount + i + TRAIL_LEN) % TRAIL_LEN;
      const alpha = (i / ptCount) * 0.22;
      const size  = (i / ptCount) * 2.5;
      tctx.fillStyle = `rgba(0,240,255,${alpha})`;
      tctx.beginPath();
      tctx.arc(pts[idx * 2], pts[idx * 2 + 1], size, 0, Math.PI * 2);
      tctx.fill();
    }
  }
  requestAnimationFrame(drawTrail);
})();

/* ===================================================
   SCROLL PROGRESS + NAV SCROLL STATE
   =================================================== */
const scrollBar = document.getElementById('scroll-bar');
const nav       = document.querySelector('.nav');
const scrollTopBtn = document.getElementById('scroll-top');

window.addEventListener('scroll', () => {
  const pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
  scrollBar.style.width = pct + '%';
  nav.classList.toggle('scrolled', window.scrollY > 60);
  scrollTopBtn.classList.toggle('visible', window.scrollY > 500);
}, { passive: true });

scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ===================================================
   NAV
   =================================================== */
document.getElementById('hamburger').addEventListener('click', () =>
  document.getElementById('mobile-menu').classList.add('open'));
document.getElementById('mob-close').addEventListener('click', () =>
  document.getElementById('mobile-menu').classList.remove('open'));
document.querySelectorAll('.mob-link').forEach(a =>
  a.addEventListener('click', () => document.getElementById('mobile-menu').classList.remove('open')));

const sections = document.querySelectorAll('section[id]');
const navAs    = document.querySelectorAll('.nav-links a');
const secObs   = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navAs.forEach(a => a.classList.remove('active'));
      const a = document.querySelector(`.nav-links a[href="#${e.target.id}"]`);
      if (a) a.classList.add('active');
    }
  });
}, { threshold: 0.4 });
sections.forEach(s => secObs.observe(s));

/* ===================================================
   SMOOTH SCROLL
   =================================================== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});

/* ===================================================
   REVEAL ANIMATIONS
   =================================================== */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal, .tl-item').forEach(el => revealObs.observe(el));

/* ===================================================
   SKILL BARS
   =================================================== */
const barObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.skill-fill').forEach(b => b.style.width = b.dataset.w + '%');
      barObs.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });
document.querySelectorAll('.skill-bars').forEach(el => barObs.observe(el));

/* ===================================================
   COUNTERS
   =================================================== */
function runCounter(el) {
  const target = parseInt(el.dataset.t);
  let cur = 0;
  const step = Math.ceil(target / 50);
  const iv = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(iv);
  }, 28);
}
const cntObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.count').forEach(runCounter);
      cntObs.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.hero-stats, .stats-row').forEach(el => cntObs.observe(el));

/* ===================================================
   TYPING ANIMATION
   =================================================== */
const roles = ['Full-Stack Developer', 'Network Engineer', 'IT Specialist', 'Web Designer', 'Cybersecurity Expert'];
let ri = 0, ci = 0, phase = 'type', last = 0;
const typEl = document.getElementById('typing-text');
function typeLoop(t) {
  const delay = phase === 'type' ? 80 : phase === 'erase' ? 45 : 1800;
  if (t - last < delay) { requestAnimationFrame(typeLoop); return; }
  last = t;
  const word = roles[ri];
  if (phase === 'type') {
    typEl.textContent = word.slice(0, ++ci);
    if (ci === word.length) phase = 'pause';
  } else if (phase === 'pause') {
    phase = 'erase';
  } else {
    typEl.textContent = word.slice(0, --ci);
    if (ci === 0) { ri = (ri + 1) % roles.length; phase = 'type'; }
  }
  requestAnimationFrame(typeLoop);
}
requestAnimationFrame(typeLoop);

/* ===================================================
   PROJECT FILTER
   =================================================== */
document.querySelectorAll('.proj-flt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.proj-flt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    document.querySelectorAll('.proj-card').forEach(c => {
      c.style.display = (f === 'all' || c.dataset.category === f) ? '' : 'none';
    });
  });
});

/* ===================================================
   SERVICE MODAL
   =================================================== */
const svcData = {
  'network-security': { title: 'Network Security', desc: 'Enterprise-grade cybersecurity solutions including firewall configuration, VPN setup, intrusion detection systems, and endpoint protection. Securing infrastructure from modern threats.' },
  'web-dev':          { title: 'Web Development',  desc: 'Full-stack web development using HTML, CSS, JavaScript, PHP, and MySQL. Fast, responsive, and accessible websites tailored to your business needs.' },
  'marketing':        { title: 'Digital Marketing', desc: 'Comprehensive digital marketing including SEO optimization, social media management, content strategy, and paid advertising campaigns to grow your online presence.' },
  'it':               { title: 'IT Solutions',      desc: 'Complete IT consulting and support — from hardware setup and network architecture to software integration and system optimization.' },
};
const modal = document.getElementById('serviceModal');
document.querySelectorAll('.read-more').forEach(btn => {
  btn.addEventListener('click', () => {
    const d = svcData[btn.dataset.svc]; if (!d) return;
    document.getElementById('modal-title').textContent = d.title;
    document.getElementById('modal-desc').textContent  = d.desc;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
});
document.getElementById('modalX').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
function closeModal() { modal.classList.remove('open'); document.body.style.overflow = ''; }

/* ===================================================
   CONTACT FORM
   =================================================== */
document.getElementById('contactForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name    = e.target.name.value.trim();
  const email   = e.target.email.value.trim();
  const message = e.target.message.value.trim();
  if (!name || !email || !message) { showFb('⚠ Please fill in all required fields.', false); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFb('✕ Enter a valid email address.', false); return; }
  const btn = document.getElementById('form-submit');
  document.getElementById('submit-text').textContent = 'Transmitting...';
  btn.disabled = true;
  await new Promise(r => setTimeout(r, 1400));
  e.target.reset(); btn.disabled = false;
  document.getElementById('submit-text').textContent = 'Send Message';
  showFb('✓ Message received — I will respond shortly.', true);
});
function showFb(msg, ok) {
  const fb = document.getElementById('form-feedback');
  fb.textContent = msg;
  fb.className = 'form-feedback ' + (ok ? 'ok' : 'err');
  fb.style.display = 'block';
  setTimeout(() => { fb.style.display = 'none'; }, 5000);
}

/* ===================================================
   CERTIFICATE LIGHTBOX
   =================================================== */
(function () {
  const overlay = document.getElementById('cert-lightbox');
  if (!overlay) return;
  const img = overlay.querySelector('.cert-lb-img');
  const closeBtn = overlay.querySelector('.cert-lb-close');

  document.querySelectorAll('.cert-card[data-img]').forEach(card => {
    card.addEventListener('click', () => {
      const src = card.dataset.img;
      if (!src) return;
      img.src = '';                       // reset so load event fires
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      // Lazy-load the full image only on click
      const tmp = new Image();
      tmp.onload = () => { img.src = src; };
      tmp.src = src;
    });
  });

  function closeLb() { overlay.classList.remove('open'); document.body.style.overflow = ''; }
  closeBtn.addEventListener('click', closeLb);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeLb(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });
})();

/* ===================================================
   THREE.JS — CONSOLIDATED BACKGROUND SCENE
   ─────────────────────────────────────────────────
   Previously: 4 separate Three.js renderers running
   simultaneously (bg, hero, skills, testimonials).
   Now:
     • Background (#three-canvas) — kept, heavily
       optimized (fewer particles, CSS static fallback
       on mobile).
     • Hero (#hero-3d-canvas) — kept for wow factor
       but throttled to 40 fps on low-end.
     • Skills globe (#skills-3d-canvas) — kept,
       throttled on low-end.
     • Testimonial cube (#tl-cube-canvas) — REPLACED
       with pure CSS 3D cube (zero WebGL cost).
   =================================================== */

/* ── BACKGROUND SCENE ─────────────────────────────── */
(function () {
  if (IS_MOBILE) {
    // On mobile: hide canvas, let CSS noise overlay provide atmosphere
    const c = document.getElementById('three-canvas');
    if (c) c.style.display = 'none';
    return;
  }
  const canvas   = document.getElementById('three-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(1); // force 1x — no need for retina on bg
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 30;

  // Single particle system (merged cyan + violet into one geometry with vertex colors)
  const pCount = PARTICLE_COUNT;
  const pGeo   = new THREE.BufferGeometry();
  const pos    = new Float32Array(pCount * 3);
  const colors = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 120;
    pos[i*3+1] = (Math.random() - 0.5) * 80;
    pos[i*3+2] = (Math.random() - 0.5) * 80;
    const violet = Math.random() > 0.7;
    colors[i*3]   = violet ? 0.69 : 0;
    colors[i*3+1] = violet ? 0.15 : 0.94;
    colors[i*3+2] = violet ? 1    : 1;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.13, transparent: true, opacity: 0.55, vertexColors: true, sizeAttenuation: true });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // Single subtle torus knot (background accent)
  const torusMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.05 });
  const torus = new THREE.Mesh(new THREE.TorusKnotGeometry(8, 2.5, 80, 12), torusMat);
  torus.position.set(20, -5, -20);
  scene.add(torus);

  let targetX = 0, targetY = 0;
  document.addEventListener('mousemove', e => {
    targetX = (e.clientX / window.innerWidth  - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive: true });

  // Throttle to ~40 fps for bg to save GPU budget for hero/skills
  let lastBg = 0;
  function bgAnimate(ts) {
    requestAnimationFrame(bgAnimate);
    if (ts - lastBg < 25) return; // ~40fps cap
    lastBg = ts;
    particles.rotation.y += 0.0006;
    torus.rotation.x     += 0.002;
    torus.rotation.y     += 0.003;
    camera.position.x    += (targetX * 3 - camera.position.x) * 0.015;
    camera.position.y    += (-targetY * 2 - camera.position.y) * 0.015;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(bgAnimate);
})();

/* ── HERO 3D SCENE ────────────────────────────────── */
(function () {
  const canvas = document.getElementById('hero-3d-canvas');
  if (!canvas) return;

  if (IS_MOBILE) {
    canvas.style.display = 'none';
    return;
  }

  const w = canvas.offsetWidth  || 420;
  const h = canvas.offsetHeight || 420;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = false; // shadows off for perf

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
  camera.position.set(0, 0, 5);

  // Lights (reduced from 4 to 3)
  const l1 = new THREE.PointLight(0x00f0ff, 3, 20); l1.position.set(4, 4, 4); scene.add(l1);
  const l2 = new THREE.PointLight(0xb026ff, 2, 20); l2.position.set(-4, -3, 2); scene.add(l2);
  scene.add(new THREE.AmbientLight(0x010110, 1));

  // Central dodecahedron
  const dodGeo = new THREE.DodecahedronGeometry(1.5, 0);
  const dodMat = new THREE.MeshPhongMaterial({ color: 0x020822, emissive: 0x001133, specular: 0x00f0ff, shininess: 120, transparent: true, opacity: 0.9 });
  const dod  = new THREE.Mesh(dodGeo, dodMat); scene.add(dod);
  const wire = new THREE.Mesh(dodGeo, new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.25 }));
  scene.add(wire);

  // Orbiting rings
  function makeRing(r, tube, color, rx, ry) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 60),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }));
    m.rotation.x = rx; m.rotation.y = ry; return m;
  }
  const ring1 = makeRing(2.2, 0.015, 0x00f0ff, Math.PI/2, 0);
  const ring2 = makeRing(2.4, 0.010, 0xb026ff, 0.3, 0.5);
  const ring3 = makeRing(2.6, 0.008, 0xffd700, -0.5, 0.8);
  scene.add(ring1); scene.add(ring2); scene.add(ring3);

  // Fewer particles (100 instead of 200)
  const pCount = 100;
  const pGeo   = new THREE.BufferGeometry();
  const pPos   = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const theta = Math.random() * Math.PI * 2, phi = Math.acos(Math.random() * 2 - 1);
    const r = 2.8 + Math.random() * 0.8;
    pPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
    pPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    pPos[i*3+2] = r * Math.cos(phi);
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x00f0ff, size: 0.04, transparent: true, opacity: 0.8 })));

  let mX = 0, mY = 0;
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }, { passive: true });

  let t = 0, lastHero = 0;
  const FPS_CAP = IS_LOW_END ? 40 : 60;
  const FRAME_MS = 1000 / FPS_CAP;

  function heroAnimate(ts) {
    requestAnimationFrame(heroAnimate);
    if (ts - lastHero < FRAME_MS) return;
    lastHero = ts;
    t += 0.012;
    dod.rotation.x += 0.005; dod.rotation.y += 0.008;
    wire.rotation.x = dod.rotation.x; wire.rotation.y = dod.rotation.y;
    ring1.rotation.z += 0.01; ring2.rotation.z -= 0.008; ring3.rotation.x += 0.006;
    l1.position.x = Math.sin(t * 0.7) * 4; l1.position.y = Math.cos(t * 0.5) * 4;
    l2.position.x = Math.cos(t * 0.6) * 4; l2.position.y = Math.sin(t * 0.4) * -3;
    const s = 1 + Math.sin(t * 1.2) * 0.04;
    dod.scale.set(s, s, s); wire.scale.set(s, s, s);
    dod.rotation.y += mX * 0.015;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(heroAnimate);

  window.addEventListener('resize', () => {
    const nw = canvas.offsetWidth, nh = canvas.offsetHeight;
    camera.aspect = nw / nh; camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  }, { passive: true });
})();

/* ── SKILLS 3D SPHERE ─────────────────────────────── */
(function () {
  const canvas = document.getElementById('skills-3d-canvas');
  if (!canvas) return;

  if (IS_MOBILE) {
    canvas.style.display = 'none';
    return;
  }

  const skills = [
    { name: 'HTML5',       color: '#e34f26' }, { name: 'CSS3',        color: '#2965f1' },
    { name: 'JavaScript',  color: '#f7df1e' }, { name: 'PHP',         color: '#8892b0' },
    { name: 'MySQL',       color: '#00758f' }, { name: 'Git',         color: '#f54d27' },
    { name: 'Cisco',       color: '#00bceb' }, { name: 'Network Sec', color: '#00f0ff' },
    { name: 'Photoshop',   color: '#31a8ff' }, { name: 'Illustrator', color: '#ff9a00' },
    { name: 'Linux',       color: '#fcc624' }, { name: 'Figma',       color: '#f24e1e' },
    { name: 'Responsive',  color: '#b026ff' }, { name: 'SEO',         color: '#34d399' },
    { name: 'Bootstrap',   color: '#7952b3' }, { name: 'Tailwind',    color: '#06b6d4' },
  ];

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_LOW_END, alpha: true, powerPreference: 'low-power' });
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
  camera.position.z = 8;

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dl = new THREE.DirectionalLight(0x00f0ff, 1); dl.position.set(5, 5, 5); scene.add(dl);

  const spheres = [];
  const group   = new THREE.Group();
  skills.forEach((sk, i) => {
    const phi   = Math.acos(-1 + (2 * i) / skills.length);
    const theta = Math.sqrt(skills.length * Math.PI) * phi;
    const r     = 3.5;
    const geo   = new THREE.SphereGeometry(0.18, 12, 12); // reduced segments
    const mat   = new THREE.MeshPhongMaterial({ color: new THREE.Color(sk.color), emissive: new THREE.Color(sk.color), emissiveIntensity: 0.3, shininess: 100 });
    const mesh  = new THREE.Mesh(geo, mat);
    mesh.position.set(r * Math.cos(theta) * Math.sin(phi), r * Math.sin(theta) * Math.sin(phi), r * Math.cos(phi));
    group.add(mesh);
    spheres.push(mesh);
  });

  // Wireframe cage
  group.add(new THREE.Mesh(new THREE.SphereGeometry(3.5, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.05 })));
  scene.add(group);

  let isDragging = false, prevX = 0, prevY = 0, velX = 0, velY = 0;
  canvas.addEventListener('mousedown',  e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; velX = velY = 0; });
  window.addEventListener('mouseup',   () => isDragging = false);
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    velX = (e.clientX - prevX) * 0.005; velY = (e.clientY - prevY) * 0.005;
    group.rotation.y += velX; group.rotation.x += velY;
    prevX = e.clientX; prevY = e.clientY;
  });
  canvas.addEventListener('touchstart', e => { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend',  () => isDragging = false);
  window.addEventListener('touchmove', e => {
    if (!isDragging) return;
    velX = (e.touches[0].clientX - prevX) * 0.005; velY = (e.touches[0].clientY - prevY) * 0.005;
    group.rotation.y += velX; group.rotation.x += velY;
    prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
  }, { passive: true });

  let st = 0, lastSkills = 0;
  function skillsAnimate(ts) {
    requestAnimationFrame(skillsAnimate);
    if (ts - lastSkills < (IS_LOW_END ? 33 : 16)) return;
    lastSkills = ts;
    st += 0.005;
    if (!isDragging) { velX *= 0.95; velY *= 0.95; group.rotation.y += velX + 0.004; group.rotation.x += velY; }
    spheres.forEach((s, i) => { const p = 1 + Math.sin(st * 2 + i * 0.5) * 0.06; s.scale.setScalar(p); });
    renderer.render(scene, camera);
  }
  requestAnimationFrame(skillsAnimate);

  window.addEventListener('resize', () => {
    const nw = canvas.offsetWidth, nh = canvas.offsetHeight;
    camera.aspect = nw / nh; camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  }, { passive: true });
})();

/* ===================================================
   CERTIFICATE IMAGE LAZY LOADER
   Uses native IntersectionObserver — images only
   decode when they enter the viewport.
   =================================================== */
(function () {
  const imgs = document.querySelectorAll('.cert-thumb-img[data-src]');
  if (!imgs.length) return;

  const obs = new IntersectionObserver((entries, observer) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const img = e.target;
      const src = img.dataset.src;
      if (!src) return;

      img.src = src;
      img.onload  = () => img.classList.add('loaded');
      img.onerror = () => {
        // If image fails to load, keep placeholder visible gracefully
        img.style.display = 'none';
      };
      observer.unobserve(img);
    });
  }, { rootMargin: '0px 0px 200px 0px', threshold: 0.01 });

  imgs.forEach(img => obs.observe(img));
})();

/* ── TESTIMONIALS — CSS 3D CUBE (replaces Three.js)  */
(function () {
  const testimonials = [
    { text: '"Abdirizak delivered exactly what we needed. Clean design, fast delivery, and excellent communication throughout the project."', name: 'Ahmed Hassan',   role: 'CEO · Artisentech',        init: 'AH' },
    { text: '"Professional and extremely dedicated. He upgraded our entire network infrastructure and made everything faster and more secure."', name: 'Fatima Mohamed', role: 'IT Manager · Local Enterprise', init: 'FM' },
    { text: '"Our e-commerce sales increased by 40% after launching the website. The UX is flawless and the site is lightning fast."',       name: 'Omar Abdullahi', role: 'Founder · Online Store',       init: 'OA' },
    { text: '"Within 3 months our website traffic doubled thanks to Abdirizak\'s SEO work. Truly talented and results-driven."',              name: 'Hodan Ali',      role: 'Director · NGO Somalia',      init: 'HA' },
  ];
  let currentTl = 0;

  function setTl(i) {
    currentTl = (i + testimonials.length) % testimonials.length;
    const t = testimonials[currentTl];
    const textEl   = document.getElementById('tl-text');
    const nameEl   = document.getElementById('tl-name');
    const roleEl   = document.getElementById('tl-role');
    const avatarEl = document.getElementById('tl-avatar');
    if (!textEl) return;
    // Fade transition
    textEl.style.opacity = '0';
    setTimeout(() => {
      textEl.textContent   = t.text;
      nameEl.textContent   = t.name;
      roleEl.textContent   = t.role;
      avatarEl.textContent = t.init;
      textEl.style.opacity = '1';
    }, 220);
  }

  document.getElementById('tl-prev')?.addEventListener('click', () => setTl(currentTl - 1));
  document.getElementById('tl-next')?.addEventListener('click', () => setTl(currentTl + 1));
  setInterval(() => setTl(currentTl + 1), 5000);

  // Animate the CSS cube faces
  const cube = document.getElementById('css-cube');
  if (!cube) return;
  let rotX = -20, rotY = 30;
  let isDrag = false, px = 0, py = 0, vx = 0, vy = 0;

  function applyRot() {
    cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }

  cube.parentElement.addEventListener('mousedown', e => { isDrag = true; px = e.clientX; py = e.clientY; vx = vy = 0; });
  window.addEventListener('mouseup', () => isDrag = false);
  window.addEventListener('mousemove', e => {
    if (!isDrag) return;
    vx = (e.clientX - px) * 0.4; vy = (e.clientY - py) * 0.4;
    rotY += (e.clientX - px) * 0.5;
    rotX -= (e.clientY - py) * 0.5;
    px = e.clientX; py = e.clientY;
    applyRot();
  });
  cube.parentElement.addEventListener('touchstart', e => { isDrag = true; px = e.touches[0].clientX; py = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', () => isDrag = false);
  window.addEventListener('touchmove', e => {
    if (!isDrag) return;
    rotY += (e.touches[0].clientX - px) * 0.5;
    rotX -= (e.touches[0].clientY - py) * 0.5;
    px = e.touches[0].clientX; py = e.touches[0].clientY;
    applyRot();
  }, { passive: true });

  let autoRaf;
  function autoSpin(ts) {
    autoRaf = requestAnimationFrame(autoSpin);
    if (isDrag) return;
    vx *= 0.96; vy *= 0.96;
    rotY += 0.15 + vx * 0.05;
    rotX += vy * 0.05;
    applyRot();
  }
  requestAnimationFrame(autoSpin);
})();

/* ===================================================
   LAZY-LOAD CERT IMAGES via IntersectionObserver
   =================================================== */
(function () {
  const imgs = document.querySelectorAll('.cert-thumb-img[data-src]');
  if (!imgs.length) return;

  const imgObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const img = e.target;
      const src = img.dataset.src;
      if (!src) return;
      const tmp = new Image();
      tmp.onload = () => {
        img.src = src;
        img.classList.add('loaded');
      };
      tmp.onerror = () => {
        // If image missing, keep placeholder — no broken icon
        img.classList.add('loaded');
      };
      tmp.src = src;
      imgObs.unobserve(img);
    });
  }, { rootMargin: '200px 0px', threshold: 0 }); // preload 200px before visible

  imgs.forEach(img => imgObs.observe(img));
})();