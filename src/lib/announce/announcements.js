// お知らせの取得(liveStore 経由)と、既読の管理。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadFirestore, markAnnouncementReadRemote, saveReadStateRemote } from '../data/firestoreLazy';
import { watchLive, peekLive, rememberValue } from '../data/liveStore';
import { storage } from '../data/storage';
import { cleanTeacher, cleanText, courseKey, courseLabel, joinTitleAndBody, kindOf, shortCourse } from './filters';

const READ_KEY = 'readIds';
// 購読(リアルタイム)で持つのは新しい順の先頭だけ。古いものは「もっと見る」で、ページごとに1回だけ読む。
// 起動のたびに100件読まないようにするため(読み取り回数を抑える)。
const ANNOUNCEMENT_LIMIT = 30;

// 前回取得したお知らせは liveStore が覚えており、開いた瞬間に表示する(あとで最新に差し替える)。
// 端末にも保存する(新しい順に30件まで。本文の全文は保存しない)。
const CACHE_SAVE_MAX = 30;
const cacheKey = (studentId) => 'announcements:' + studentId;

// 授業ごとの投稿(courses/{授業ID}/posts)を読むか。false にすると、生徒ごとの announcements を読む(切り戻し用)。
// 既読は授業の投稿なら users/{ID}/readState/main に書く。生徒ごとの announcements の既読(GAS の未読通知が見る)も続けて書く。
const USE_COURSE_POSTS = true;
// 「where in」で指定できる授業IDの数の上限(Firestore の制限)
const COURSE_IDS_LIMIT = 30;
const coursesKey = (studentId) => 'courses:' + studentId;
const readStateKey = (studentId) => 'readState:' + studentId;

// 読む元を決める。授業ごとの場合は ids(本人が入っている授業ID)で絞る。
// key は覚えておく場所の名前、query(fs, db, after) は一覧の問い合わせ(after が無いと先頭から)
function sourceOf(studentId, ids) {
  if (!USE_COURSE_POSTS) {
    return {
      key: cacheKey(studentId),
      query: (fs, db, after) => fs.query(
        fs.collection(db, 'users', studentId, 'announcements'),
        fs.orderBy('receivedAt', 'desc'),
        ...(after ? [fs.startAfter(after)] : []),
        fs.limit(ANNOUNCEMENT_LIMIT)
      ),
    };
  }
  if (!ids.length) return { key: null, empty: true };
  return {
    key: 'posts:' + studentId + ':' + ids.join(','),
    query: (fs, db, after) => fs.query(
      fs.collectionGroup(db, 'posts'),
      fs.where('courseId', 'in', ids),
      fs.orderBy('receivedAt', 'desc'),
      ...(after ? [fs.startAfter(after)] : []),
      fs.limit(ANNOUNCEMENT_LIMIT)
    ),
  };
}

