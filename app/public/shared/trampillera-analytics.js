(() => {
  "use strict";
  const endpoint = "/api/analytics";
  const storageKey = "trampillera.analytics.visitor.v1";
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
      ". Anonymous audience measurement; raw IP addresses are not stored.";
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
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", track, { once: true });
  else track();
  window.setInterval(readCounter, 60000);
})();