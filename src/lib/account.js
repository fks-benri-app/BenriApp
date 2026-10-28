import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// users/{生徒ID}.name(GAS が Google アカウントの表示名を保存する)を読む。未保存なら空文字
export function useAccountName(studentId) {
  const [name, setName] = useState('');
  useEffect(() => {
    if (!studentId) {
      setName('');
      return undefined;
    }
    return onSnapshot(
      doc(db, 'users', studentId),
      (snap) => {
        const v = snap.exists() ? snap.data().name : '';
        setName(typeof v === 'string' ? v : '');
      },
      () => setName('')
    );
  }, [studentId]);
  return name;
}
