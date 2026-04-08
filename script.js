 
"use strict";

/* ===================================================
   PRELOADER
   =================================================== */
(function(){
  const pre = document.getElementById('preloader');
  const bar = document.getElementById('pre-bar');
  const pct = document.getElementById('pre-pct');
  const canvas = document.getElementById('pre-canvas');
  const ctx = canvas.getContext('2d');
  let progress = 0;
  let animId;
  let angle = 0;

  function drawLoader(prog) {
    ctx.clearRect(0, 0, 140, 140);
    const cx = 70, cy = 70, r = 50;
    ctx.strokeStyle = 'rgba(0,240,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    const grad = ctx.createLinearGradient(cx-r, cy, cx+r, cy);
    grad.addColorStop(0, '#00f0ff');
    grad.addColorStop(1, '#b026ff');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * prog/100));
    ctx.stroke();
    ctx.shadowBlur = 0;
    // rotating dots
    for (let i = 0; i < 6; i++) {
      const a = angle + (i / 6) * Math.PI * 2;
      const x = cx + Math.cos(a) * (r - 15);
      const y = cy + Math.sin(a) * (r - 15);
      ctx.fillStyle = `rgba(0,240,255,${0.2 + i * 0.13})`;
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 16px "Rajdhani", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(prog) + '%', cx, cy);
    angle += 0.04;
  }

  function animate() {
    if (progress < 100) {
      progress += 1.2;
      if (progress > 100) progress = 100;
      bar.style.width = progress + '%';
      pct.textContent = Math.round(progress) + '%';
      drawLoader(progress);
      animId = requestAnimationFrame(animate);
    } else {
      setTimeout(() => {
        pre.classList.add('exit');
        setTimeout(() => { pre.style.display = 'none'; }, 1100);
      }, 300);
    }
  }
  window.addEventListener('load', () => { animate(); });
  animate();
})();

/* ===================================================
   CURSOR
   =================================================== */
const cursorEl = document.getElementById('cursor');
const cursorCore = document.getElementById('cursor-core');
const cursorRing = document.getElementById('cursor-ring');
const trailCanvas = document.getElementById('cursor-trail');
const tctx = trailCanvas.getContext('2d');

let mouseX = window.innerWidth/2, mouseY = window.innerHeight/2;
let ringX = mouseX, ringY = mouseY;
const trail = [];

function resizeTrail() {
  trailCanvas.width = window.innerWidth;
  trailCanvas.height = window.innerHeight;
}
resizeTrail();
window.addEventListener('resize', resizeTrail);

document.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  cursorCore.style.left = mouseX + 'px';
  cursorCore.style.top = mouseY + 'px';
  trail.push({ x: mouseX, y: mouseY, age: 0 });
  if (trail.length > 30) trail.shift();
});

document.querySelectorAll('a, button, [data-hover]').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});

(function cursorLoop() {
  ringX += (mouseX - ringX) * 0.1;
  ringY += (mouseY - ringY) * 0.1;
  cursorRing.style.left = ringX + 'px';
  cursorRing.style.top = ringY + 'px';

  tctx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
  for (let i = 0; i < trail.length; i++) {
    trail[i].age++;
    const alpha = Math.max(0, 0.3 - trail[i].age * 0.015);
    const size = Math.max(0.5, 3 - trail[i].age * 0.1);
    tctx.fillStyle = `rgba(0,240,255,${alpha})`;
    tctx.beginPath();
    tctx.arc(trail[i].x, trail[i].y, size, 0, Math.PI*2);
    tctx.fill();
  }
  requestAnimationFrame(cursorLoop);
})();

/* ===================================================
   SCROLL PROGRESS
   =================================================== */
window.addEventListener('scroll', () => {
  const pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
  document.getElementById('scroll-bar').style.width = pct + '%';
  document.querySelector('.nav').classList.toggle('scrolled', window.scrollY > 60);
  document.getElementById('scroll-top').classList.toggle('visible', window.scrollY > 500);
}, { passive: true });

document.getElementById('scroll-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ===================================================
   NAV
   =================================================== */
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.add('open');
});
document.getElementById('mob-close').addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.remove('open');
});
document.querySelectorAll('.mob-link').forEach(a => {
  a.addEventListener('click', () => document.getElementById('mobile-menu').classList.remove('open'));
});

