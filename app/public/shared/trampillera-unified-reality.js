/* TRAMPILLERA MEDIA — Unified Reality banner integration.
   Uses the application's existing global state and routers; no parallel fake controls. */
(() => {
  'use strict';
  const root = document.getElementById('unified-reality-banner');
  if (!root || root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';
  const $ = (selector) => root.querySelector(selector);
  const region = $('#ur-region');
  const status = $('#ur-globe-status');
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer, scene, camera, controls, earth, raf = 0, resizeObserver;
  let targetRotation = { x: 0, y: 0 };
  let webglReady = false;
  const regions = {
    GLOBAL: { label: 'GLOBAL', lat: 20, lon: 0 },
    EUROPE: { label: 'EUROPE', lat: 50, lon: 15 },
    AMERICAS: { label: 'AMERICAS', lat: 38, lon: -95 },
    ASIA: { label: 'ASIA', lat: 35, lon: 110 },
    AFRICA_ME: { label: 'MENA', lat: 25, lon: 42 }
  };
  function setStatus(message, state) {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state || 'unknown';
  }
  function fallbackTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const sea = ctx.createLinearGradient(0, 0, 0, 512);
    sea.addColorStop(0, '#061a35'); sea.addColorStop(.5, '#0b4771'); sea.addColorStop(1, '#061a35');
    ctx.fillStyle = sea; ctx.fillRect(0, 0, 1024, 512);
    const land = [
      [[90,105],[145,65],[225,72],[265,115],[250,170],[205,205],[180,260],[145,235],[115,180]],
      [[215,275],[275,285],[310,345],[290,420],[260,475],[235,405],[220,335]],
      [[455,100],[525,70],[585,100],[565,160],[505,180],[470,150]],
      [[465,190],[545,180],[605,230],[585,330],[535,405],[500,350],[480,275]],
      [[590,95],[700,65],[825,95],[900,160],[865,220],[780,245],[700,220],[635,175]],
      [[780,310],[850,300],[890,350],[860,405],[800,390]]
    ];
    ctx.fillStyle = '#54785a';
    land.forEach(poly => { ctx.beginPath(); poly.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.fill(); });
    ctx.strokeStyle = 'rgba(104,205,220,.18)'; ctx.lineWidth = 1;
    for(let y=0;y<=512;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1024,y);ctx.stroke();}
    for(let x=0;x<=1024;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke();}
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace || texture.colorSpace;
    return texture;
  }
  function initGlobe() {
    const canvas = $('#ur-earth-canvas');
    if (!canvas || !window.THREE || !THREE.WebGLRenderer) { setStatus('3D unavailable · portal remains functional', 'fallback'); return; }
    try {
      const width = Math.max(1, root.clientWidth);
      const height = Math.max(1, root.clientHeight);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(38, width / height, .1, 100);
      camera.position.set(0, 0, 9.4);
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace || renderer.outputColorSpace;
      const material = new THREE.MeshPhongMaterial({ map: fallbackTexture(), bumpScale: .035, shininess: 8, specular: new THREE.Color(0x29445a), emissive: new THREE.Color(0x07101b), emissiveIntensity: .28 });
      earth = new THREE.Mesh(new THREE.SphereGeometry(2.8, 64, 64), material);
      earth.position.set(width < 640 ? 1.5 : width < 980 ? 2.1 : 2.8, 0, 0);
      earth.rotation.z = 23.4 * Math.PI / 180;
      scene.add(earth);
      const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(2.88, 64, 64), new THREE.MeshBasicMaterial({ color: 0x08bfe4, transparent: true, opacity: .09, side: THREE.BackSide }));
      atmosphere.position.copy(earth.position); scene.add(atmosphere);
      scene.add(new THREE.AmbientLight(0x8caac5, .78));
      const sun = new THREE.DirectionalLight(0xffffff, 1.55); sun.position.set(-4, 3, 7); scene.add(sun);
      const rim = new THREE.DirectionalLight(0x00bfe9, 1.1); rim.position.set(5, -2, -5); scene.add(rim);
      const starsGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(1100 * 3);
      for (let i=0;i<positions.length;i++) positions[i]=(Math.random()-.5)*45;
      starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions,3));
      scene.add(new THREE.Points(starsGeometry,new THREE.PointsMaterial({color:0xb9d8ef,size:.045,transparent:true,opacity:.62})));
      if (THREE.OrbitControls) {
        controls = new THREE.OrbitControls(camera, root);
        controls.target.copy(earth.position);
        controls.enableDamping = true; controls.dampingFactor = .055;
        controls.enablePan = false; controls.enableZoom = true;
        controls.minDistance = 6.2; controls.maxDistance = 14;
        controls.autoRotate = !reducedMotion; controls.autoRotateSpeed = .32;
        controls.rotateSpeed = .55;
      }
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg', texture => {
        if (!earth || !earth.material) return;
        texture.colorSpace = THREE.SRGBColorSpace || texture.colorSpace;
        earth.material.map = texture; earth.material.needsUpdate = true;
      }, undefined, () => setStatus('Procedural globe · external texture unavailable', 'fallback'));
      webglReady = true;
      setStatus('3D globe ready · drag to rotate · wheel to zoom', 'ready');
      const render = () => {
        if (!webglReady) return;
        if (earth && !controls && !reducedMotion) earth.rotation.y += .0008;
        if (controls) controls.update();
        renderer.render(scene, camera);
        raf = window.requestAnimationFrame(render);
      };
      render();
      const resize = () => {
        if (!renderer || !camera) return;
        const w = Math.max(1, root.clientWidth), h = Math.max(1, root.clientHeight);
        camera.aspect = w / h; camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        if (earth) {
          const x = w < 640 ? 1.55 : w < 980 ? 2.1 : 2.8;
          earth.position.x = x;
          if (controls) controls.target.set(x,0,0);
        }
      };
      if (window.ResizeObserver) { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(root); }
      else window.addEventListener('resize', resize, { passive: true });
    } catch (error) {
      webglReady = false;
      setStatus('3D unavailable · portal remains functional', 'fallback');
      try { if (renderer) renderer.dispose(); } catch (_) {}
    }
  }
  function focusRegion(key) {
    const item = regions[key] || regions.GLOBAL;
    root.dataset.region = key;
    const badge = $('#ur-region-badge');
    if (badge) badge.textContent = '· ' + item.label;
    if (region && region.value !== key) region.value = key;
    if (earth) {
      targetRotation.y = -item.lon * Math.PI / 180;
      targetRotation.x = item.lat * Math.PI / 180;
      earth.rotation.y = targetRotation.y;
      earth.rotation.x = targetRotation.x;
    }
    if (controls && camera) {
      controls.autoRotate = false;
      window.setTimeout(() => { if (controls && !reducedMotion) controls.autoRotate = true; }, 6500);
    }
    try { if (typeof playTactileSound === 'function') playTactileSound('snap'); } catch (_) {}
  }
  function safeCall(fn) { try { if (typeof fn === 'function') fn(); } catch (error) { console.warn('[Unified Reality]', error); } }
  root.querySelectorAll('[data-ur-realm]').forEach(button => {
    button.addEventListener('click', () => {
      const realm = button.dataset.urRealm;
      safeCall(() => typeof RealmRouter !== 'undefined' && RealmRouter.switchRealm(realm));
      root.querySelectorAll('[data-ur-realm]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    });
  });
  region?.addEventListener('change', () => focusRegion(region.value));
  $('#ur-jarviser')?.addEventListener('click', () => {
    safeCall(() => typeof JarvisOrchestrator !== 'undefined' && JarvisOrchestrator.open());
  });
  $('#ur-cycle-region')?.addEventListener('click', () => {
    const keys = Object.keys(regions); const next = (keys.indexOf(region?.value || 'GLOBAL') + 1) % keys.length; focusRegion(keys[next]);
  });
  $('#ur-time-travel')?.addEventListener('click', () => {
    const dock = document.getElementById('time-travel-dock');
    if (dock) { dock.classList.toggle('visible'); safeCall(() => typeof SnapshotStore !== 'undefined' && SnapshotStore.updateSliderUI()); }
  });
  $('#ur-fui-save')?.addEventListener('click', () => safeCall(() => typeof FUIWorkspace !== 'undefined' && FUIWorkspace.save()));
  $('#ur-assistant')?.addEventListener('click', () => safeCall(() => typeof MischiefNavigator !== 'undefined' && MischiefNavigator.toggle()));
  $('#ur-passport')?.addEventListener('click', () => safeCall(() => typeof MV !== 'undefined' && MV.openPassport()));
  $('#ur-globe-open')?.addEventListener('click', () => {
    safeCall(() => typeof RealmRouter !== 'undefined' && RealmRouter.switchRealm('classic'));
    safeCall(() => typeof Router !== 'undefined' && Router.go('globe'));
  });
  $('#ur-camera-reset')?.addEventListener('click', () => {
    focusRegion('GLOBAL');
    if (camera && controls) { camera.position.set(0,0,9.4); controls.target.copy(earth.position); controls.update(); }
  });
  $('#ur-zoom-in')?.addEventListener('click', () => { if (camera && controls) { camera.position.addScaledVector(camera.position.clone().sub(controls.target).normalize(), -.65); controls.update(); } });
  $('#ur-zoom-out')?.addEventListener('click', () => { if (camera && controls) { camera.position.addScaledVector(camera.position.clone().sub(controls.target).normalize(), .65); controls.update(); } });

  const language = $('#global-lang');
  language?.addEventListener('change', () => {
    const pill = $('#ur-language-pill'); if (pill) pill.textContent = '🌐 ' + language.value;
  });
  const controlLink = $('#ur-control-plane');
  if (controlLink) {
    fetch('/api/platform/status', { credentials: 'same-origin' })
      .then(response => { if (!response.ok) throw new Error('API unavailable'); return response.json(); })
      .then(data => {
        controlLink.dataset.apiStatus = data.status === 'available' ? 'available' : 'unknown';
        controlLink.title = 'Platform API status: ' + String(data.status || 'unknown') + '. Open authenticated Control Plane.';
      })
      .catch(() => { controlLink.dataset.apiStatus = 'offline'; controlLink.title = 'Platform API is not reachable. Open Control Plane to inspect.'; });
  }
  const realmSections = ['intro','fui','classic'].map(name => document.getElementById('realm-' + name)).filter(Boolean);
  const syncRealmState = () => {
    const active = realmSections.find(section => section.classList.contains('active'));
    const current = active ? active.id.replace('realm-','') : 'intro';
    root.querySelectorAll('[data-ur-realm]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.urRealm === current)));
  };
  if (window.MutationObserver && realmSections.length) {
    const observer = new MutationObserver(syncRealmState);
    realmSections.forEach(section => observer.observe(section, { attributes: true, attributeFilter: ['class'] }));
  }
  syncRealmState();
  root.querySelectorAll('[data-ur-social]').forEach(link => link.setAttribute('rel','noopener noreferrer'));
  initGlobe();
  if (language) { const pill = $('#ur-language-pill'); if (pill) pill.textContent = '🌐 ' + language.value; }
  focusRegion('GLOBAL');
  window.addEventListener('pagehide', () => {
    webglReady = false; if (raf) cancelAnimationFrame(raf);
    if (resizeObserver) resizeObserver.disconnect();
    if (controls) controls.dispose();
    if (renderer) renderer.dispose();
  }, { once: true });
})();
