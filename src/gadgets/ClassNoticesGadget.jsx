import React, { useLayoutEffect, useRef, useState } from 'react';
import { useAnnouncements } from '../lib/announcements';
import { KIND_OPTIONS } from '../lib/filters';
import { currentFontSize } from '../lib/fontSize';
import { courseThemeOrNull, shaded } from '../pages/Class';

const KIND_LABELS = Object.fromEntries(KIND_OPTIONS.map((k) => [k.id, k.label]));
const MIN_ITEMS = 2;  // 枠が小さくても、これだけは出す
const ITEM_EM = 7;    // 1件ぶんの高さ(文字の大きさの何倍か)
const MIN_FONT = 9;   // これより小さくはしない(px)

// お知らせ: 枠の高さに合わせて、入るだけ件数を出す(最低2件)。小さすぎる枠では、2件が入るまで文字を小さくする。
export default function ClassNoticesGadget({ identity }) {
  const { status, items } = useAnnouncements(identity?.id);
  const rootRef = useRef(null);
  const [boxH, setBoxH] = useState(0);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const measure = () => setBoxH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 文字の大きさは、ふだんの大きさのまま。枠の高さに入るだけ件数を出す。
  // ただし最低2件は出す。ふだんの大きさで2件も入らない小さい枠(例: 2×2)だけ、2件が入るまで文字を小さくする。
  const baseFont = currentFontSize();
  const countAt = (font) => Math.floor(boxH / (ITEM_EM * font));
  let fontPx = baseFont;
  if (boxH && countAt(baseFont) < MIN_ITEMS) {
    fontPx = Math.max(MIN_FONT, Math.floor(boxH / (MIN_ITEMS * ITEM_EM)));
  }
  const count = boxH ? Math.max(MIN_ITEMS, countAt(fontPx)) : MIN_ITEMS;
  const shown = status === 'ready' ? items.slice(0, count) : [];

  return (
    <div ref={rootRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontSize: `${fontPx}px` }}>
      {status === 'ready' && items.length === 0 && (
        <div style={{ color: 'var(--text-faint)', fontSize: '0.929em', padding: '0.5em 0' }}>まだお知らせはありません</div>
      )}
      {shown.map((a, i) => {
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
              <div style={{ color: 'var(--text-muted)', fontSize: '0.786em', whiteSpace: 'nowrap' }}>{a.time}</div>
              {a.isUnread && (
                <div style={{ width: '0.571em', height: '0.571em', background: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', borderRadius: '50%', flexShrink: 0 }} />
              )}
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