// Active nav on scroll
const sections = document.querySelectorAll('section[id]');
const navAs = document.querySelectorAll('.nav-links a');
const secObs = new IntersectionObserver(entries => {
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
      e.target.querySelectorAll('.skill-fill').forEach(b => {
        b.style.width = b.dataset.w + '%';
      });
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
  } else if (phase === 'erase') {
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
      const show = f === 'all' || c.dataset.category === f;
      c.style.display = show ? '' : 'none';
    });
  });
});

/* ===================================================
   SERVICE MODAL
   =================================================== */
const svcData = {
  'network-security': { title: 'Network Security', desc: 'Enterprise-grade cybersecurity solutions including firewall configuration, VPN setup, intrusion detection systems, and endpoint protection. Securing infrastructure from modern threats.' },
  'web-dev': { title: 'Web Development', desc: 'Full-stack web development using HTML, CSS, JavaScript, PHP, and MySQL. Fast, responsive, and accessible websites tailored to your business needs.' },
  'marketing': { title: 'Digital Marketing', desc: 'Comprehensive digital marketing including SEO optimization, social media management, content strategy, and paid advertising campaigns to grow your online presence.' },
  'it': { title: 'IT Solutions', desc: 'Complete IT consulting and support — from hardware setup and network architecture to software integration and system optimization.' },
};
const modal = document.getElementById('serviceModal');
document.querySelectorAll('.read-more').forEach(btn => {
  btn.addEventListener('click', () => {
    const d = svcData[btn.dataset.svc];
    if (!d) return;
    document.getElementById('modal-title').textContent = d.title;
    document.getElementById('modal-desc').textContent = d.desc;
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
  const name = e.target.name.value.trim();
  const email = e.target.email.value.trim();
  const message = e.target.message.value.trim();
  const fb = document.getElementById('form-feedback');
  if (!name || !email || !message) { showFb('⚠ Please fill in all required fields.', false); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFb('✕ Enter a valid email address.', false); return; }
  const btn = document.getElementById('form-submit');
  document.getElementById('submit-text').textContent = 'Transmitting...';
  btn.disabled = true;
  await new Promise(r => setTimeout(r, 1400));
  e.target.reset();
  btn.disabled = false;
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
   BACKGROUND THREE.JS SCENE
   =================================================== */
(function() {
  const reducer = navigator.hardwareConcurrency <= 4;
  const canvas = document.getElementById('three-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 30;

  // Particle field
  const pCount = reducer ? 1000 : 3000;
  const pGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(pCount * 3);
  const pSizes = new Float32Array(pCount);
  for (let i = 0; i < pCount; i++) {
    pPositions[i*3] = (Math.random() - 0.5) * 120;
    pPositions[i*3+1] = (Math.random() - 0.5) * 80;
    pPositions[i*3+2] = (Math.random() - 0.5) * 80;
    pSizes[i] = Math.random() * 2 + 0.5;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  pGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));

  const pMat = new THREE.PointsMaterial({
    color: 0x00f0ff,
    size: 0.12,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // Some larger violet particles
  const pGeo2 = new THREE.BufferGeometry();
  const pPos2 = new Float32Array((reducer ? 300 : 800) * 3);
  for (let i = 0; i < pPos2.length; i++) pPos2[i] = (Math.random() - 0.5) * 100;
  pGeo2.setAttribute('position', new THREE.BufferAttribute(pPos2, 3));
  const pMat2 = new THREE.PointsMaterial({ color: 0xb026ff, size: 0.18, transparent: true, opacity: 0.4 });
  scene.add(new THREE.Points(pGeo2, pMat2));

  // Moving wireframe torus knot
  const torusGeo = new THREE.TorusKnotGeometry(8, 2.5, 128, 16);
  const torusMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.08 });
  const torus = new THREE.Mesh(torusGeo, torusMat);
  torus.position.set(20, -5, -20);
  scene.add(torus);

  // Mouse parallax
  let targetX = 0, targetY = 0;
  document.addEventListener('mousemove', e => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let frameCount = 0;
  function bgAnimate() {
    requestAnimationFrame(bgAnimate);
    frameCount++;
    particles.rotation.y += 0.0008;
    particles.rotation.x += 0.0003;
    torus.rotation.x += 0.003;
    torus.rotation.y += 0.004;
    camera.position.x += (targetX * 3 - camera.position.x) * 0.02;
    camera.position.y += (-targetY * 2 - camera.position.y) * 0.02;
    // Pulse particle color
    if (frameCount % 120 === 0) {
      pMat.opacity = 0.3 + Math.random() * 0.5;
    }
    renderer.render(scene, camera);
  }
  bgAnimate();
})();

/* ===================================================
   HERO 3D SCENE — MORPHING DODECAHEDRON
   =================================================== */
(function() {
  const canvas = document.getElementById('hero-3d-canvas');
  const w = canvas.offsetWidth || 420;
  const h = canvas.offsetHeight || 420;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, w/h, 0.1, 100);
  camera.position.set(0, 0, 5);

  // Point lights
  const l1 = new THREE.PointLight(0x00f0ff, 3, 20);
  l1.position.set(4, 4, 4); scene.add(l1);
  const l2 = new THREE.PointLight(0xb026ff, 2, 20);
  l2.position.set(-4, -3, 2); scene.add(l2);
  const l3 = new THREE.PointLight(0xffd700, 1.5, 15);
  l3.position.set(0, 5, -3); scene.add(l3);
  scene.add(new THREE.AmbientLight(0x010110, 1));

  // Central dodecahedron
  const dodGeo = new THREE.DodecahedronGeometry(1.5, 0);
  const dodMat = new THREE.MeshPhongMaterial({
    color: 0x020822,
    emissive: 0x001133,
    specular: 0x00f0ff,
    shininess: 120,
    transparent: true,
    opacity: 0.9,
  });
  const dod = new THREE.Mesh(dodGeo, dodMat);
  dod.castShadow = true;
  scene.add(dod);

  // Wireframe overlay
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.25 });
  const wire = new THREE.Mesh(dodGeo, wireMat);
  scene.add(wire);

  // Orbiting rings
  function makeRing(r, tube, color, rotX, rotY) {
    const g = new THREE.TorusGeometry(r, tube, 16, 100);
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
    const mesh = new THREE.Mesh(g, m);
    mesh.rotation.x = rotX; mesh.rotation.y = rotY;
    return mesh;
  }
  const ring1 = makeRing(2.2, 0.015, 0x00f0ff, Math.PI/2, 0);
  const ring2 = makeRing(2.4, 0.01, 0xb026ff, 0.3, 0.5);
  const ring3 = makeRing(2.6, 0.008, 0xffd700, -0.5, 0.8);
  scene.add(ring1); scene.add(ring2); scene.add(ring3);

  // Particles around
  const pCount = 200;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const r = 2.8 + Math.random() * 0.8;
    pPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
    pPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    pPos[i*3+2] = r * Math.cos(phi);
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0x00f0ff, size: 0.04, transparent: true, opacity: 0.8 });
  scene.add(new THREE.Points(pGeo, pMat));

  // Mouse interaction
  let mX = 0, mY = 0;
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  // Scroll link
  let scrollProgress = 0;
  window.addEventListener('scroll', () => {
    scrollProgress = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
  }, { passive: true });

  let t = 0;
  function heroAnimate() {
    requestAnimationFrame(heroAnimate);
    t += 0.012;
    const speed = 1 + scrollProgress * 3;
    dod.rotation.x += 0.005 * speed;
    dod.rotation.y += 0.008 * speed;
    wire.rotation.x = dod.rotation.x;
    wire.rotation.y = dod.rotation.y;
    ring1.rotation.z += 0.01;
    ring2.rotation.z -= 0.008;
    ring3.rotation.x += 0.006;
    // Light animation
    l1.position.x = Math.sin(t * 0.7) * 4;
    l1.position.y = Math.cos(t * 0.5) * 4;
    l2.position.x = Math.cos(t * 0.6) * 4;
    l2.position.y = Math.sin(t * 0.4) * -3;
    // Scale pulse
    const s = 1 + Math.sin(t * 1.2) * 0.04;
    dod.scale.set(s, s, s);
    wire.scale.set(s, s, s);
    // Mouse parallax
    dod.rotation.y += (mX * 0.02 - dod.rotation.y * 0.01);
    renderer.render(scene, camera);
  }
  heroAnimate();

  window.addEventListener('resize', () => {
    const nw = canvas.offsetWidth, nh = canvas.offsetHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });
})();

