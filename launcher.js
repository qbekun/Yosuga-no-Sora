const play = document.getElementById('play');
const stage = document.getElementById('stage');
const fullscreen = document.getElementById('fullscreen');
let frame;
const downloadSaves = document.getElementById('download-saves');
const uploadSaves = document.getElementById('upload-saves');
const saveInput = document.getElementById('save-file');
const saveStatus = document.getElementById('save-transfer-status');
const transfer = (action, data = '') => {
  const result = frame?.contentWindow.YosugaSaveTransfer?.(action, data);
  if (!result?.ok) throw Error(result?.message || 'Poczekaj na uruchomienie gry.');
  return result;
};
downloadSaves.onclick = () => {
  try {
    const result = transfer('export');
    if (!result.slots) throw Error('Najpierw zapisz postęp przez Save lub Q.Save w grze.');
    const url = URL.createObjectURL(new Blob([JSON.stringify(result.bundle)], {type:'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'yosuga-zapisy-' + new Date().toISOString().slice(0,10) + '.ynssave';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    saveStatus.textContent = 'Plik zapisów jest gotowy. Prześlij go na drugie urządzenie.';
  } catch (error) { saveStatus.textContent = error.message; }
};
uploadSaves.onclick = () => { saveInput.value = ''; saveInput.click(); };
saveInput.onchange = async () => {
  const file = saveInput.files[0];
  if (!file) return;
  try {
    if (file.size > 48 * 1024 * 1024) throw Error('Plik jest za duży (maksymalnie 48 MB).');
    let bundle;
    if (/^(Save\d{2}\.png|QSave\.sav)$/.test(file.name)) {
      const encoded = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file);
      });
      bundle = {format:'yosuga-save',version:1,files:{[file.name]:encoded}};
    } else bundle = JSON.parse(await file.text());
    if (bundle?.format !== 'yosuga-save' || bundle.version !== 1 || !bundle.files || typeof bundle.files !== 'object') throw Error('Wybierz plik .ynssave albo zapis Save01.png / QSave.sav z tej samej wersji gry.');
    if (!confirm('Wczytać zapisy z pliku? Zapisy o tych samych nazwach zostaną zastąpione. Możesz wcześniej pobrać ich kopię.')) return;
    saveStatus.textContent = transfer('import', JSON.stringify(bundle)).message;
  } catch (error) { saveStatus.textContent = error instanceof SyntaxError ? 'To nie jest poprawny plik zapisów.' : error.message; }
};
const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const iosHelp = document.getElementById('ios-help');
const iosDialog = document.getElementById('ios-install');
if (ios && !standalone()) iosHelp.hidden = false;
document.getElementById('ios-help-open').onclick = () => iosDialog.showModal();
document.getElementById('ios-help-close').onclick = () => iosDialog.close();
iosDialog.addEventListener('click', event => { if (event.target === iosDialog) iosDialog.close(); });
let viewportUpdate;
function syncViewport() {
  cancelAnimationFrame(viewportUpdate);
  viewportUpdate = requestAnimationFrame(() => {
    const viewport = window.visualViewport;
    const height = nativeFullscreen() ? innerHeight : (viewport?.height || innerHeight);
    const top = nativeFullscreen() ? 0 : (viewport?.offsetTop || 0);
    stage.style.setProperty('--game-height', height + 'px');
    stage.style.setProperty('--game-top', top + 'px');
    layoutFullscreenControls();
  });
}
window.visualViewport?.addEventListener('resize', syncViewport);
window.visualViewport?.addEventListener('scroll', syncViewport);
window.addEventListener('resize', syncViewport);
const screenTools = document.createElement('div');
screenTools.className = 'screen-tools';
const exitScreen = document.createElement('button');
exitScreen.type = 'button';
exitScreen.setAttribute('aria-label', 'Zamknij pełny ekran');
exitScreen.title = 'Zamknij pełny ekran';
exitScreen.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 10h6V4m10 6h-6V4M4 14h6v6m10-6h-6v6"/></svg>';
screenTools.append(exitScreen);
const nativeFullscreen = () => document.fullscreenElement || document.webkitFullscreenElement;
const expanded = () => !!nativeFullscreen() || stage.classList.contains('is-expanded');
function layoutFullscreenControls() {
  if (!frame) return;
  if (!expanded()) {
    for (const property of ['left', 'top', 'width', 'height']) frame.style.removeProperty(property);
    return;
  }
  const style = getComputedStyle(stage);
  const left = parseFloat(style.paddingLeft) || 0;
  const top = parseFloat(style.paddingTop) || 0;
  const right = parseFloat(style.paddingRight) || 0;
  const bottom = parseFloat(style.paddingBottom) || 0;
  const width = Math.max(1, stage.clientWidth - left - right);
  const height = Math.max(1, stage.clientHeight - top - bottom);
  const buttonSize = 48;
  const clearance = buttonSize + 16;
  let gameWidth = Math.min(width, height * 4 / 3);
  let gameHeight = gameWidth * 3 / 4;
  let gameLeft = left + (width - gameWidth) / 2;
  let gameTop = top + (height - gameHeight) / 2;
  let buttonLeft;
  let buttonTop;
  if ((width - gameWidth) / 2 >= clearance) {
    // Use the existing black side margin without reducing the game image.
    buttonLeft = gameLeft + gameWidth + (width - gameWidth) / 4 - buttonSize / 2;
    buttonTop = top + 8;
  } else if ((height - gameHeight) / 2 >= clearance) {
    buttonLeft = left + width - buttonSize - 8;
    buttonTop = top + 8;
  } else {
    // Near 4:3, reserve a separate strip so the control never covers the game.
    const toolbarHeight = buttonSize + 8;
    const gameAreaHeight = Math.max(1, height - toolbarHeight);
    gameWidth = Math.min(width, gameAreaHeight * 4 / 3);
    gameHeight = gameWidth * 3 / 4;
    gameLeft = left + (width - gameWidth) / 2;
    gameTop = top + toolbarHeight + (gameAreaHeight - gameHeight) / 2;
    buttonLeft = left + width - buttonSize - 8;
    buttonTop = top + 4;
  }
  Object.assign(frame.style, {left: gameLeft + 'px', top: gameTop + 'px', width: gameWidth + 'px', height: gameHeight + 'px'});
  Object.assign(screenTools.style, {left: buttonLeft + 'px', top: buttonTop + 'px', right: 'auto'});
}
function updateScreen() {
  const active = expanded();
  stage.classList.toggle('screen-active', active);
  fullscreen.setAttribute('aria-pressed', String(active));
  fullscreen.lastChild.textContent = active ? ' Zmniejsz ekran' : ' Pełny ekran';
  syncViewport();
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
  syncViewport();
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
  if (event.data?.type === 'yosuga-save-ready') {
    downloadSaves.disabled = false;
    uploadSaves.disabled = false;
    saveStatus.textContent = 'Najpierw użyj Save w grze. Potem pobierz plik i wczytaj go na drugim urządzeniu.';
  }
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
    if (standalone()) await setExpanded(true);
    frame.focus();
  } catch (error) {
    status.textContent = 'Nie udało się pobrać danych gry. Spróbuj ponownie za chwilę.';
    play.disabled = false;
    console.error(error);
  }
};
