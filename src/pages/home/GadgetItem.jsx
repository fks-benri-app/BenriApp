// ホームに置く、ガジェット1枚分の枠(中身のガジェット・見出し・編集中の操作部分)。
import React from 'react';
import { gadgetById } from '../../gadgets';
import Icon from '../../components/Icon';
import { t } from '../../lib/ui/text';
import homeConfig from '../../data/homeConfig.json';

const { accent: ACCENT, radiusXl: R_XL, gapPx: GAP } = homeConfig;

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

export default function GadgetItem({ it, activeId, activeType, animReady, cell, editing, onGadgetPointerDown, onGadgetPointerMove, onGadgetPointerUp, onGadgetClick, identity, startGesture }) {
  const g = gadgetById(it.id);
  if (!g) return null;
  const { Component } = g;
  const isActive = activeId === it.id;
  const isMoving = isActive && activeType === 'move';
  const isResizing = isActive && activeType === 'resize';
  // 動かしている間は指にぴったり付いて(位置は即時)、少し持ち上がって見える。
  // 他の枠は、押し下げられたり詰められたりしたときに滑らかに移る。
  const transition = isActive
    ? (isResizing
      ? 'transform 0.18s ease, width 0.12s ease, height 0.12s ease'
      : 'transform 0.18s ease, background 0.18s ease')
    : (animReady ? 'left 0.18s ease, top 0.18s ease, width 0.18s ease, height 0.18s ease, transform 0.18s ease' : 'none');
  return (
    <div
      key={it.id}
      style={{
        position: 'absolute',
        left: it.x * cell + GAP / 2,
        top: it.y * cell + GAP / 2,
        width: it.w * cell - GAP,
        height: it.h * cell - GAP,
        zIndex: isActive ? 3 : 1,
        transform: isMoving ? 'scale(1.04)' : 'scale(1)',
        transformOrigin: 'center center',
        transition,
      }}
    >
      <section
        role={editing ? undefined : 'link'}
        tabIndex={editing ? -1 : 0}
        aria-label={g.title || g.type}
        onPointerDown={(e) => onGadgetPointerDown(e, it.id)}
        onPointerMove={onGadgetPointerMove}
        onPointerUp={onGadgetPointerUp}
        onPointerCancel={onGadgetPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => onGadgetClick(g)}
        onKeyDown={(e) => { if (e.key === 'Enter') onGadgetClick(g); }}
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          position: 'relative',
          containerType: 'size', // 中のカプセルの大きさを、枠の小さいほうの辺(cqmin)で決める
          padding: 0,
          // 影は使わない。動かしている間は、面の色を変えて浮いて見せる
          background: isMoving ? 'var(--surface)' : 'var(--surface-2)',
          border: `1px solid ${isMoving ? 'var(--line-strong)' : 'transparent'}`,
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

      {isResizing && (
        <div
          style={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--ink)',
            color: 'var(--on-ink)',
            borderRadius: 999,
            padding: '3px 12px',
            fontSize: '0.786em',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          {it.w} × {it.h}
        </div>
      )}

      {editing && (
        <div
          role="button"
          aria-label={t('home.resize', { title: g.title })}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            startGesture('resize', it.id, e.clientX, e.clientY);
          }}
          style={{
            position: 'absolute',
            right: -8,
            bottom: -8,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: ACCENT,
            color: 'var(--on-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none',
            cursor: 'nwse-resize',
            zIndex: 4,
          }}
        >
          <Icon name="closeSmall" size={14} />
        </div>
      )}
    </div>
  );
}
