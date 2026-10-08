import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';
import { storage } from './storage';

const READ_KEY = 'readIds';

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
  if (/トンボ祭|文化祭/.test(text)) return 'festival';
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
  const lines = [d.title, d.description, d.dueDate ? `期限: ${d.dueDate}` : ''].filter(Boolean);
  return {
    id: doc.id,
    subject: d.courseName || d.category || '通知',
    teacher: d.teacher || '',
    time: formatTime(receivedAt),
    content: lines.join('\n'),
    tag: classify(`${d.title || ''} ${d.description || ''}`),
    link: d.link || null,
  };
}

/**
 * 画面が使うのはこのフックだけ。
 * 将来ログインを入れて保存先のパスが変わっても、ここだけ直せば画面は変わらない。
 * @returns {{ status: 'loading'|'ready'|'error', items: Array, markRead: (id: string) => void }}
 */
export function useAnnouncements(studentId) {
  const [state, setState] = useState({ status: 'loading', items: [] });
  const [readIds, setReadIds] = useState(loadReadIds);

  useEffect(() => {
    if (!studentId) return undefined;
    setState({ status: 'loading', items: [] });
    const q = query(
      collection(db, 'users', studentId, 'announcements'),
      orderBy('receivedAt', 'desc'),
      limit(100)
    );
    // onSnapshot なので、新しい通知が保存されると画面が自動で更新される
    return onSnapshot(
      q,
      (snap) => setState({ status: 'ready', items: snap.docs.map(toAnnouncement) }),
      (error) => {
        console.error(error);
        setState({ status: 'error', items: [] });
      }
    );
  }, [studentId]);

  const markRead = useCallback((id) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      storage.set(READ_KEY, JSON.stringify([...next].slice(-500)));
      return next;
    });
  }, []);

  const items = useMemo(
    () => state.items.map((a) => ({ ...a, isUnread: !readIds.has(a.id) })),
    [state.items, readIds]
  );

  return { status: state.status, items, markRead };
}
