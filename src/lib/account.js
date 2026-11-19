import { useEffect, useState } from 'react';
import { watchUser, peekLive } from './liveStore';

// users/{生徒ID}.name(GAS が Google アカウントの表示名を保存する)。未保存なら空文字。
// 購読・覚えておく・端末への保存は、すべて liveStore が行う(名前の整形も liveStore の watchUser の中)。

const nameKey = (id) => 'user:' + id;

export function useAccountName(studentId) {
  const [name, setName] = useState(() => (studentId ? peekLive(nameKey(studentId) + ':name') || '' : ''));
  useEffect(() => {
    if (!studentId) {
      setName('');
      return undefined;
    }
    return watchUser(studentId, null, null, { onValue: setName });
  }, [studentId]);
  return name;
}
