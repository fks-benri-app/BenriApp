// ホームに置く、ガジェット1枚分の枠(中身のガジェット・見出し・編集中の操作部分)。
import React, { forwardRef, useRef } from 'react';
import { gadgetById } from '../../gadgets';
import Icon from '../../components/Icon';
import homeConfig from '../../data/homeConfig.json';

const { radiusXl: R_XL, holdMs: HOLD_MS, slopPx: SLOP } = homeConfig;

// タイトルのカプセル(記号は付けない)と、> のカプセル。色は今の面の色(--surface-3)と文字色を使う
const capsuleStyle = {
  display: 'inline-flex', alignItems: 'center', minWidth: 0, maxWidth: '100%',
  padding: '0.357em 0.929em', borderRadius: 999,
  background: 'var(--surface-3)', color: 'var(--text-strong)',
  fontSize: '0.929em', fontWeight: 700, lineHeight: 1.3,
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
};
const chevronStyle = {
  width: '1.857em', height: '1.857em', borderRadius: 999, flexShrink: 0,
  background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// 長押しで編集に入る(タップは開く)。動く・大きさを変えるのは react-grid-layout が受け持つ。
// forwardRef と ...rest は、react-grid-layout が枠に付ける位置・ドラッグの仕掛けを、そのまま根の要素に渡すため。
const GadgetItem = forwardRef(function GadgetItem(
  { it, editing, onLongPress, onOpen, identity, style, className, children, ...rest },
  ref,
) {
  const g = gadgetById(it.id);
  const press = useRef(null); // 長押しを待っている間の、始まりの位置とタイマー
  if (!g) return null;
  const { Component } = g;

  const endPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };
  const onPointerDown = (e) => {
    if (editing) return;
    const start = { x: e.clientX, y: e.clientY };
    press.current = { ...start, timer: setTimeout(() => { press.current = null; onLongPress(it.id); }, HOLD_MS) };
  };
  const onPointerMove = (e) => {
    if (!press.current) return;
    if (Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > SLOP) endPress();
  };

  return (
    <div ref={ref} style={style} className={className} {...rest}>
      <section
        role={editing ? undefined : 'link'}
        tabIndex={editing ? -1 : 0}
        aria-label={g.title || g.type}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => { if (!editing && g.path) onOpen(g); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !editing && g.path) onOpen(g); }}
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          position: 'relative',
          containerType: 'size', // 中のカプセルの大きさを、枠の小さいほうの辺(cqmin)で決める
          background: 'var(--surface-2)',
          border: '1px solid transparent',
          borderRadius: R_XL,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          outline: editing ? '1px dashed var(--line-strong)' : 'none',
          outlineOffset: '3px',
          cursor: editing ? 'grab' : 'pointer',
          touchAction: editing ? 'none' : 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      >
        {/* タイトルはカプセルの中。右の > は、タップすると開く画面がある印。
            flush の枠(授業カード)では、中身の上に重ねる */}
        <div style={g.flush
          ? { position: 'absolute', top: '11cqmin', left: '12cqmin', right: '12cqmin', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.571em', pointerEvents: 'none' }
          : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.571em', padding: '0.857em 0.857em 0', flexShrink: 0 }}>
          {/* 授業カードの上のカプセルは、半透明の灰色にして、下の緑がうっすら見えるようにする */}
          {(!g.flush || g.title) && <div style={g.flush
            ? { ...capsuleStyle, background: 'rgba(229, 231, 235, 0.5)', fontSize: '7cqmin', padding: '0.3em 0.8em' }
            : capsuleStyle}>{g.title}</div>}
          {g.path && !editing && (
            <div style={chevronStyle}>
              <Icon name="chevronRightSmall" width={7} height={12} color="var(--text-strong)" />
            </div>
          )}
        </div>
        <div className="no-scrollbar" style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', padding: g.flush ? 0 : '0.714em 1.143em 1.143em' }}>
          <Component identity={identity} />
        </div>
      </section>
      {children}
    </div>
  );
});

export default GadgetItem;