// 授業の投稿(リンクから作る)に対応する、生徒ごとの announcements の文書ID(授業ID.種類.投稿ID)
function personalDocIdOf(link) {
  const m = typeof link === 'string' && link.match(/\/c\/([^/]+)\/(p|a|m|sa)\/([^/?#]+)/);
  return m ? m[1] + '.' + m[2] + '.' + m[3] : null;
}

// 古いページ(「もっと見る」で読んだもの)を、生徒ごとに、この画面のセッションの間だけ覚えておく。
// 購読の先頭(head)は、購読が届くたびに更新する。cursor は次のページの開始位置(読んだ最後の文書)。
const olderStore = new Map(); // 読む元の key → { head, cursor, items, hasMore, loading }
// 「もっと見る」で読んだ古いページは端末にも残す(リロードしても読み直さないため。新しい順に OLDER_SAVE_MAX 件まで)
const OLDER_SAVE_MAX = 90;
const olderKey = (key) => 'older:' + key;
function olderFor(key) {
  let o = olderStore.get(key);
  if (!o) {
    const saved = peekLive(olderKey(key));
    o = saved
      ? { head: null, cursor: null, cursorMs: saved.cursorMs, items: reviveItems(saved.items), hasMore: saved.hasMore, loading: false }
      : { head: null, cursor: null, cursorMs: null, items: [], hasMore: true, loading: false };
    olderStore.set(key, o);
  }
  return o;
}
// 古いページを端末に保存する。先頭(新しい方)から残すので、残した最後の時刻から続けて読める
function saveOlder(key, o) {
  const kept = o.items.slice(0, OLDER_SAVE_MAX);
  const last = kept[kept.length - 1];
  rememberValue(olderKey(key), {
    items: itemsToStored(kept),
    hasMore: o.hasMore || kept.length < o.items.length,
    cursorMs: last ? last.receivedAtMs : null,
  });
}

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
  // 本人の授業ID(授業ごとの投稿を読むときに使う)。まだ届いていなければ null
  const [courseIds, setCourseIds] = useState(() => (studentId && USE_COURSE_POSTS ? peekLive(coursesKey(studentId)) : null));
  // サーバーに保存された既読(授業の投稿の既読。postId の集合)
  const [serverReads, setServerReads] = useState(() => new Set((studentId && USE_COURSE_POSTS && peekLive(readStateKey(studentId))) || []));
  const idsKey = courseIds === null ? null : courseIds.slice(0, COURSE_IDS_LIMIT).join(',');
  const source = useMemo(() => {
    if (!studentId) return null;
    if (USE_COURSE_POSTS && idsKey === null) return null; // 授業IDがまだ届いていない
    return sourceOf(studentId, idsKey ? idsKey.split(',') : []);
  }, [studentId, idsKey]);

  const [state, setState] = useState(() => {
    const cached = source && !source.empty ? peekLive(source.key, reviveItems) : null;
    return cached ? { status: 'ready', items: cached } : { status: 'loading', items: [] };
  });
  const [readIds, setReadIds] = useState(loadReadIds);
  const [older, setOlder] = useState(() => {
    const o = source && !source.empty ? olderFor(source.key) : null;
    return { items: o ? o.items : [], hasMore: o ? o.hasMore : false, loading: false };
  });

  // 本人の授業ID(入っている授業)を購読する。授業に入ると GAS が users/{id}/courses に書く
  useEffect(() => {
    if (!studentId || !USE_COURSE_POSTS) return undefined;
    return watchLive(
      coursesKey(studentId),
      ({ fs, db }) => fs.collection(db, 'users', studentId, 'courses'),
      { onValue: (ids) => setCourseIds(ids) },
      { derive: (snap) => snap.docs.map((d) => d.id), toStored: (v) => v }
    );
  }, [studentId]);

  // 既読(授業の投稿)を購読する
  useEffect(() => {
    if (!studentId || !USE_COURSE_POSTS) return undefined;
    return watchLive(
      readStateKey(studentId),
      ({ fs, db }) => fs.doc(db, 'users', studentId, 'readState', 'main'),
      { onValue: (ids) => setServerReads(new Set(ids)) },
      { derive: (snap) => Object.keys((snap.exists() && snap.data().reads) || {}), toStored: (v) => v }
    );
  }, [studentId]);

  useEffect(() => {
    if (!studentId || !source) return undefined;
    if (source.empty) { setState({ status: 'ready', items: [] }); return undefined; }
    const o = olderFor(source.key);
    setOlder({ items: o.items, hasMore: o.hasMore, loading: o.loading });
    const cached = peekLive(source.key, reviveItems);
    setState((prev) => (prev.items.length || prev.status === 'ready' ? prev : cached ? { status: 'ready', items: cached } : { status: 'loading', items: [] }));
    // 購読は端末で1つだけ。画面を開き直しても読み直さず、覚えてある値をすぐ出す。変わったところだけ届く
    return watchLive(
      source.key,
      ({ fs, db }) => source.query(fs, db, null),
      {
        // 購読の先頭の最後の文書を覚える(「もっと見る」の開始位置に使う)。上限より少なければ、もう古いものは無い
        onSnap: (snap) => {
          const o2 = olderFor(source.key);
          o2.head = snap.docs[snap.docs.length - 1] || null;
          if (!o2.cursor) o2.hasMore = snap.size >= ANNOUNCEMENT_LIMIT;
        },
        onValue: (items) => {
          // 先頭の文書が届く前(端末の保存から出したとき)は、「もっと見る」の開始位置が無い。表示中の最後の時刻で代える
          const o2 = olderFor(source.key);
          if (!o2.head && !o2.cursorMs && items.length) o2.cursorMs = items[items.length - 1].receivedAtMs;
          setState({ status: 'ready', items });
        },
        onError: (error) => {
          console.error(error);
          // 前回の内容が表示できているなら、それを消さない(オフラインなど)
          setState((prev) => (prev.items.length ? prev : { status: 'error', items: [] }));
        },
      },
      { derive: (snap) => snap.docs.map(toAnnouncement).filter((a) => !a.deleted), toStored: itemsToStored }
    );
  }, [studentId, source]);

  // 画面に出している一覧を、既読の書き込みから引けるように覚える
  const itemsRef = useRef([]);

  // 既読は端末にも、Firestore にも書く(サーバーが未読の再通知を判断するため)
  const syncRead = useCallback((ids) => {
    if (!studentId || !ids.length) return;
    const warn = (e) => console.warn('既読を保存できませんでした', e && e.code);
    if (!USE_COURSE_POSTS) {
      ids.forEach((id) => markAnnouncementReadRemote(studentId, id).catch(warn));
      return;
    }
    // 授業の投稿の既読(readState/main に、投稿ID → 時刻)
    const now = Date.now();
    saveReadStateRemote(studentId, Object.fromEntries(ids.map((id) => [id, now]))).catch(warn);
    // GAS の未読通知が見る、生徒ごとの announcements の既読も付ける(無い文書は読めないので、失敗しても続ける)
    ids.forEach((id) => {
      const item = itemsRef.current.find((a) => a.id === id);
      const docId = item && personalDocIdOf(item.link);
      if (docId) markAnnouncementReadRemote(studentId, docId).catch(() => {});
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

  // 古いページを1つ読み足す。読んだ分は olderStore に残すので、画面を開き直しても読み直さない
  const loadMore = useCallback(async () => {
    if (!studentId || !source || source.empty) return;
    const o = olderFor(source.key);
    if (o.loading || !o.hasMore) return;
    if (!o.cursor && !o.cursorMs && !o.head) return; // 購読がまだ届いていない
    o.loading = true;
    setOlder((prev) => ({ ...prev, loading: true }));
    try {
      const { fs, db } = await loadFirestore();
      // 続きの位置: この画面で読んだ最後の文書 → 端末に残した最後の時刻 → 先頭ページの最後
      const after = o.cursor || (o.cursorMs ? fs.Timestamp.fromMillis(o.cursorMs) : o.head);
      const snap = await fs.getDocs(source.query(fs, db, after));
      const all = snap.docs.map(toAnnouncement);
      o.items = [...o.items, ...all.filter((a) => !a.deleted)];
      if (snap.docs.length) {
        o.cursor = snap.docs[snap.docs.length - 1];
        o.cursorMs = all[all.length - 1].receivedAtMs;
      }
      o.hasMore = snap.size >= ANNOUNCEMENT_LIMIT;
      saveOlder(source.key, o);
    } catch (e) {
      console.error(e);
    } finally {
      o.loading = false;
      setOlder({ items: o.items, hasMore: o.hasMore, loading: false });
    }
  }, [studentId, source]);

  // 購読の先頭と、読み足した古いページをつなぐ。同じお知らせは先頭の方(新しい版)を使う
  const merged = useMemo(() => {
    if (!older.items.length) return state.items;
    const seen = new Set(state.items.map((a) => a.id));
    const extra = [];
    older.items.forEach((a) => {
      if (!seen.has(a.id)) { seen.add(a.id); extra.push(a); }
    });
    return state.items.concat(extra);
  }, [state.items, older.items]);

  itemsRef.current = merged;

  const items = useMemo(
    () => (limitTo ? merged.slice(0, limitTo) : merged).map((a) => ({ ...a, isUnread: !(readIds.has(a.id) || serverReads.has(a.id)) })),
    [merged, readIds, serverReads, limitTo]
  );

  return {
    status: state.status,
    items,
    markRead,
    markAllRead,
    readIds,
    hasMore: older.hasMore,
    loadingMore: older.loading,
    loadMore,
  };
}

// 一覧にまだ無いお知らせを、1件だけ直接読む(通知を押した直後など、キャッシュに入っていないとき)。
// 無ければ null。読み込みに失敗したときは例外を投げる。
export async function fetchAnnouncementById(studentId, docId) {
  const { fs, db } = await loadFirestore();
  const snap = await fs.getDoc(fs.doc(db, 'users', studentId, 'announcements', docId));
  return snap.exists() ? toAnnouncement(snap) : null;
}
