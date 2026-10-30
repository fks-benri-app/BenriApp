import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdentity } from '../auth/identity';
import BottomNav from '../components/BottomNav';
import { GADGETS, gadgetById } from '../gadgets';
import { currentFontSize } from '../lib/fontSize';
import { COLS, ROWS, loadLayout, resolveLayout, saveLayout } from '../lib/homeLayout';

const NO_SCROLLBAR_CSS = '.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}';
const HOLD_MS = 420;  // この時間さわり続けると、編集モードに入る
const SLOP = 10;      // 長押しの前にこれ以上動いたら、スクロールとみなす
const GAP = 10;       // 枠と枠のあいだ(px)
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 大きさを変える取っ手。角は丸、辺は細長い白い印(キャンバ風)。中心を辺・角の上に置く
const HANDLES = [
  { dir: 'nw', label: '左上', cursor: 'nwse-resize', w: 14, h: 14, box: { left: -14, top: -14 } },
  { dir: 'n', label: '上', cursor: 'ns-resize', w: 26, h: 10, box: { left: '50%', marginLeft: -14, top: -14 } },
  { dir: 'ne', label: '右上', cursor: 'nesw-resize', w: 14, h: 14, box: { right: -14, top: -14 } },
  { dir: 'e', label: '右', cursor: 'ew-resize', w: 10, h: 26, box: { right: -14, top: '50%', marginTop: -14 } },
  { dir: 'se', label: '右下', cursor: 'nwse-resize', w: 14, h: 14, box: { right: -14, bottom: -14 } },
  { dir: 's', label: '下', cursor: 'ns-resize', w: 26, h: 10, box: { left: '50%', marginLeft: -14, bottom: -14 } },
  { dir: 'sw', label: '左下', cursor: 'nesw-resize', w: 14, h: 14, box: { left: -14, bottom: -14 } },
  { dir: 'w', label: '左', cursor: 'ew-resize', w: 10, h: 26, box: { left: -14, top: '50%', marginTop: -14 } },
];

