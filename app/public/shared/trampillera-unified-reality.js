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
  let webglReady = false;
  let sunLight, ambientLight, rimLight, clouds, atmosphere, stars;
  let targetCameraPosition = null, solarTimer = 0, orbitTargetX = 0;
  let timeOffsetHours = 0, currentRegionKey = 'GLOBAL', lastSolarPhase = '', atmosphereBoost = true;
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
  function fallbackTextures() {
    const width = 1024, height = 512;
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = width; diffuseCanvas.height = height;
    const d = diffuseCanvas.getContext('2d');
    const nightCanvas = document.createElement('canvas');
    nightCanvas.width = width; nightCanvas.height = height;
    const n = nightCanvas.getContext('2d');
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = width; cloudCanvas.height = height;
    const c = cloudCanvas.getContext('2d');

    const ocean = d.createLinearGradient(0, 0, 0, height);
    ocean.addColorStop(0, '#092347'); ocean.addColorStop(.5, '#104a8e'); ocean.addColorStop(1, '#092347');
    d.fillStyle = ocean; d.fillRect(0, 0, width, height);
    n.fillStyle = '#02050b'; n.fillRect(0, 0, width, height);

    const landmasses = [
      [[90,105],[145,65],[225,72],[265,115],[250,170],[205,205],[180,260],[145,235],[115,180]],
      [[215,275],[275,285],[310,345],[290,420],[260,475],[235,405],[220,335]],
      [[455,100],[525,70],[585,100],[565,160],[505,180],[470,150]],
      [[465,190],[545,180],[605,230],[585,330],[535,405],[500,350],[480,275]],
      [[590,95],[700,65],[825,95],[900,160],[865,220],[780,245],[700,220],[635,175]],
      [[780,310],[850,300],[890,350],[860,405],[800,390]]
    ];
    landmasses.forEach((poly, index) => {
      d.beginPath();
      poly.forEach((point, i) => i ? d.lineTo(point[0], point[1]) : d.moveTo(point[0], point[1]));
      d.closePath(); d.fillStyle = index === 2 ? '#c5d5e5' : '#54785a'; d.fill();
      if (index !== 2) {
        const cx = poly.reduce((sum, p) => sum + p[0], 0) / poly.length;
        const cy = poly.reduce((sum, p) => sum + p[1], 0) / poly.length;
        for (let i = 0; i < 85; i++) {
          n.fillStyle = 'rgba(255,190,95,.72)';
          n.beginPath(); n.arc(cx + (Math.random() - .5) * 85, cy + (Math.random() - .5) * 55, 1.1, 0, Math.PI * 2); n.fill();
        }
      }
    });
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * width, y = Math.random() * height;
      c.fillStyle = 'rgba(255,255,255,.22)';
      c.beginPath(); c.ellipse(x, y, 22 + Math.random() * 75, 5 + Math.random() * 14, -.2, 0, Math.PI * 2); c.fill();
    }
    const make = canvas => {
      const texture = new THREE.CanvasTexture(canvas);
      if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    return { diffuse: make(diffuseCanvas), night: make(nightCanvas), clouds: make(cloudCanvas) };
  }
  function initGlobe() {
    const canvas = $('#ur-earth-canvas');
    if (!canvas || !window.THREE || !THREE.WebGLRenderer) {
      setStatus('3D unavailable · portal remains functional', 'fallback');
      return;
    }
    try {
      const width = Math.max(1, root.clientWidth);
      const height = Math.max(1, root.clientHeight);
      const radius = 3.5;
      // Keep the Earth at the scene origin. The orbit target is deliberately
      // offset, matching the reference banner's wide orbital composition.
      orbitTargetX = width > 640 ? Math.min(4.5, width * (4.5 / 1440)) : 0;
      const viewTarget = new THREE.Vector3(orbitTargetX, 0, 0);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, width / height, .1, 120);
      camera.position.set(0, 0, 10);
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;

      const fallback = fallbackTextures();
      const material = new THREE.MeshPhongMaterial({
        map: fallback.diffuse,
        bumpMap: fallback.diffuse,
        bumpScale: .045,
        emissiveMap: fallback.night,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: .62,
        shininess: 8,
        specular: new THREE.Color(0x29445a)
      });
      earth = new THREE.Mesh(new THREE.SphereGeometry(radius, 72, 72), material);
      earth.position.set(0, 0, 0);
      earth.rotation.z = 23.5 * Math.PI / 180;
      scene.add(earth);

      const cloudMaterial = new THREE.MeshPhongMaterial({
        map: fallback.clouds, transparent: true, opacity: .34, depthWrite: false,
        blending: THREE.NormalBlending, shininess: 0
      });
      clouds = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.006, 64, 64), cloudMaterial);
      clouds.position.copy(earth.position);
      scene.add(clouds);

      atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.045, 64, 64),
        new THREE.MeshBasicMaterial({ color: 0x00cde8, transparent: true, opacity: .14, side: THREE.BackSide, blending: THREE.AdditiveBlending })
      );
      atmosphere.position.copy(earth.position);
      scene.add(atmosphere);

      ambientLight = new THREE.AmbientLight(0x18253a, .78);
      sunLight = new THREE.DirectionalLight(0xffffff, 1.55);
      rimLight = new THREE.DirectionalLight(0x00bfe9, 1.1);
      sunLight.position.set(5, 3, 7);
      rimLight.position.set(-5, -2, -5);
      scene.add(ambientLight, sunLight, rimLight);

      const starsGeometry = new THREE.BufferGeometry();
      const starCount = 3000;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starPositions.length; i++) starPositions[i] = (Math.random() - .5) * 95;
      starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({
        color: 0xd9eaff, size: .065, transparent: true, opacity: .72
      }));
      scene.add(stars);

      if (THREE.OrbitControls) {
        controls = new THREE.OrbitControls(camera, root);
        controls.target.copy(viewTarget);
        controls.enableDamping = true;
        controls.dampingFactor = .055;
        controls.enablePan = false;
        controls.enableZoom = true;
        controls.minDistance = 5;
        controls.maxDistance = 15;
        controls.rotateSpeed = .62;
        controls.zoomSpeed = .8;
        controls.autoRotate = !reducedMotion;
        controls.autoRotateSpeed = .5;
      }

      const textureLoader = new THREE.TextureLoader();
      const loadTexture = (url, onLoad, onError) => textureLoader.load(url, texture => {
        if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
        onLoad(texture);
      }, undefined, onError);
      loadTexture('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg', texture => {
        if (earth && earth.material) { earth.material.map = texture; earth.material.needsUpdate = true; }
      }, () => setStatus('Procedural Earth texture active', 'fallback'));
      loadTexture('https://unpkg.com/three-globe/example/img/earth-topology.png', texture => {
        if (earth && earth.material) { earth.material.bumpMap = texture; earth.material.needsUpdate = true; }
      }, () => {});
      loadTexture('https://unpkg.com/three-globe/example/img/earth-night.jpg', texture => {
        if (earth && earth.material) { earth.material.emissiveMap = texture; earth.material.needsUpdate = true; }
      }, () => {});
      loadTexture('https://unpkg.com/three-globe/example/img/earth-clouds.png', texture => {
        if (clouds && clouds.material) { clouds.material.map = texture; clouds.material.needsUpdate = true; }
      }, () => {});

      const interactive = root.querySelectorAll('button, a, select, input');
      interactive.forEach(element => element.addEventListener('pointerdown', event => event.stopPropagation()));
      // OrbitControls is bound to the complete banner, not the canvas or globe.
      // This lets a drag begin anywhere in the empty banner space.
      root.style.touchAction = 'none';
      root.style.cursor = 'grab';
      root.addEventListener('pointerdown', event => {
        if (!event.target.closest('button, a, select, input')) root.style.cursor = 'grabbing';
      });
      const releaseOrbitPointer = () => { root.style.cursor = 'grab'; };
      window.addEventListener('pointerup', releaseOrbitPointer, { passive: true });
      window.addEventListener('pointercancel', releaseOrbitPointer, { passive: true });

      webglReady = true;
      setStatus('3D globe ready · drag to rotate · wheel to zoom', 'ready');
      updateSolarLighting();
      const render = () => {
        if (!webglReady) return;
        if (targetCameraPosition && camera) {
          camera.position.lerp(targetCameraPosition, .075);
          if (camera.position.distanceTo(targetCameraPosition) < .035) targetCameraPosition = null;
          if (controls) controls.update();
        }
        if (controls) controls.update();
        if (stars) stars.rotation.y += .00012;
        if (clouds) clouds.rotation.y += .00016;
        renderer.render(scene, camera);
        raf = window.requestAnimationFrame(render);
      };
      render();
      solarTimer = window.setInterval(updateSolarLighting, 30000);

      const resize = () => {
        if (!renderer || !camera) return;
        const w = Math.max(1, root.clientWidth), h = Math.max(1, root.clientHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        orbitTargetX = w > 640 ? Math.min(4.5, w * (4.5 / 1440)) : 0;
        if (currentRegionKey === 'GLOBAL' && controls) {
          controls.target.set(orbitTargetX, 0, 0);
          controls.update();
        }
      };
      if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(root);
      } else window.addEventListener('resize', resize, { passive: true });
      window.GlobeAPI = {
        controls, earth, camera,
        focusRegion,
        zoomStep,
        resetCameraView,
        nudgeEarth,
        stepSimTime,
        toggleAtmosphereBoost,
        toggleAutoRotate
      };
      root.addEventListener('wheel', () => {}, { passive: true });
    } catch (error) {
      webglReady = false;
      setStatus('3D unavailable · portal remains functional', 'fallback');
      console.warn('[Unified Reality] globe initialization failed', error);
      try { if (renderer) renderer.dispose(); } catch (_) {}
    }
  }

  function updateSolarLighting() {
    if (!sunLight) return;
    const simulated = new Date(Date.now() + timeOffsetHours * 3600000);
    const utcHours = simulated.getUTCHours() + simulated.getUTCMinutes() / 60;
    const sunAngle = (utcHours / 24) * Math.PI * 2 - Math.PI;
    const lat = (regions[currentRegionKey] || regions.GLOBAL).lat * Math.PI / 180;
    sunLight.position.set(Math.cos(sunAngle) * 12, Math.sin(sunAngle) * 7 + Math.sin(lat) * 2, 8);
    const phase = Math.abs(Math.sin(sunAngle)) < .32 ? 'TWILIGHT' : Math.sin(sunAngle) < -.15 ? 'NIGHT GLOW' : 'DAYLIGHT';
    const phaseLabel = $('#solar-phase-label');
    if (phaseLabel) phaseLabel.textContent = phase;
    if (phase !== lastSolarPhase) {
      lastSolarPhase = phase;
      setStatus('3D globe ready · ' + phase + (timeOffsetHours ? ' · T+' + timeOffsetHours + 'H' : ''), 'ready');
    }
  }

  function focusRegion(key) {
    const aliases = { EUROPE:'EUROPE', europe:'EUROPE', ASIA:'ASIA', asia:'ASIA', japan:'ASIA', tokyo:'ASIA', AMERICAS:'AMERICAS', america:'AMERICAS', usa:'AMERICAS', newyork:'AMERICAS', AFRICA_ME:'AFRICA_ME', middleeast:'AFRICA_ME', dubai:'AFRICA_ME', africa:'AFRICA_ME', GLOBAL:'GLOBAL', global:'GLOBAL' };
    const normalizedKey = String(key || 'GLOBAL').toLowerCase().replace(/\s+/g, '');
    currentRegionKey = aliases[normalizedKey] || 'GLOBAL';
    const item = regions[currentRegionKey];
    root.dataset.region = currentRegionKey;
    const badge = $('#ur-region-badge');
    if (badge) badge.textContent = '· ' + item.label;
    if (region && region.value !== currentRegionKey) region.value = currentRegionKey;
    if (controls) controls.autoRotate = false;
    if (camera && earth && THREE) {
      if (currentRegionKey === 'GLOBAL') {
        targetCameraPosition = null;
        if (controls) {
          controls.target.set(orbitTargetX, 0, 0);
          controls.autoRotate = !reducedMotion;
        }
        camera.position.set(0, 0, 8.6);
        if (controls) controls.update();
        updateSolarLighting();
        safeCall(() => typeof playTactileSound === 'function' && playTactileSound('snap'));
        return;
      }
      const distance = Math.max(controls ? controls.minDistance + .35 : 6.4, Math.min(controls ? controls.maxDistance - .5 : 13, camera.position.distanceTo(earth.position)));
      const phi = (90 - item.lat) * Math.PI / 180;
      const theta = (item.lon + 180) * Math.PI / 180;
      const target = new THREE.Vector3(
        -distance * Math.sin(phi) * Math.cos(theta),
        distance * Math.cos(phi),
        distance * Math.sin(phi) * Math.sin(theta)
      );
      targetCameraPosition = earth.position.clone().add(target);
      if (controls) controls.target.copy(earth.position);
      window.setTimeout(() => {
        if (controls && !reducedMotion) controls.autoRotate = true;
      }, 8000);
    }
    updateSolarLighting();
    safeCall(() => typeof playTactileSound === 'function' && playTactileSound('snap'));
  }

  function toggleAutoRotate() {
    if (!controls) return false;
    controls.autoRotate = !controls.autoRotate;
    setStatus('3D globe ready · auto-rotate ' + (controls.autoRotate ? 'ON' : 'OFF'), 'ready');
    safeCall(() => typeof playTactileSound === 'function' && playTactileSound('tick'));
    return controls.autoRotate;
  }

  function zoomStep(delta) {
    if (!camera || !controls) return;
    const offset = camera.position.clone().sub(controls.target);
    const distance = Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() + delta));
    offset.setLength(distance);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }

  function resetCameraView() {
    timeOffsetHours = 0;
    currentRegionKey = 'GLOBAL';
    targetCameraPosition = null;
    if (region) region.value = 'GLOBAL';
    const badge = $('#ur-region-badge');
    if (badge) badge.textContent = '· GLOBAL';
    if (camera && controls && earth) {
      controls.autoRotate = !reducedMotion;
      controls.target.set(orbitTargetX, 0, 0);
      camera.position.set(0, 0, 8.6);
      controls.update();
    }
    updateSolarLighting();
  }

  function nudgeEarth(delta) {
    if (earth) earth.rotation.y += Number(delta) || .45;
    safeCall(() => typeof playTactileSound === 'function' && playTactileSound('snap'));
  }

  function stepSimTime(hours) {
    timeOffsetHours = (timeOffsetHours + (Number(hours) || 6)) % 24;
    updateSolarLighting();
    return timeOffsetHours;
  }

  function toggleAtmosphereBoost() {
    atmosphereBoost = !atmosphereBoost;
    if (clouds) clouds.visible = atmosphereBoost;
    if (atmosphere && atmosphere.material) atmosphere.material.opacity = atmosphereBoost ? .25 : .14;
    setStatus('3D globe ready · atmosphere ' + (atmosphereBoost ? 'boosted' : 'normal'), 'ready');
    return atmosphereBoost;
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
    stepSimTime(6);
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
  $('#ur-camera-reset')?.addEventListener('click', resetCameraView);
  $('#ur-zoom-in')?.addEventListener('click', () => zoomStep(-.65));
  $('#ur-zoom-out')?.addEventListener('click', () => zoomStep(.65));
  $('#ur-auto-rotate')?.addEventListener('click', () => {
    const enabled = toggleAutoRotate();
    const button = $('#ur-auto-rotate');
    if (button) { button.textContent = enabled ? '↻ ON' : '↻ OFF'; button.setAttribute('aria-pressed', String(enabled)); }
  });
  $('#ur-orbital-pulse')?.addEventListener('click', () => nudgeEarth(.45));
  $('#ur-atmosphere-toggle')?.addEventListener('click', () => {
    const enabled = toggleAtmosphereBoost();
    const button = $('#ur-atmosphere-toggle');
    if (button) { button.textContent = enabled ? '☁ ATMOSPHERE: ON' : '☁ ATMOSPHERE: OFF'; button.setAttribute('aria-pressed', String(enabled)); }
  });

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
    if (solarTimer) clearInterval(solarTimer);
    if (resizeObserver) resizeObserver.disconnect();
    if (controls) controls.dispose();
    if (renderer) renderer.dispose();
  }, { once: true });
})();
