// お知らせに付いた Drive の資料を、表示中の分だけ端末に保存する(1件ずつ、間を空けて、バックグラウンドで)。
import { getMaterial, putMaterial, listMaterialIds, deleteMaterial } from './store';
import { fetchMaterialFromGas } from './gasFetch';

const GAP_MS = 2000;
const URL_LIFETIME_MS = 10 * 60 * 1000;
let running = false;
const failed = new Set(); // このセッションで失敗したもの(何度も再試行しない)

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
    for (const id of have) if (!wanted.has(id)) await deleteMaterial(id);
    for (const id of wanted.keys()) {
      if (have.has(id) || failed.has(id)) continue;
      if (!navigator.onLine) break;
      try {
        const f = await fetchMaterialFromGas(id);
        await putMaterial({ id, name: f.name, type: f.mimeType, blob: f.blob, savedAt: Date.now() });
      } catch (e) {
        failed.add(id);
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