/* ===================================================
   SKILLS 3D SPHERE — INTERACTIVE TAG CLOUD
   =================================================== */
(function() {
  const canvas = document.getElementById('skills-3d-canvas');
  const skills = [
    { name: 'HTML5', color: '#e34f26' },
    { name: 'CSS3', color: '#2965f1' },
    { name: 'JavaScript', color: '#f7df1e' },
    { name: 'PHP', color: '#8892b0' },
    { name: 'MySQL', color: '#00758f' },
    { name: 'Git', color: '#f54d27' },
    { name: 'Cisco', color: '#00bceb' },
    { name: 'Network Sec', color: '#00f0ff' },
    { name: 'Photoshop', color: '#31a8ff' },
    { name: 'Illustrator', color: '#ff9a00' },
    { name: 'Linux', color: '#fcc624' },
    { name: 'Figma', color: '#f24e1e' },
    { name: 'Responsive', color: '#b026ff' },
    { name: 'SEO', color: '#34d399' },
    { name: 'Bootstrap', color: '#7952b3' },
    { name: 'Tailwind', color: '#06b6d4' },
  ];

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, w/h, 0.1, 100);
  camera.position.z = 8;

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dl = new THREE.DirectionalLight(0x00f0ff, 1);
  dl.position.set(5, 5, 5);
  scene.add(dl);

  // Create sphere of spheres for each skill
  const spheres = [];
  skills.forEach((sk, i) => {
    const phi = Math.acos(-1 + (2 * i) / skills.length);
    const theta = Math.sqrt(skills.length * Math.PI) * phi;
    const radius = 3.5;
    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(phi);

    const geo = new THREE.SphereGeometry(0.18, 16, 16);
    const mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(sk.color),
      emissive: new THREE.Color(sk.color),
      emissiveIntensity: 0.3,
      shininess: 100,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.userData = { skill: sk.name, origPos: new THREE.Vector3(x, y, z) };
    scene.add(mesh);
    spheres.push(mesh);
  });

  // Wireframe sphere cage
  const cageGeo = new THREE.SphereGeometry(3.5, 16, 12);
  const cageMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.05 });
  scene.add(new THREE.Mesh(cageGeo, cageMat));

  // Drag to rotate
  let isDragging = false, prevX = 0, prevY = 0, velX = 0, velY = 0;
  let autoRotX = 0, autoRotY = 0;
  const group = new THREE.Group();
  spheres.forEach(s => group.add(s));
  // move cage to group
  scene.add(group);

  canvas.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; velX = velY = 0; });
  window.addEventListener('mouseup', () => { isDragging = false; });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    velX = (e.clientX - prevX) * 0.005;
    velY = (e.clientY - prevY) * 0.005;
    group.rotation.y += velX;
    group.rotation.x += velY;
    prevX = e.clientX; prevY = e.clientY;
  });
  canvas.addEventListener('touchstart', e => { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', () => { isDragging = false; });
  window.addEventListener('touchmove', e => {
    if (!isDragging) return;
    velX = (e.touches[0].clientX - prevX) * 0.005;
    velY = (e.touches[0].clientY - prevY) * 0.005;
    group.rotation.y += velX;
    group.rotation.x += velY;
    prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
  }, { passive: true });

  let st = 0;
  function skillsAnimate() {
    requestAnimationFrame(skillsAnimate);
    st += 0.005;
    if (!isDragging) {
      velX *= 0.95; velY *= 0.95;
      group.rotation.y += velX + 0.004;
      group.rotation.x += velY;
    }
    // Pulsate each sphere
    spheres.forEach((s, i) => {
      const pulse = 1 + Math.sin(st * 2 + i * 0.5) * 0.06;
      s.scale.setScalar(pulse);
    });
    renderer.render(scene, camera);
  }
  skillsAnimate();

  window.addEventListener('resize', () => {
    const nw = canvas.offsetWidth, nh = canvas.offsetHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });
})();

