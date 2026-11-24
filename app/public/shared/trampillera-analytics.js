(() => {
  "use strict";
  const endpoint = "/api/analytics";
  const storageKey = "trampillera.analytics.visitor.v1";
  const consentKey = "trampillera.analytics.consent.v1";
  const banner = document.getElementById("visitor-consent");
  const counter = document.getElementById("visitor-counter-value");
  const getVisitorId = () => {
    try {
      let id = localStorage.getItem(storageKey);
      if (!id) {
        id = window.crypto && typeof window.crypto.randomUUID === "function"
          ? window.crypto.randomUUID()
          : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
              const r = Math.random() * 16 | 0;
              return (c === "x" ? r : (r & 3 | 8)).toString(16);
            });
        localStorage.setItem(storageKey, id);
      }
      return id;
    } catch (_) { return null; }
  };
  const render = data => {
    if (!counter || !data) return;
    const value = Number(data.visitors);
    counter.textContent = Number.isFinite(value) ? value.toLocaleString() : "—";
    counter.title = "Unique first-party browser visitors: " + counter.textContent +
      " · Today: " + Number(data.today || 0).toLocaleString() +
      " · Page views: " + Number(data.pageviews || 0).toLocaleString() +
      ". Pseudonymous first-party audience measurement; raw IP addresses are not stored.";
  };
  const readCounter = () => fetch(endpoint + "/counter", {
    credentials: "same-origin", cache: "no-store"
  }).then(r => r.ok ? r.json() : null).then(render).catch(() => {});
  const track = () => {
    const visitorId = getVisitorId();
    if (!visitorId) return readCounter();
    const params = new URLSearchParams(location.search);
    const payload = {
      visitorId,
      path: location.pathname,
      referrer: document.referrer || "",
      source: params.get("utm_source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || ""
    };
    const dedupeKey = "trampillera.analytics.sent.v1:" + location.pathname;
    let shouldSend = true;
    try {
      const last = Number(sessionStorage.getItem(dedupeKey) || 0);
      if (Date.now() - last < 30000) shouldSend = false;
      if (shouldSend) sessionStorage.setItem(dedupeKey, String(Date.now()));
    } catch (_) {}
    if (!shouldSend) return readCounter();
    fetch(endpoint + "/visit", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).then(r => r.ok ? r.json() : null).then(render).catch(readCounter);
  };
  const start = () => {
    readCounter();
    let consent = null;
    try { consent = localStorage.getItem(consentKey); } catch (_) {}
    if (consent === "yes") track();
    if (banner && consent !== "yes" && consent !== "no") banner.hidden = false;
    const accept = document.getElementById("visitor-consent-accept");
    const decline = document.getElementById("visitor-consent-decline");
    const settings = document.getElementById("visitor-privacy-settings");
    if (accept) accept.addEventListener("click", () => {
      try { localStorage.setItem(consentKey, "yes"); } catch (_) {}
      if (banner) banner.hidden = true;
      track();
    });
    if (decline) decline.addEventListener("click", () => {
      try { localStorage.setItem(consentKey, "no"); localStorage.removeItem(storageKey); } catch (_) {}
      if (banner) banner.hidden = true;
      readCounter();
    });
    if (settings) settings.addEventListener("click", () => {
      if (banner) banner.hidden = false;
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  window.setInterval(readCounter, 60000);
})();