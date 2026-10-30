/* ZIP data stays outside WebAssembly; only the requested entry crosses the bridge. */
(() => {
  const cache = new Map();
  const maxCachedChunks = 6;
  let base = '';
  window.YosugaAssets = {
    configure(url) { base = new URL(url, location.href).href.replace(/\/$/, '') + '/'; },
    read(prefix, offset, size, chunkSize) {
      try {
        const result = new Uint8Array(size);
        let written = 0;
        while (written < size) {
          const part = Math.floor(offset / chunkSize);
          const name = `${prefix}-${String(part).padStart(4, '0')}.bin`;
          let chunk = cache.get(name);
          if (!chunk) {
            const request = new XMLHttpRequest();
            request.open('GET', base + name, false);
            request.overrideMimeType('text/plain; charset=x-user-defined');
            request.send();
            if (request.status !== 200) throw new Error(`${name}: HTTP ${request.status}`);
            const text = request.responseText;
            chunk = new Uint8Array(text.length);
            for (let i = 0; i < text.length; i++) chunk[i] = text.charCodeAt(i) & 255;
          }
          cache.delete(name);
          cache.set(name, chunk);
          if (cache.size > maxCachedChunks) cache.delete(cache.keys().next().value);
          const start = offset % chunkSize;
          const length = Math.min(size - written, chunk.length - start);
          if (length <= 0) throw new Error(`Incomplete asset: ${name}`);
          result.set(chunk.subarray(start, start + length), written);
          offset += length;
          written += length;
        }
        return result.buffer;
      } catch (error) {
        console.error(error);
        const status = document.getElementById('status');
        if (status) status.textContent = 'Nie udało się pobrać danych gry: ' + error.message;
        return new ArrayBuffer(0);
      }
    },
    movieURL() { return base + 'opening.mp4'; }
  };
  const configured = localStorage.getItem('yosuga-assets-url') || window.YOSUGA_ASSET_BASE || '../release-assets/';
  window.YosugaAssets.configure(configured);
  window.yosugaMoviePlaying = false;
  window.playYosugaOpening = () => {
    const video = document.createElement('video');
    video.src = window.YosugaAssets.movieURL();
    video.controls = true;
    video.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;background:black;z-index:9999';
    window.yosugaMoviePlaying = true;
    const close = () => { video.remove(); window.yosugaMoviePlaying = false; };
    video.onended = close;
    video.onerror = close;
    video.onclick = close;
    document.body.append(video);
    video.play().catch(close);
  };
})();
