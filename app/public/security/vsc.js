(() => {
  "use strict";
  const TOKENS = [
    { id: "ember", label: "Ember", glyph: "◆", color: "#d64b43" },
    { id: "sun", label: "Sun", glyph: "●", color: "#e5ad36" },
    { id: "leaf", label: "Leaf", glyph: "▲", color: "#398b58" },
    { id: "aqua", label: "Aqua", glyph: "⬟", color: "#269eaa" },
    { id: "sky", label: "Sky", glyph: "✦", color: "#397ec2" },
    { id: "indigo", label: "Indigo", glyph: "■", color: "#5354a8" },
    { id: "violet", label: "Violet", glyph: "✿", color: "#9354ae" },
    { id: "rose", label: "Rose", glyph: "✚", color: "#c65383" },
    { id: "silver", label: "Silver", glyph: "⬢", color: "#8395a6" },
    { id: "graphite", label: "Graphite", glyph: "✖", color: "#53616e" }
  ];
  const byId = new Map(TOKENS.map(token => [token.id, token]));
  function randomIndex(max) {
    const limit = Math.floor(256 / max) * max;
    const byte = new Uint8Array(1);
    do { crypto.getRandomValues(byte); } while (byte[0] >= limit);
    return byte[0] % max;
  }
  function generate() {
    return Array.from({ length: 6 }, () => TOKENS[randomIndex(TOKENS.length)].id);
  }
  function valid(sequence) {
    return Array.isArray(sequence) && sequence.length === 6 &&
      sequence.every(id => typeof id === "string" && byId.has(id));
  }
  function render(container, sequence) {
    if (!valid(sequence)) throw new TypeError("Invalid visual security sequence.");
    container.replaceChildren();
    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px";
    sequence.forEach((id, index) => {
      const token = byId.get(id);
      const tile = document.createElement("div");
      tile.style.cssText = "min-height:86px;border:1px solid #526477;border-radius:10px;background:#101d29;display:grid;place-items:center;gap:4px;padding:8px;text-align:center";
      const glyph = document.createElement("span");
      glyph.textContent = token.glyph;
      glyph.style.cssText = "font-size:27px;line-height:1;color:" + token.color;
      glyph.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = (index + 1) + ". " + token.label;
      label.style.cssText = "font:10px ui-monospace,monospace;color:#eaf4fb";
      tile.append(glyph, label);
      grid.append(tile);
    });
    container.append(grid);
  }
  function drawCard(sequence) {
    if (!valid(sequence)) throw new TypeError("Invalid visual security sequence.");
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 760;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#09131d"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#3a596f"; ctx.lineWidth = 3; ctx.strokeRect(28, 28, 1144, 704);
    ctx.fillStyle = "#eaf4fb"; ctx.font = "bold 34px system-ui"; ctx.fillText("TRAMPILLERA · PERSONAL SECURITY", 70, 100);
    ctx.fillStyle = "#f0c66c"; ctx.font = "bold 25px system-ui"; ctx.fillText("PRIVATE VISUAL SECRET — KEEP OFFLINE", 70, 148);
    sequence.forEach((id, index) => {
      const token = byId.get(id), col = index % 3, row = Math.floor(index / 3);
      const x = 70 + col * 365, y = 205 + row * 230;
      ctx.fillStyle = "#132638"; ctx.fillRect(x, y, 320, 185);
      ctx.strokeStyle = "#526477"; ctx.strokeRect(x, y, 320, 185);
      ctx.fillStyle = token.color; ctx.font = "bold 74px system-ui"; ctx.textAlign = "center";
      ctx.fillText(token.glyph, x + 160, y + 94);
      ctx.fillStyle = "#eaf4fb"; ctx.font = "22px system-ui";
      ctx.fillText((index + 1) + " · " + token.label, x + 160, y + 145);
    });
    ctx.textAlign = "left"; ctx.fillStyle = "#b8c8d5"; ctx.font = "18px system-ui";
    ctx.fillText("Anyone with this card may be able to use your visual secret.", 70, 690);
    return canvas;
  }
  async function exportPng(sequence) {
    if (!window.confirm("This PNG contains your complete visual security secret. Anyone who obtains it may be able to access your account. Save it only in a secure offline location. Continue?")) return false;
    const canvas = drawCard(sequence);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("This browser could not create the security card.");
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "trampillera-visual-security-card.png";
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }
  async function copyPng(sequence) {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined" || !navigator.clipboard.write) {
      throw new Error("Image clipboard is not supported by this browser. Use the secure PNG export instead.");
    }
    if (!window.confirm("Copying this image places your complete visual secret on the device clipboard. Continue?")) return false;
    const blob = await new Promise(resolve => drawCard(sequence).toBlob(resolve, "image/png"));
    if (!blob) throw new Error("This browser could not create the security card.");
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  }
  window.PSLVSC = Object.freeze({ tokens: TOKENS.map(({ id, label }) => ({ id, label })), generate, valid, render, exportPng, copyPng });
})();
