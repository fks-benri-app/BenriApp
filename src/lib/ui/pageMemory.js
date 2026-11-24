// 画面を移っても、前に見ていた状態(タブ・絞り込み・検索・スクロール位置)を戻すための記憶。
// この画面の読み込みの間だけ覚える(リロードすると消える)。設定の画面は対象にしない。
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const values = new Map(); // key → 値
const scrolls = new Map(); // key → scrollTop

// useState と同じ形で使う。値が変わるたびに覚えておき、次に開いたときはその値から始める
export function usePageMemory(key, initial) {
  const [value, setValue] = useState(() => (values.has(key) ? values.get(key) : initial));
  useEffect(() => { values.set(key, value); }, [key, value]);
  return [value, setValue];
}

// スクロールする <main> の位置を覚えて戻す。内容が後から届く場合に備え、数フレームの間は戻し続ける。
// 戻している間の scroll は覚えない(内容が足りず、位置が縮められるのを記憶しないため)。
export function useScrollMemory(key, ref) {
  const restoredRef = useRef(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const saved = scrolls.get(key);
    let raf = 0;
    let tries = 0;
    let restoring = saved !== undefined && saved > 0;
    const restore = () => {
      el.scrollTop = saved;
      if (Math.abs(el.scrollTop - saved) < 2 || tries++ > 60) { restoring = false; return; }
      raf = requestAnimationFrame(restore);
    };
    if (restoring) restore();
    const onScroll = () => { if (!restoring) scrolls.set(key, el.scrollTop); };
    el.addEventListener('scroll', onScroll, { passive: true });
    restoredRef.current = true;
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      if (!restoring) scrolls.set(key, el.scrollTop);
    };
  }, [key, ref]);
}
