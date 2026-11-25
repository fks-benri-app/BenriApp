// お知らせに付いた Drive の資料を、表示中の分だけ端末に保存する(新しい順に、1件ずつ、バックグラウンドで)。
import { getMaterial, getThumb, putMaterial, putThumb, listMaterialIds, deleteMaterial } from './store';
import { fetchMaterialFromGas } from './gasFetch';

const GAP_MS = 2000;
const URL_LIFETIME_MS = 10 * 60 * 1000;
let running = false;
let latest = []; // 最新の一覧。保存の途中で一覧が変わったら、ここを見て続ける
const failed = new Set(); // 失敗したもの(このセッションでは再試行しない)
const statuses = new Map(); // fileId -> 'saving' | 'saved' | 'failed' | 'denied'(画面の印に使う)
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

// Drive の権限が無くて保存できない資料があるか(権限の案内を出すため)
export function materialNeedsPermission() {
  return [...statuses.values()].includes('denied');
}

// 添付の Drive ファイル ID。古い投稿は fileId が無いので、URL から取り出す
export function fileIdOf(a) {
  if (!a || a.type !== 'drive') return null;
  if (a.fileId) return a.fileId;
  const m = /\/d\/([\w-]{10,})|[?&]id=([\w-]{10,})/.exec(a.url || '');
  return m ? (m[1] || m[2]) : null;
}

function wantedFrom(items) {
  const wanted = new Map(); // 一覧の順(新しい順)のまま
  for (const ann of items) {
    for (const a of ann.attachments || []) {
      const id = fileIdOf(a);
      if (id) wanted.set(id, a);
    }
  }
  return wanted;
}

// items: 表示中のお知らせ。表示されていない資料は消す(基本は30件分)
export async function syncMaterials(items) {
  if (items.length) latest = items; // 読み込み前の空の一覧で、保存済みを消さない
  if (running) return; // 動いている処理が、最新の一覧を見て続けるので、ここでは何もしない
  running = true;
  const skipped = new Set(); // 権限が無かったもの(許可の後に次の同期で試す)
  try {
    for (;;) {
      const wanted = wantedFrom(latest);
      if (wanted.size === 0) break;
      const have = new Set(await listMaterialIds());
      for (const id of have) if (!wanted.has(id)) { await deleteMaterial(id); setStatus(id, null); }
      for (const id of wanted.keys()) {
        if (have.has(id)) setStatus(id, 'saved');
        else if (failed.has(id)) setStatus(id, 'failed');
        else if (!skipped.has(id)) setStatus(id, 'saving');
      }
      const next = [...wanted.keys()].find((id) => !have.has(id) && !failed.has(id) && !skipped.has(id));
      if (next === undefined) break;
      if (!navigator.onLine) { // 圏外なら、待っているものの印を消して止める
        for (const id of wanted.keys()) if (statuses.get(id) === 'saving') setStatus(id, null);
        break;
      }
      try {
        const f = await fetchMaterialFromGas(next);
        await putMaterial({ id: next, name: f.name, type: f.mimeType, blob: f.blob, savedAt: Date.now() });
        if (f.thumb) await putThumb(next, f.thumb);
        setStatus(next, 'saved');
      } catch (e) {
        if (/権限/.test(e.message)) { // 許可の後にまた試せるよう、失敗の一覧には入れない
          skipped.add(next);
          setStatus(next, 'denied');
        } else {
          failed.add(next);
          setStatus(next, 'failed');
          console.warn('資料の保存に失敗:', next, e.message);
        }
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

// 保存済みのサムネイルの URL(無ければ null。呼んだ側で revoke する)
export async function localThumbUrl(id) {
  try {
    const blob = await getThumb(id);
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}
