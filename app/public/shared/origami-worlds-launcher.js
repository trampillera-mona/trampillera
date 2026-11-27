(function(){
'use strict';
if(window.__ORIGAMI_WORLDS_LAUNCHER__)return;
window.__ORIGAMI_WORLDS_LAUNCHER__=true;
const path=window.location.pathname;
const isPortal=path==='/'||path==='/index.html';
const isGame=path==='/games/polar-settlement.html';
if(!isPortal&&!isGame)return;
const labels={
EN:'Open Worlds & Play',RU:'Открыть Worlds & Play',SR:'Otvori Worlds & Play',DE:'Worlds & Play öffnen',FR:'Ouvrir Worlds & Play',ES:'Abrir Worlds & Play',IT:'Apri Worlds & Play',PT:'Abrir Worlds & Play',ZH:'打开 Worlds & Play',JA:'Worlds & Play を開く',KO:'Worlds & Play 열기',AR:'افتح Worlds & Play'
};
const button=document.createElement('a');
button.href='/worlds-play/';
button.className='origami-worlds-launcher';
button.setAttribute('aria-label','Worlds & Play — ORIGAMI MAPS PLANNER');
let activeLocale='EN';try{activeLocale=(localStorage.getItem('trampillera.locale.v1')||'EN').toUpperCase();}catch(e){}button.setAttribute('title',labels[activeLocale]||labels.EN);
button.innerHTML='<span class="ow-orbit"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" stroke-width="1.6"/><ellipse cx="24" cy="24" rx="21" ry="8" fill="none" stroke="currentColor" stroke-width="1.4" transform="rotate(-28 24 24)"/><circle cx="38" cy="14" r="3.2" fill="#e8c47e" stroke="currentColor" stroke-width="1"/><path d="M18 27l6-11 7 15-7-4z" fill="currentColor" opacity=".72"/></svg></span><span class="ow-label">WORLDS<br>&amp; PLAY</span>';
const style=document.createElement('style');
style.textContent='.origami-worlds-launcher{position:fixed;z-index:18000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:76px;height:76px;border-radius:50%;border:1px solid rgba(100,216,233,.8);background:radial-gradient(circle at 35% 25%,rgba(33,75,94,.98),rgba(6,14,23,.97) 72%);color:#8eeaf2;text-decoration:none;box-shadow:0 0 0 5px rgba(100,216,233,.06),0 0 28px rgba(75,206,231,.24),inset 0 0 18px rgba(100,216,233,.1);font:700 8px/1.15 ui-monospace,monospace;letter-spacing:.12em;text-align:center;transition:transform .2s,border-color .2s,box-shadow .2s;animation:owPulse 3s ease-in-out infinite}.origami-worlds-launcher:hover{transform:scale(1.07);border-color:#e8c47e;color:#fff0c5;box-shadow:0 0 0 8px rgba(232,196,126,.08),0 0 34px rgba(232,196,126,.3)}.origami-worlds-launcher .ow-orbit{width:38px;height:38px;display:block}.origami-worlds-launcher svg{width:100%;height:100%}.origami-worlds-launcher .ow-label{display:block}.origami-worlds-launcher:focus-visible{outline:3px solid #e8c47e;outline-offset:4px}@keyframes owPulse{0%,100%{box-shadow:0 0 0 4px rgba(100,216,233,.05),0 0 22px rgba(75,206,231,.18),inset 0 0 18px rgba(100,216,233,.1)}50%{box-shadow:0 0 0 9px rgba(100,216,233,.1),0 0 34px rgba(75,206,231,.32),inset 0 0 22px rgba(100,216,233,.15)}}'+(isPortal?'.origami-worlds-launcher{right:clamp(16px,4vw,54px);top:54%;transform:translateY(-50%)}.origami-worlds-launcher:hover{transform:translateY(-50%) scale(1.07)}':'.origami-worlds-launcher{right:18px;bottom:228px;width:68px;height:68px}.origami-worlds-launcher .ow-orbit{width:32px;height:32px}@media(max-width:600px){.origami-worlds-launcher{right:10px;bottom:220px;width:60px;height:60px}.origami-worlds-launcher .ow-orbit{width:28px;height:28px}}')+'@media(prefers-reduced-motion:reduce){.origami-worlds-launcher{animation:none}}';
document.head.appendChild(style);
document.body.appendChild(button);
window.addEventListener('storage',e=>{if(e.key==='trampillera.locale.v1')button.title=labels[(e.newValue||'EN').toUpperCase()]||labels.EN;});
})();