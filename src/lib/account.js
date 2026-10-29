import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { storage } from './storage';

// users/{生徒ID}.name(GAS が Google アカウントの表示名を保存する)。未保存なら空文字
// 生徒ごとに購読は1つだけ作り、画面を開き直すたびに読み直さない。端末にも保存して、次回すぐ表示する。
const NAME_KEY = (id) => 'accountName:' + id;
const store = new Map(); // 生徒ID → { name, subs: Set<fn> }

function cleanName(v) {
  // 名前の先頭には、6桁の数字(学籍番号の一部)が付いている。表示では外す
  return typeof v === 'string' ? v.replace(/^\d{6}\s*/, '') : '';
}

function entryFor(studentId) {
  let e = store.get(studentId);
  if (e) return e;
  e = { name: cleanName(storage.get(NAME_KEY(studentId)) || ''), subs: new Set() };
  store.set(studentId, e);
  onSnapshot(
    doc(db, 'users', studentId),
    (snap) => {
      const name = cleanName(snap.exists() ? snap.data().name : '');
      e.name = name;
      storage.set(NAME_KEY(studentId), name);
      e.subs.forEach((fn) => fn(name));
    },
    () => { /* 読めなければ、保存ずみの名前をそのまま使う */ }
  );
  return e;
}

export function useAccountName(studentId) {
  const [name, setName] = useState(() => (studentId ? entryFor(studentId).name : ''));
  useEffect(() => {
    if (!studentId) {
      setName('');
      return undefined;
    }
    const e = entryFor(studentId);
    setName(e.name);
    e.subs.add(setName);
    return () => { e.subs.delete(setName); };
  }, [studentId]);
  return name;
}
