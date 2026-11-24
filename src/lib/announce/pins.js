// お知らせのピン留めを、生徒ごとに端末へ残して読み書きするフック。
import { useCallback, useEffect, useState } from 'react';
import { peekLive, rememberValue } from '../data/liveStore';

const keyOf = (studentId) => 'pins:' + studentId;

function readPins(studentId) {
  if (!studentId) return [];
  const v = peekLive(keyOf(studentId), (raw) => (Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : []));
  return v || [];
}

// ピン留めしたお知らせの ID の一覧と、切り替えの関数を返す。端末に残すので、再読み込みしても残る。
export function usePins(studentId) {
  const [ids, setIds] = useState(() => readPins(studentId));
  useEffect(() => { setIds(readPins(studentId)); }, [studentId]);

  const togglePin = useCallback((id) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (studentId) rememberValue(keyOf(studentId), next);
      return next;
    });
  }, [studentId]);

  return { pinnedIds: ids, togglePin };
}
