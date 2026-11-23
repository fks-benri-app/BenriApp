// お知らせのリマインド(時刻)を、生徒ごとに端末へ残して読み書きするフック。と、時刻の候補を作る関数。
import { useCallback, useEffect, useState } from 'react';
import { peekLive, rememberValue } from '../data/liveStore';

const keyOf = (studentId) => 'reminders:' + studentId;

function readMap(studentId) {
  if (!studentId) return {};
  const v = peekLive(keyOf(studentId), (raw) => {
    const out = {};
    if (raw && typeof raw === 'object') {
      Object.entries(raw).forEach(([id, ms]) => { if (typeof ms === 'number') out[id] = ms; });
    }
    return out;
  });
  return v || {};
}

// { お知らせID: 時刻(ms) } の対応表と、設定・解除の関数を返す。ms を null にすると解除する。
export function useReminders(studentId) {
  const [map, setMap] = useState(() => readMap(studentId));
  useEffect(() => { setMap(readMap(studentId)); }, [studentId]);

  const setReminder = useCallback((id, ms) => {
    setMap((prev) => {
      const next = { ...prev };
      if (ms) next[id] = ms; else delete next[id];
      if (studentId) rememberValue(keyOf(studentId), next);
      return next;
    });
  }, [studentId]);

  return { reminders: map, setReminder };
}

// ダイアログの候補。いまから1時間後・明日の朝8時・明日の夕方18時(ms)
export function reminderPresets(now = new Date()) {
  const hour = now.getTime() + 60 * 60 * 1000;
  const morning = new Date(now); morning.setDate(morning.getDate() + 1); morning.setHours(8, 0, 0, 0);
  const evening = new Date(now); evening.setDate(evening.getDate() + 1); evening.setHours(18, 0, 0, 0);
  return { hour, morning: morning.getTime(), evening: evening.getTime() };
}
