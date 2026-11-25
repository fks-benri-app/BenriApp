// お知らせに付いた Drive の資料を、表示中の分だけ端末に保存する(1件ずつ、間を空けて、バックグラウンドで)。
import { getMaterial, putMaterial, listMaterialIds, deleteMaterial } from './store';
import { fetchMaterialFromGas } from './gasFetch';

const GAP_MS = 2000;
const URL_LIFETIME_MS = 10 * 60 * 1000;
let running = false;
const failed = new Set(); // このセッションで失敗したもの(何度も再試行しない)
const statuses = new Map(); // fileId -> 'saving' | 'saved' | 'failed'(画面の印に使う)
const listeners = new Set();

function setStatus(id, s) {
  if (s) statuses.set(id, s); else statuses.delete(id);
  listeners.forEach((l) => l());
}

export function subscribeMaterialStatus(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getMaterialStatus(id) {
  return statuses.get(id) || null;
}

// 添付の Drive ファイル ID。古い投稿は fileId が無いので、URL から取り出す
export function fileIdOf(a) {
  if (!a || a.type !== 'drive') return null;
  if (a.fileId) return a.fileId;
  const m = /\/d\/([\w-]{10,})|[?&]id=([\w-]{10,})/.exec(a.url || '');
  return m ? (m[1] || m[2]) : null;
}

// items: 表示中のお知らせ。表示されていないものの資料は消す(基本は30件分)
export async function syncMaterials(items) {
  if (running || items.length === 0) return; // 読み込み前の空の一覧で、保存済みを消さない
  running = true;
  try {
    const wanted = new Map();
    for (const ann of items) {
      for (const a of ann.attachments || []) {
        const id = fileIdOf(a);
        if (id) wanted.set(id, a);
      }
    }
    const have = new Set(await listMaterialIds());
    for (const id of wanted.keys()) if (!have.has(id) && !failed.has(id)) setStatus(id, 'saving'); // 待っているものも回転で出す
    for (const id of have) if (!wanted.has(id)) { await deleteMaterial(id); setStatus(id, null); }
    for (const id of wanted.keys()) {
      if (have.has(id)) { setStatus(id, 'saved'); continue; }
      if (failed.has(id)) { setStatus(id, 'failed'); continue; }
      if (!navigator.onLine) { // 圏外なら、待っているものの印を消して止める
        for (const r of wanted.keys()) if (statuses.get(r) === 'saving') setStatus(r, null);
        break;
      }
      setStatus(id, 'saving');
      try {
        const f = await fetchMaterialFromGas(id);
        await putMaterial({ id, name: f.name, type: f.mimeType, blob: f.blob, savedAt: Date.now() });
        setStatus(id, 'saved');
      } catch (e) {
        failed.add(id);
        setStatus(id, 'failed');
        console.warn('資料の保存に失敗:', id, e.message);
      }
      await new Promise((r) => setTimeout(r, GAP_MS));
    }
  } catch (e) {
    console.warn('資料の同期に失敗:', e.message);
  } finally {
    running = false;
  }
}

// 保存済みなら、開ける URL を返す(無ければ null。オフラインでも開ける)
export async function localMaterialUrl(a) {
  const id = fileIdOf(a);
  if (!id) return null;
  try {
    const rec = await getMaterial(id);
    if (!rec) return null;
    const url = URL.createObjectURL(rec.blob);
    setTimeout(() => URL.revokeObjectURL(url), URL_LIFETIME_MS);
    return url;
  } catch {
    return null;
  }
}
