import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadFirestore } from '../data/firestoreLazy';
import { watchLive, peekLive } from '../data/liveStore';
import { storage } from '../data/storage';
import { markAnnouncementReadRemote } from '../data/firestoreLazy';
import { cleanTeacher, cleanText, courseKey, courseLabel, joinTitleAndBody, kindOf, shortCourse } from './filters';

const READ_KEY = 'readIds';
const ANNOUNCEMENT_LIMIT = 100; // 一覧は1つの購読で持つ。ホームは先頭だけを表示する

// 前回取得したお知らせは liveStore が覚えており、開いた瞬間に表示する(あとで最新に差し替える)。
// 端末にも保存する(新しい順に30件まで。本文の全文は保存しない)。
const CACHE_SAVE_MAX = 30;
const cacheKey = (studentId) => 'announcements:' + studentId;

// 保存した形 → 画面の形。「今日・昨日」の表示は、読んだ時点の日付で作り直す
const reviveItems = (raw) => (Array.isArray(raw)
  ? raw.map((a) => (a.receivedAtMs ? { ...a, time: formatTime(new Date(a.receivedAtMs)) } : a))
  : []);
const itemsToStored = (items) => items.slice(0, CACHE_SAVE_MAX).map(({ body, rawBody, ...rest }) => rest);

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

// 画面が使うのはこのフックだけ。
// 将来ログインを入れて保存先のパスが変わっても、ここだけ直せば画面は変わらない。
// @returns {{ status: 'loading'|'ready'|'error', items: Array, markRead: (id: string) => void, markAllRead: (ids: string[]) => void }}
export function useAnnouncements(studentId, { limitTo } = {}) {
  const [state, setState] = useState(() => {
    const cached = studentId ? peekLive(cacheKey(studentId), reviveItems) : null;
    return cached ? { status: 'ready', items: cached } : { status: 'loading', items: [] };
  });
  const [readIds, setReadIds] = useState(loadReadIds);

  useEffect(() => {
    if (!studentId) return undefined;
    const cached = peekLive(cacheKey(studentId), reviveItems);
    setState((prev) => (prev.items.length || prev.status === 'ready' ? prev : cached ? { status: 'ready', items: cached } : { status: 'loading', items: [] }));
    // 購読は端末で1つだけ。画面を開き直しても読み直さず、覚えてある値をすぐ出す。変わったところだけ届く
    return watchLive(
      cacheKey(studentId),
      ({ fs, db }) => fs.query(
        fs.collection(db, 'users', studentId, 'announcements'),
        fs.orderBy('receivedAt', 'desc'),
        fs.limit(ANNOUNCEMENT_LIMIT)
      ),
      {
        onValue: (items) => setState({ status: 'ready', items }),
        onError: (error) => {
          console.error(error);
          // 前回の内容が表示できているなら、それを消さない(オフラインなど)
          setState((prev) => (prev.items.length ? prev : { status: 'error', items: [] }));
        },
      },
      { derive: (snap) => snap.docs.map(toAnnouncement).filter((a) => !a.deleted), toStored: itemsToStored }
    );
  }, [studentId]);

  // 既読は端末にも、Firestore にも書く(サーバーが未読の再通知を判断するため)
  const syncRead = useCallback((ids) => {
    if (!studentId) return;
    ids.forEach((id) => {
      markAnnouncementReadRemote(studentId, id).catch((e) => console.warn('既読を保存できませんでした', e && e.code));
    });
  }, [studentId]);

  const markRead = useCallback((id) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      storage.set(READ_KEY, JSON.stringify([...next].slice(-500)));
      return next;
    });
    syncRead([id]);
  }, [syncRead]);

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
    syncRead(ids);
  }, [syncRead]);

  const items = useMemo(
    () => (limitTo ? state.items.slice(0, limitTo) : state.items).map((a) => ({ ...a, isUnread: !readIds.has(a.id) })),
    [state.items, readIds, limitTo]
  );

  return { status: state.status, items, markRead, markAllRead, readIds };
}

// 一覧にまだ無いお知らせを、1件だけ直接読む(通知を押した直後など、キャッシュに入っていないとき)。
// 無ければ null。読み込みに失敗したときは例外を投げる。
export async function fetchAnnouncementById(studentId, docId) {
  const { fs, db } = await loadFirestore();
  const snap = await fs.getDoc(fs.doc(db, 'users', studentId, 'announcements', docId));
  return snap.exists() ? toAnnouncement(snap) : null;
}
