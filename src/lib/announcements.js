import { useCallback, useEffect, useMemo, useState } from 'react';
import { subscribe } from './firestoreLazy';
import { storage } from './storage';
import { cleanTeacher, cleanText, courseKey, courseLabel, joinTitleAndBody, kindOf, shortCourse } from './filters';

const READ_KEY = 'readIds';

// 前回取得したお知らせを覚えておき、開いた瞬間に表示する(あとで最新に差し替える)。
// 端末ごとの保存なので、他の人には出ない。保存は新しい順に30件まで(本文の全文は保存しない)。
const CACHE_KEY = 'announcementsCache';
const CACHE_SAVE_MAX = 30;
const memoryCache = new Map(); // studentId → 直近のお知らせ(この画面の中で再利用)

function loadCache(studentId) {
  if (!studentId) return null;
  if (memoryCache.has(studentId)) return memoryCache.get(studentId);
  try {
    const raw = JSON.parse(storage.get(CACHE_KEY) || 'null');
    if (raw && raw.studentId === studentId && Array.isArray(raw.items)) {
      // 「今日・昨日」の表示は、読んだ時点の日付で作り直す
      const items = raw.items.map((a) => (a.receivedAtMs ? { ...a, time: formatTime(new Date(a.receivedAtMs)) } : a));
      memoryCache.set(studentId, items);
      return items;
    }
  } catch { /* 壊れていたら無視して読み直す */ }
  return null;
}

function saveCache(studentId, items) {
  memoryCache.set(studentId, items);
  try {
    const light = items.slice(0, CACHE_SAVE_MAX).map(({ body, rawBody, ...rest }) => rest);
    storage.set(CACHE_KEY, JSON.stringify({ studentId, items: light }));
  } catch { /* 保存できなくても表示は続ける */ }
}

function loadReadIds() {
  try {
    return new Set(JSON.parse(storage.get(READ_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

// タグ分けはタイトル・本文のキーワードで判定する(必要に応じて足す)
function classify(text) {
  if (/テスト|追試|考査|試験/.test(text)) return 'test';
  if (/とんぼ祭|トンボ祭|文化祭/.test(text)) return 'festival';
  return 'general';
}

function formatTime(date) {
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  const hm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (days === 0) return `今日 ${hm}`;
  if (days === 1) return `昨日 ${hm}`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

// Firestore のドキュメント → 画面(Class.jsx)が使う形
function toAnnouncement(doc) {
  const d = doc.data();
  const receivedAt = d.receivedAt?.toDate?.() ?? new Date();
  const body = joinTitleAndBody(cleanText(d.title), cleanText(d.description));
  const content = [body, d.dueDate ? `期限: ${d.dueDate}` : ''].filter(Boolean).join('\n');
  // 詳細画面用の全文(GAS が body を保存している投稿だけ。古い投稿は content で代用する)
  const fullBody = d.body ? joinTitleAndBody(cleanText(d.title), cleanText(d.body)) : '';
  let attachments = [];
  try {
    const a = JSON.parse(d.attachments || '[]');
    if (Array.isArray(a)) attachments = a.filter((x) => x && x.url); // [{type,title,url,thumb?}]
  } catch { /* 添付が壊れていても他は表示する */ }
  return {
    id: doc.id,
    subject: shortCourse(d.courseName) || d.category || '通知', // カードには授業名の最初の1語だけ
    teacher: cleanTeacher(d.teacher),
    courseKey: courseKey(d.courseName), // 教科名での絞り込み用(例: 公共)
    courseLabel: shortCourse(d.courseName), // ドロップダウンの表示名
    courseFull: courseLabel(d.courseName), // 検索用(授業名の全体)
    kind: kindOf(d.category), // 'announcement' | 'assignment' | 'material' | 'other'
    time: formatTime(receivedAt),
    receivedAtMs: receivedAt.getTime(),
    content,
    body: fullBody, // 全文(なければ空)
    rawBody: typeof d.rawBody === 'string' ? d.rawBody : '', // Classroom の原文(改行・空白そのまま。なければ空)
    postTitle: d.postTitle || '', // 課題・資料のタイトル(API の原文)
    title: cleanText(d.title),
    bodyOnly: cleanText(d.description),
    deleted: d.deleted === true, // 先生が削除した投稿
    due: d.dueDate || '', // 期限(なければ空)
    attachments, // [{type,title,url}](GAS が Classroom API から保存。なければ空)
    tag: classify(`${d.title || ''} ${d.description || ''}`),
    link: d.link || null,
  };
}

/**
 * 画面が使うのはこのフックだけ。
 * 将来ログインを入れて保存先のパスが変わっても、ここだけ直せば画面は変わらない。
 * @returns {{ status: 'loading'|'ready'|'error', items: Array, markRead: (id: string) => void, markAllRead: (ids: string[]) => void }}
 */
export function useAnnouncements(studentId, { limitTo } = {}) {
  const [state, setState] = useState(() => {
    const cached = loadCache(studentId);
    return cached ? { status: 'ready', items: cached } : { status: 'loading', items: [] };
  });
  const [readIds, setReadIds] = useState(loadReadIds);

  useEffect(() => {
    if (!studentId) return undefined;
    const cached = loadCache(studentId);
    setState(cached ? { status: 'ready', items: cached } : { status: 'loading', items: [] });
    // subscribe は Firestore を必要になったときに読み込んでから購読する。新しい通知が保存されると画面が自動で更新される
    return subscribe(
      ({ fs, db }) => fs.query(
        fs.collection(db, 'users', studentId, 'announcements'),
        fs.orderBy('receivedAt', 'desc'),
        fs.limit(limitTo || 100)
      ),
      (snap) => {
        const items = snap.docs.map(toAnnouncement).filter((a) => !a.deleted);
        // 件数を絞った取得(ホーム)は、保存がまだ無いときだけ保存する(お知らせ画面の保存を、少ない件数で上書きしない)
        if (!limitTo || !loadCache(studentId)) saveCache(studentId, items);
        setState({ status: 'ready', items });
      },
      (error) => {
        console.error(error);
        // 前回の内容が表示できているなら、それを消さない(オフラインなど)
        setState((prev) => (prev.items.length ? prev : { status: 'error', items: [] }));
      }
    );
  }, [studentId, limitTo]);

  const markRead = useCallback((id) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      storage.set(READ_KEY, JSON.stringify([...next].slice(-500)));
      return next;
    });
  }, []);

  // 渡された id をまとめて既読にする(一斉既読)。状態の更新と保存は1回だけ
  const markAllRead = useCallback((ids) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      ids.forEach((id) => { if (!next.has(id)) { next.add(id); changed = true; } });
      if (!changed) return prev;
      storage.set(READ_KEY, JSON.stringify([...next].slice(-500)));
      return next;
    });
  }, []);

  const items = useMemo(
    () => state.items.map((a) => ({ ...a, isUnread: !readIds.has(a.id) })),
    [state.items, readIds]
  );

  return { status: state.status, items, markRead, markAllRead, readIds };
}
