/* TRAMPILLERA visual asset protection — deterrence and attribution, not DRM. */
(() => {
  'use strict';
  if (window.__TRAMPILLERA_IMAGE_PROTECTION__) return;
  window.__TRAMPILLERA_IMAGE_PROTECTION__ = true;

  const BRAND = 'TRAMPILLERA.COM';
  const SDT5D_SOURCE = 'https://sdt5dmultiverse.vercel.app/';
  const layers = new Map();
  let frame = 0;

  const style = document.createElement('style');
  style.id = 'tp-image-protection-styles';
  style.textContent = [
    'img, picture, canvas, video { -webkit-user-drag:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }',
    '.tp-image-protection-layer{position:fixed;z-index:2147482000;pointer-events:none;overflow:hidden;display:flex;align-items:center;justify-content:center;contain:strict;color:rgba(255,255,255,.25);font:700 10px/1.2 ui-monospace,monospace;letter-spacing:.12em;text-shadow:0 1px 3px #000,0 0 8px #000;mix-blend-mode:normal;}',
    '.tp-image-protection-layer .tp-watermark-grid{display:flex;flex-direction:column;justify-content:space-around;align-items:center;width:140%;height:140%;transform:rotate(-22deg);gap:14px;white-space:nowrap;}',
    '.tp-image-protection-layer .tp-watermark-grid span{opacity:.58;background:rgba(0,0,0,.08);padding:2px 5px;border-radius:2px;}',
    '.tp-image-protection-layer .tp-watermark-footer{position:absolute;right:4px;bottom:3px;padding:3px 5px;background:rgba(0,0,0,.48);color:rgba(255,255,255,.82);font:700 8px/1.2 ui-monospace,monospace;letter-spacing:.08em;border:1px solid rgba(255,255,255,.16);border-radius:2px;}',
    'img[data-tp-protected="true"]{ -webkit-user-drag:none; user-select:none; }'
  ].join('');
  (document.head || document.documentElement).appendChild(style);

  function isMedia(node) {
    return node && node.nodeType === 1 && (/^(IMG|CANVAS|VIDEO|IMAGE)$/.test(node.tagName) || node.dataset?.tpProtectBackground === 'true');
  }

  function watermarkFor(media) {
    const source = String(media.currentSrc || media.src || media.getAttribute('src') || media.getAttribute('href') || media.href?.baseVal || '');
    const hint = String(media.getAttribute('alt') || '') + ' ' + source + ' ' + location.pathname + ' ' + document.title;
    return /sdt5d|multiverse-studio/i.test(hint) ? BRAND + ' · ' + SDT5D_SOURCE : BRAND;
  }

  function makeLayer(media) {
    let layer = layers.get(media);
    if (layer) return layer;
    layer = document.createElement('div');
    layer.className = 'tp-image-protection-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<div class="tp-watermark-grid"><span></span><span></span><span></span></div><span class="tp-watermark-footer"></span>';
    document.body.appendChild(layer);
    layers.set(media, layer);
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(schedule);
      ro.observe(media);
      layer.__tpResizeObserver = ro;
    }
    return layer;
  }

  function updateOne(media) {
    if (!media.isConnected) {
      const old = layers.get(media);
      if (old) {
        if (old.__tpResizeObserver) old.__tpResizeObserver.disconnect();
        old.remove();
        layers.delete(media);
      }
      return;
    }
    const rect = media.getBoundingClientRect();
    const loaded = media.tagName !== 'IMG' || (media.complete && media.naturalWidth > 0);
    const visible = loaded && rect.width >= 18 && rect.height >= 18 && rect.bottom > 0 &&
      rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth &&
      getComputedStyle(media).visibility !== 'hidden' && getComputedStyle(media).display !== 'none';
    const layer = makeLayer(media);
    if (!visible) {
      layer.style.display = 'none';
      return;
    }
    const mark = watermarkFor(media);
    layer.querySelectorAll('.tp-watermark-grid span').forEach((span, index) => {
      span.textContent = index === 1 ? mark : BRAND;
    });
    layer.querySelector('.tp-watermark-footer').textContent = BRAND + ' · © 2026';
    Object.assign(layer.style, {
      display: 'flex',
      left: Math.max(0, rect.left) + 'px',
      top: Math.max(0, rect.top) + 'px',
      width: Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(0, rect.left)) + 'px',
      height: Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(0, rect.top)) + 'px'
    });
    media.setAttribute('data-tp-protected', 'true');
    media.setAttribute('data-tp-rights-notice', 'TRAMPILLERA.COM · Reuse requires permission from the respective rights holder.');
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      for (const media of layers.keys()) updateOne(media);
    });
  }

  function scan(root) {
    if (!root || root.nodeType !== 1 && root.nodeType !== 9) return;
    if (isMedia(root)) updateOne(root);
    if (root.querySelectorAll) root.querySelectorAll('img,canvas,video,svg image,[style*="url("]').forEach(node => { if (/^(IMG|CANVAS|VIDEO|IMAGE)$/.test(node.tagName)) updateOne(node); else { const bg = getComputedStyle(node).backgroundImage; if (bg && bg !== 'none' && bg.includes('url(')) { node.dataset.tpProtectBackground = 'true'; updateOne(node); } } });
  }

  document.addEventListener('load', event => {
    if (isMedia(event.target)) updateOne(event.target);
  }, true);
  document.addEventListener('error', event => {
    if (isMedia(event.target)) updateOne(event.target);
  }, true);
  document.addEventListener('contextmenu', event => {
    if (event.target && event.target.closest && event.target.closest('img,picture,canvas,video,svg image')) event.preventDefault();
  }, true);
  document.addEventListener('dragstart', event => {
    if (event.target && event.target.closest && event.target.closest('img,picture,canvas,video,svg image')) event.preventDefault();
  }, true);
  document.addEventListener('selectstart', event => {
    if (event.target && event.target.closest && event.target.closest('img,picture,canvas,video,svg image')) event.preventDefault();
  }, true);
  window.addEventListener('scroll', schedule, { passive: true, capture: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList') {
        record.addedNodes.forEach(node => { if (node.nodeType === 1 && !node.classList.contains('tp-image-protection-layer')) scan(node); });
        record.removedNodes.forEach(node => { if (isMedia(node)) updateOne(node); else if (node.nodeType === 1 && node.querySelectorAll) node.querySelectorAll('img,canvas,video,svg image').forEach(updateOne); });
      }
      if (record.type === 'attributes') {
        if (isMedia(record.target)) updateOne(record.target);
        else if (record.target.nodeType === 1) { const bg = getComputedStyle(record.target).backgroundImage; if (bg && bg !== 'none' && bg.includes('url(')) { record.target.dataset.tpProtectBackground = 'true'; updateOne(record.target); } }
      }
    }
  });
  observer.observe(document.documentElement, {
    subtree: true, childList: true, attributes: true,
    attributeFilter: ['src', 'srcset', 'style', 'class', 'hidden']
  });

  function init() {
    scan(document);
    schedule();
    window.setTimeout(schedule, 300);
    window.setTimeout(schedule, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.TRAMPILLERA_IMAGE_PROTECTION = Object.freeze({
    version: '1.0.0',
    mode: 'visible-watermark-and-interaction-deterrence',
    note: 'Browser-side deterrence is not DRM and cannot prevent screenshots or external capture.',
    refresh: schedule
  });
})();
