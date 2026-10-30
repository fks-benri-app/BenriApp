import React, { useLayoutEffect, useRef, useState } from 'react';
import { useAnnouncements } from '../lib/announcements';
import { KIND_OPTIONS } from '../lib/filters';
import { currentFontSize } from '../lib/fontSize';
import { courseThemeOrNull, shaded } from '../lib/courseTheme';

const KIND_LABELS = Object.fromEntries(KIND_OPTIONS.map((k) => [k.id, k.label]));
const MIN_ITEMS = 2;   // 枠が小さくても、これだけは出す
const MIN_FONT = 5;    // これより小さくはしない(px)。2×2のような小さい枠でも2件入れるため、かなり小さくなる
const MAX_ITEMS = 12;  // 取得・描画する上限(枠は最大でも縦10マスなので、これで足りる)

// 実際に並べたとき、枠の中に最後まで収まる件数を数える
function countFitting(root) {
  const limit = root.clientHeight;
  let n = 0;
  for (const el of root.children) {
    if (el.offsetTop + el.offsetHeight > limit + 1) break;
    n += 1;
  }
  return n;
}

// お知らせ: 文字の大きさはふだんのまま、枠の高さに入るだけ件数を出す(最低2件)。
// ふだんの大きさで2件も入らない小さい枠(例: 2×2)だけ、2件が入るまで文字を小さくする。
// 高さは見積もらず、実際に並べて測る。
export default function ClassNoticesGadget({ identity }) {
  const { status, items } = useAnnouncements(identity?.id, { limitTo: MAX_ITEMS });
  const rootRef = useRef(null);
  const baseFont = currentFontSize();
  const [fit, setFit] = useState({ font: baseFont, count: MIN_ITEMS });
  const list = status === 'ready' ? items.slice(0, MAX_ITEMS) : [];

  const measure = () => {
    const root = rootRef.current;
    if (!root || !root.clientHeight) return;
    let font = baseFont;
    let count = 0;
    for (; font >= MIN_FONT; font -= 1) {
      root.style.fontSize = `${font}px`;
      count = countFitting(root);
      if (count >= MIN_ITEMS) break;
    }
    if (font < MIN_FONT) {
      font = MIN_FONT;
      root.style.fontSize = `${font}px`;
      count = countFitting(root);
    }
    setFit((prev) => (prev.font === font && prev.count === count ? prev : { font, count }));
  };
  const measureRef = useRef(measure);
  measureRef.current = measure;

  // 中身(お知らせ・文字の大きさ)が変わったとき
  useLayoutEffect(() => { measure(); }, [items, status, baseFont]); // eslint-disable-line react-hooks/exhaustive-deps
  // 枠の大きさが変わったとき
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => measureRef.current());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontSize: `${fit.font}px` }}
    >
      {status === 'ready' && items.length === 0 && (
        <div style={{ color: 'var(--text-faint)', fontSize: '0.929em', padding: '0.5em 0' }}>まだお知らせはありません</div>
      )}
      {list.map((a, i) => {
        const theme = courseThemeOrNull(a.subject);
        return (
          <div
            key={a.id}
            style={{
              padding: '0.6em 0',
              borderTop: i > 0 ? '1px solid var(--line)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4em',
              flexShrink: 0,
              visibility: i < fit.count ? 'visible' : 'hidden', // 入りきらない分は隠す(測るために並べたまま)
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em', minWidth: 0 }}>
              <div style={{ padding: '0.2em 0.5em', background: shaded(theme?.gradient || 'var(--line)'), borderRadius: '0.4em', flexShrink: 0 }}>
                <div style={{ color: theme?.textColor || 'var(--text-strong)', fontSize: '0.786em', fontWeight: 700 }}>{a.subject}</div>
              </div>
              {KIND_LABELS[a.kind] && (
                <div style={{ padding: '0.2em 0.5em', borderRadius: '0.4em', background: 'var(--line)', color: 'var(--text-body)', fontSize: '0.786em', fontWeight: 700, flexShrink: 0 }}>
                  {KIND_LABELS[a.kind]}
                </div>
              )}
              <div style={{ flex: 1 }} />
              <div style={{ color: 'var(--text-muted)', fontSize: '0.786em', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{a.time}</div>
              {/* 既読でも場所は空けておく(時刻の位置をそろえる) */}
              <div style={{ width: '0.571em', height: '0.571em', background: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', borderRadius: '50%', flexShrink: 0, visibility: a.isUnread ? 'visible' : 'hidden' }} />
            </div>
            <div
              style={{
                color: 'var(--text-body)',
                lineHeight: 1.4286,
                wordBreak: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {a.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