/* ===================================================
   TESTIMONIAL CUBE
   =================================================== */
(function() {
  const testimonials = [
    { text: '"Abdirizak delivered exactly what we needed. Clean design, fast delivery, and excellent communication throughout the project."', name: 'Ahmed Hassan', role: 'CEO · Artisentech', init: 'AH' },
    { text: '"Professional and extremely dedicated. He upgraded our entire network infrastructure and made everything faster and more secure."', name: 'Fatima Mohamed', role: 'IT Manager · Local Enterprise', init: 'FM' },
    { text: '"Our e-commerce sales increased by 40% after launching the website. The UX is flawless and the site is lightning fast."', name: 'Omar Abdullahi', role: 'Founder · Online Store', init: 'OA' },
    { text: '"Within 3 months our website traffic doubled thanks to Abdirizak\'s SEO work. Truly talented and results-driven."', name: 'Hodan Ali', role: 'Director · NGO Somalia', init: 'HA' },
  ];
  let currentTl = 0;

  function setTl(i) {
    currentTl = (i + testimonials.length) % testimonials.length;
    const t = testimonials[currentTl];
    document.getElementById('tl-text').textContent = t.text;
    document.getElementById('tl-name').textContent = t.name;
    document.getElementById('tl-role').textContent = t.role;
    document.getElementById('tl-avatar').textContent = t.init;
  }

  document.getElementById('tl-prev').addEventListener('click', () => setTl(currentTl - 1));
  document.getElementById('tl-next').addEventListener('click', () => setTl(currentTl + 1));
  setInterval(() => setTl(currentTl + 1), 5000);

  // Cube canvas
  const canvas = document.getElementById('tl-cube-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, w/h, 0.1, 100);
  camera.position.z = 5;

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const pl1 = new THREE.PointLight(0x00f0ff, 3, 15);
  pl1.position.set(4, 4, 4); scene.add(pl1);
  const pl2 = new THREE.PointLight(0xb026ff, 2, 12);
  pl2.position.set(-4, -2, 2); scene.add(pl2);

  const cubeGeo = new THREE.BoxGeometry(2.5, 2.5, 2.5);
  const cubeMat = new THREE.MeshPhongMaterial({
    color: 0x020822,
    emissive: 0x001133,
    specular: 0x00f0ff,
    shininess: 150,
    transparent: true,
    opacity: 0.85,
  });
  const cube = new THREE.Mesh(cubeGeo, cubeMat);
  scene.add(cube);

  const wireGeo = new THREE.BoxGeometry(2.55, 2.55, 2.55);
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.3 });
  const cubeWire = new THREE.Mesh(wireGeo, wireMat);
  scene.add(cubeWire);

  // Orbiting particles
  const opGeo = new THREE.BufferGeometry();
  const opPos = new Float32Array(120 * 3);
  for (let i = 0; i < 120; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const r = 2.2 + Math.random() * 0.6;
    opPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
    opPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    opPos[i*3+2] = r * Math.cos(phi);
  }
  opGeo.setAttribute('position', new THREE.BufferAttribute(opPos, 3));
  const opMat = new THREE.PointsMaterial({ color: 0x00f0ff, size: 0.04, transparent: true, opacity: 0.7 });
  scene.add(new THREE.Points(opGeo, opMat));

  // Drag
  let isDrag = false, px = 0, py = 0, vx = 0, vy = 0;
  canvas.addEventListener('mousedown', e => { isDrag = true; px = e.clientX; py = e.clientY; });
  window.addEventListener('mouseup', () => { isDrag = false; });
  window.addEventListener('mousemove', e => {
    if (!isDrag) return;
    vx = (e.clientX - px) * 0.01; vy = (e.clientY - py) * 0.01;
    cube.rotation.y += vx; cube.rotation.x += vy;
    cubeWire.rotation.y = cube.rotation.y;
    cubeWire.rotation.x = cube.rotation.x;
    px = e.clientX; py = e.clientY;
  });
  canvas.addEventListener('touchstart', e => { isDrag = true; px = e.touches[0].clientX; py = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', () => { isDrag = false; });
  window.addEventListener('touchmove', e => {
    if (!isDrag) return;
    vx = (e.touches[0].clientX - px) * 0.01; vy = (e.touches[0].clientY - py) * 0.01;
    cube.rotation.y += vx; cube.rotation.x += vy;
    cubeWire.rotation.y = cube.rotation.y; cubeWire.rotation.x = cube.rotation.x;
    px = e.touches[0].clientX; py = e.touches[0].clientY;
  }, { passive: true });

  let ct = 0;
  function cubeAnimate() {
    requestAnimationFrame(cubeAnimate);
    ct += 0.01;
    if (!isDrag) {
      vx *= 0.96; vy *= 0.96;
      cube.rotation.y += vx + 0.006;
      cube.rotation.x += vy + 0.002;
      cubeWire.rotation.y = cube.rotation.y;
      cubeWire.rotation.x = cube.rotation.x;
    }
    pl1.position.x = Math.sin(ct * 0.8) * 4;
    pl1.position.y = Math.cos(ct * 0.6) * 3;
    pl2.position.x = Math.cos(ct * 0.7) * 4;
    renderer.render(scene, camera);
  }
  cubeAnimate();

  window.addEventListener('resize', () => {
    const nw = canvas.offsetWidth, nh = canvas.offsetHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });
})();

 