// GAS(生徒本人の権限)で Drive のファイルを 1 件取る。CORS を避けるため JSONP(script タグ)で受け取る。
import { CONFIG, isGasConfigured } from '../../config';

const TIMEOUT_MS = 60000;
let seq = 0;

export function fetchMaterialFromGas(fileId) {
  return new Promise((resolve, reject) => {
    if (!isGasConfigured()) { reject(new Error('GAS が未設定です')); return; }
    const cb = `benriMaterial${Date.now().toString(36)}${seq++}`;
    const script = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error('取得がタイムアウトしました')); }, TIMEOUT_MS);
    function cleanup() {
      clearTimeout(timer);
      delete window[cb];
      script.remove();
    }
    window[cb] = (res) => {
      cleanup();
      if (!res || res.error) { reject(new Error(res?.error || '取得できませんでした')); return; }
      resolve({
        name: res.name,
        mimeType: res.mimeType,
        blob: base64ToBlob(res.base64, res.mimeType),
        thumb: res.thumb ? base64ToBlob(res.thumb.base64, res.thumb.mimeType) : null,
      });
    };
    script.onerror = () => { cleanup(); reject(new Error('GAS に届きませんでした')); };
    script.src = `${CONFIG.GAS_URL}?fileId=${encodeURIComponent(fileId)}&callback=${cb}`;
    document.head.appendChild(script);
  });
}

function base64ToBlob(b64, type) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: type || 'application/octet-stream' });
}