// ホーム画面: 画面を COLS×ROWS に等分したマス目に、ガジェットを置く。
// ・タップ: ガジェットの画面を開く
// ・長押し: 編集モード。ドラッグで整数マス単位に動かせる。右下の角をドラッグで大きさを変えられる(最小・最大の範囲内)
// ・重なったときは、他のガジェットが下へ押し下げられる
export default function Home() {
  const navigate = useNavigate();
  const { identity } = useIdentity();
  const fontPx = currentFontSize();

  const [layout, setLayout] = useState(() => loadLayout(GADGETS));
  const [preview, setPreview] = useState(null);   // 動かし中の配置(離したら保存する)
  const [activeId, setActiveId] = useState(null); // 動かしている、または大きさを変えているガジェット
  const [activeType, setActiveType] = useState(null); // 'move' | 'resize'
  const [editing, setEditing] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 }); // マス目全体の大きさ(px)

  const mainRef = useRef(null);
  const gridRef = useRef(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const previewRef = useRef(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const editingRef = useRef(false);
  editingRef.current = editing;
  const gesture = useRef(null);       // 動かしている最中の情報
  const press = useRef(null);         // 長押しを待っている最中の情報
  const justLongPressed = useRef(false);

  const showPreview = useCallback((v) => {
    previewRef.current = v;
    setPreview(v);
  }, []);

  // 画面の大きさを測って、マス目の大きさを決める(回転や画面の変化にも合わせる)
  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return undefined;
    const measure = () => setSize({ w: gridRef.current ? gridRef.current.clientWidth : 0, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 動かし終わったら、結果を確定して保存する
  const finishGesture = useCallback(() => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    window.removeEventListener('pointermove', g.onMove);
    window.removeEventListener('pointerup', g.onEnd);
    window.removeEventListener('pointercancel', g.onEnd);
    const next = previewRef.current;
    if (next) {
      setLayout(next);
      saveLayout(next);
    }
    showPreview(null);
    setActiveId(null);
    setActiveType(null);
  }, [showPreview]);

  // 動かす(move)か大きさを変える(resize)かを、指の動きから決める
  function startGesture(type, id, clientX, clientY, dir) {
    const origin = layoutRef.current.find((i) => i.id === id);
    if (!origin) return;
    const def = gadgetById(id);
    const g = { type, id, sx: clientX, sy: clientY };
    g.onMove = (e) => {
      const cw = sizeRef.current.w / COLS;
      const ch = sizeRef.current.h / ROWS;
      if (!cw || !ch) return;
      const dx = Math.round((e.clientX - g.sx) / cw);
      const dy = Math.round((e.clientY - g.sy) / ch);
      let next;
      if (type === 'move') {
        next = { ...origin, x: clamp(origin.x + dx, 0, COLS - origin.w), y: Math.max(0, origin.y + dy) };
      } else {
        // 取っ手の向きに応じて、右・左・下・上の辺を動かす(反対側の辺は動かさない)
        const right = origin.x + origin.w;
        const bottom = origin.y + origin.h;
        let { x, y, w, h } = origin;
        if (dir.includes('e')) w = clamp(origin.w + dx, def.minW, Math.min(def.maxW, COLS - origin.x));
        if (dir.includes('w')) {
          x = clamp(origin.x + dx, Math.max(0, right - def.maxW), right - def.minW);
          w = right - x;
        }
        if (dir.includes('s')) h = clamp(origin.h + dy, def.minH, def.maxH);
        if (dir.includes('n')) {
          y = clamp(origin.y + dy, Math.max(0, bottom - def.maxH), bottom - def.minH);
          h = bottom - y;
        }
        next = { ...origin, x, y, w, h };
      }
      const cur = previewRef.current;
      const same = cur && cur.find((i) => i.id === id);
      if (same && same.x === next.x && same.y === next.y && same.w === next.w && same.h === next.h) return;
      showPreview(resolveLayout(layoutRef.current.map((i) => (i.id === id ? next : i)), id));
    };
    g.onEnd = () => finishGesture();
    gesture.current = g;
    setActiveId(id);
    setActiveType(type);
    window.addEventListener('pointermove', g.onMove);
    window.addEventListener('pointerup', g.onEnd);
    window.addEventListener('pointercancel', g.onEnd);
  }

  // 画面を離れるときは、動かしかけの処理と長押しの待ちを止める
  useEffect(() => () => {
    const g = gesture.current;
    if (g) {
      window.removeEventListener('pointermove', g.onMove);
      window.removeEventListener('pointerup', g.onEnd);
      window.removeEventListener('pointercancel', g.onEnd);
    }
    if (press.current) clearTimeout(press.current.timer);
  }, []);

  function enterEditing() {
    setEditing(true);
    justLongPressed.current = true;
    setTimeout(() => { justLongPressed.current = false; }, 350);
    try { navigator.vibrate?.(15); } catch { /* 振動できない端末は無視 */ }
  }

  function onGadgetPointerDown(e, id) {
    if (gesture.current) return;
    if (editingRef.current) {
      startGesture('move', id, e.clientX, e.clientY);
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (press.current) clearTimeout(press.current.timer);
    const sx = e.clientX;
    const sy = e.clientY;
    press.current = {
      sx,
      sy,
      timer: setTimeout(() => {
        press.current = null;
        enterEditing();
        startGesture('move', id, sx, sy);
      }, HOLD_MS),
    };
  }

  function onGadgetPointerMove(e) {
    const p = press.current;
    if (p && (Math.abs(e.clientX - p.sx) > SLOP || Math.abs(e.clientY - p.sy) > SLOP)) {
      clearTimeout(p.timer);
      press.current = null;
    }
  }

  function onGadgetPointerUp() {
    if (press.current) {
      clearTimeout(press.current.timer);
      press.current = null;
    }
  }

  function onGadgetClick(g) {
    if (editingRef.current || justLongPressed.current || !g.path) return;
    navigate(g.path);
  }

  function onSelectTab(id) {
    if (id === 'class') navigate('/class');
    else if (id === 'settings') navigate('/settings');
    // ホームは今いる画面。カレンダーはまだ画面がない
  }

  const shown = preview || layout;
  const rows = Math.max(ROWS, ...shown.map((i) => i.y + i.h));
  const cw = size.w / COLS;
  const ch = size.h / ROWS;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        margin: 0,
        padding: 0,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        fontSize: `${fontPx}px`,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
      }}
    >
      <style>{NO_SCROLLBAR_CSS}</style>

      {/* ===== ヘッダー(他の画面と同じ形式。編集中は「完了」を出す) ===== */}
      <header
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.857em',
          paddingTop: 'calc(2em + env(safe-area-inset-top))',
          paddingBottom: '1.143em',
          background: 'var(--surface)',
          width: '100%',
        }}
      >
        <div style={{ padding: '0 1.714em', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'var(--text-strong)', fontSize: '1.871em', fontFamily: 'Inter', fontWeight: '800', userSelect: 'none' }}>
            {editing ? '編集' : 'ホーム'}
          </div>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '0.5em 1.2em',
                background: 'var(--ink)',
                color: 'var(--on-ink)',
                fontWeight: 700,
                fontSize: '0.857em',
                cursor: 'pointer',
              }}
            >
              完了
            </button>
          )}
        </div>
      </header>

      {/* ===== 本体: マス目にガジェットを置く。編集中は背景をタップすると完了 ===== */}
      <main
        ref={mainRef}
        className="no-scrollbar"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          ref={gridRef}
          onClick={(e) => { if (editingRef.current && e.target === e.currentTarget) setEditing(false); }}
          style={{ position: 'relative', margin: '0 1.714em', height: rows * ch }}
        >
          {shown.map((it) => {
            const g = gadgetById(it.id);
            if (!g) return null;
            const { Component } = g;
            const isActive = activeId === it.id;
            const isMoving = isActive && activeType === 'move';
            const isResizing = isActive && activeType === 'resize';
            // 動かしている間は、指にぴったり付いて(位置は即時)、少し持ち上がって見える。
            // 他の枠は、押し下げられたときに滑らかに移る。
            const transition = isActive
              ? (isResizing
                ? 'transform 0.18s ease, width 0.12s ease, height 0.12s ease'
                : 'transform 0.18s ease, box-shadow 0.18s ease')
              : 'left 0.18s ease, top 0.18s ease, width 0.18s ease, height 0.18s ease, transform 0.18s ease';
            return (
              <div
                key={it.id}
                style={{
                  position: 'absolute',
                  left: it.x * cw + GAP / 2,
                  top: it.y * ch + GAP / 2,
                  width: it.w * cw - GAP,
                  height: it.h * ch - GAP,
                  zIndex: isActive ? 3 : 1,
                  transform: isMoving ? 'scale(1.06)' : 'scale(1)',
                  transformOrigin: 'center center',
                  transition,
                }}
              >
                <section
                  role={editing ? undefined : 'link'}
                  tabIndex={editing ? -1 : 0}
                  aria-label={g.title}
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
                    padding: '0.9em',
                    background: 'var(--surface-2)',
                    borderRadius: '1.143em',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: isActive ? '0 16px 36px rgba(0,0,0,0.28)' : '0 2px 8px rgba(0,0,0,0.02)',
                    outline: editing ? '2px solid #7c3aed' : 'none',
                    cursor: editing ? 'grab' : 'pointer',
                    touchAction: editing ? 'none' : 'manipulation',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                  }}
                >
                  <div style={{ color: 'var(--text-strong)', fontSize: '1.071em', fontWeight: 700, marginBottom: '0.571em', flexShrink: 0 }}>
                    {g.title}
                  </div>
                  <div className="no-scrollbar" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
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
                      borderRadius: '999px',
                      padding: '2px 10px',
                      fontSize: '0.786em',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      zIndex: 5,
                    }}
                  >
                    {it.w} × {it.h}
                  </div>
                )}

                {editing && HANDLES.map((h) => (
                  <div
                    key={h.dir}
                    role="button"
                    aria-label={`${g.title}の大きさを変える(${h.label})`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      startGesture('resize', it.id, e.clientX, e.clientY, h.dir);
                    }}
                    style={{
                      position: 'absolute',
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      touchAction: 'none',
                      cursor: h.cursor,
                      zIndex: 4,
                      ...h.box,
                    }}
                  >
                    <div
                      style={{
                        width: h.w,
                        height: h.h,
                        borderRadius: 999,
                        background: '#ffffff',
                        border: '1px solid rgba(0,0,0,0.18)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                      }}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </main>

      {/* ===== 下のバー(他の画面と同じ形式) ===== */}
      <BottomNav active="home" onSelect={onSelectTab} />
    </div>
  );
}
