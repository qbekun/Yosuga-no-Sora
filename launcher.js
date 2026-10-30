const play = document.getElementById('play');
const stage = document.getElementById('stage');
const fullscreen = document.getElementById('fullscreen');
let frame;
const screenTools = document.createElement('div');
screenTools.className = 'screen-tools';
const exitScreen = document.createElement('button');
exitScreen.type = 'button';
exitScreen.textContent = 'Zamknij pełny ekran';
screenTools.append(exitScreen);
const nativeFullscreen = () => document.fullscreenElement || document.webkitFullscreenElement;
const expanded = () => !!nativeFullscreen() || stage.classList.contains('is-expanded');
function updateScreen() {
  const active = expanded();
  stage.classList.toggle('screen-active', active);
  fullscreen.setAttribute('aria-pressed', String(active));
  fullscreen.lastChild.textContent = active ? ' Zmniejsz ekran' : ' Pełny ekran';
}
async function setExpanded(enabled) {
  if (!enabled) {
    stage.classList.remove('is-expanded');
    document.body.classList.remove('game-expanded');
    if (nativeFullscreen()) {
      try { await (document.exitFullscreen?.() || document.webkitExitFullscreen?.()); } catch {}
    }
    if (screen.orientation?.unlock) screen.orientation.unlock();
  } else {
    // This also fills the visible browser viewport where native fullscreen is unavailable.
    stage.classList.add('is-expanded');
    document.body.classList.add('game-expanded');
    try {
      if (stage.requestFullscreen) await stage.requestFullscreen();
      else if (stage.webkitRequestFullscreen) await stage.webkitRequestFullscreen();
    } catch { /* Keep the viewport-filling layout. */ }
    if (nativeFullscreen() && matchMedia('(pointer: coarse)').matches) {
      try { await screen.orientation?.lock?.('landscape'); } catch {}
    }
  }
  updateScreen();
  frame?.focus();
}
fullscreen.onclick = () => setExpanded(!expanded());
exitScreen.onclick = () => setExpanded(false);
document.addEventListener('fullscreenchange', () => {
  if (!nativeFullscreen()) {
    stage.classList.remove('is-expanded');
    document.body.classList.remove('game-expanded');
  }
  updateScreen();
});
document.addEventListener('webkitfullscreenchange', updateScreen);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && expanded() && !nativeFullscreen()) setExpanded(false);
});
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== frame?.contentWindow) return;
  if (event.data?.type === 'yosuga-fullscreen') setExpanded(event.data.enabled === true);
});
play.onclick = async () => {
  const status = document.getElementById('status');
  play.disabled = true;
  status.textContent = 'Przygotowywanie gry…';
  try {
    const base = localStorage.getItem('yosuga-assets-url') || window.YOSUGA_ASSET_BASE || '../release-assets/';
    const url = new URL(base, location.href);
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    const response = await fetch(new URL('manifest.json', url));
    if (!response.ok) throw Error('HTTP ' + response.status);
    const manifest = await response.json();
    if (!manifest.files) throw Error('Niepoprawny katalog danych');
    frame = document.createElement('iframe');
    frame.title = 'Yosuga no Sora';
    frame.allow = 'autoplay; fullscreen';
    frame.allowFullscreen = true;
    frame.src = 'game.html?v=mobile-controls-1';
    stage.classList.add('is-playing');
    stage.replaceChildren(frame, screenTools);
    fullscreen.hidden = false;
    frame.focus();
  } catch (error) {
    status.textContent = 'Nie udało się pobrać danych gry. Spróbuj ponownie za chwilę.';
    play.disabled = false;
    console.error(error);
  }
};
