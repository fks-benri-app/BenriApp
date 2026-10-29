import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdentity } from '../auth/identity';
import BottomNav from '../components/BottomNav';
import { GADGETS, gadgetById } from '../gadgets';
import { currentFontSize } from '../lib/fontSize';
import { loadLayout, saveLayout } from '../lib/homeLayout';

const NO_SCROLLBAR_CSS = '.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}';
const HOLD_MS = 420;      // この時間さわり続けると、移動モードになる
const MOVE_SLOP = 10;     // 長押しの前にこれ以上動いたら、スクロールとみなして長押しをやめる
const EDGE = 56;          // 移動中に画面の上下の端がこの距離に近づくと、自動でスクロールする

// ホーム画面: 上のバーと下のバーは他の画面と同じ。本体はガジェットを並べる白紙の場所。
// ガジェットは、枠をタップすると画面を開き、長押しすると上下に動かせる。
export default function Home() {
  const navigate = useNavigate();
  const { identity } = useIdentity();
  const fontPx = currentFontSize();
  const [order, setOrder] = useState(() => loadLayout(GADGETS.map((g) => g.id)));
  const [dragId, setDragId] = useState(null);

  const mainRef = useRef(null);
  const wrapRefs = useRef(new Map());   // id → 場所を取る外側の箱(動かない)
  const cardRefs = useRef(new Map());   // id → 実際に見える枠(指に付いて動く)
  const orderRef = useRef(order);
  orderRef.current = order;
  const press = useRef(null);           // 長押し待ちの状態
  const drag = useRef(null);            // 移動中の状態 { id, grab, pointerY }
  const suppressClick = useRef(false);  // 移動したあとの「タップ」でうっかり画面を開かない

  // 移動中の枠を、指の位置に合わせて動かす(外側の箱は自分の場所のまま)
  const placeDragged = useCallback(() => {
    const d = drag.current;
    if (!d) return;
    const wrap = wrapRefs.current.get(d.id);
    const card = cardRefs.current.get(d.id);
    if (!wrap || !card) return;
    const dy = d.pointerY - d.grab - wrap.getBoundingClientRect().top;
    card.style.transform = `translateY(${dy}px) scale(1.02)`;
  }, []);

  // 並びが変わったら、移動中の枠の位置をもう一度合わせる
  useLayoutEffect(() => { placeDragged(); }, [order, placeDragged]);

  // 指の位置から、並べ替えが必要か調べる(他の枠の中心を越えたら入れ替える)
  const reorderIfNeeded = useCallback(() => {
    const d = drag.current;
    if (!d) return;
    const wrap = wrapRefs.current.get(d.id);
    if (!wrap) return;
    const height = wrap.getBoundingClientRect().height;
    const center = d.pointerY - d.grab + height / 2;
    const cur = orderRef.current;
    const others = cur.filter((id) => id !== d.id);
    let target = 0;
    others.forEach((id) => {
      const r = wrapRefs.current.get(id)?.getBoundingClientRect();
      if (r && r.top + r.height / 2 < center) target += 1;
    });
    if (cur.indexOf(d.id) !== target) {
      const next = [...others];
      next.splice(target, 0, d.id);
      setOrder(next);
    }
  }, []);

  const endDrag = useCallback((commit) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    window.removeEventListener('pointermove', d.onMove);
    window.removeEventListener('pointerup', d.onUp);
    window.removeEventListener('pointercancel', d.onUp);
    window.removeEventListener('touchmove', d.onTouchMove);
    cancelAnimationFrame(d.raf);
    const card = cardRefs.current.get(d.id);
    if (card) card.style.transform = '';
    setDragId(null);
    if (commit) saveLayout(orderRef.current);
    setTimeout(() => { suppressClick.current = false; }, 60);
  }, []);

  const beginDrag = useCallback((id, pointerY) => {
    const wrap = wrapRefs.current.get(id);
    if (!wrap) return;
    suppressClick.current = true;
    try { navigator.vibrate?.(15); } catch { /* 振動できない端末は無視 */ }
    const d = {
      id,
      grab: pointerY - wrap.getBoundingClientRect().top,
      pointerY,
      onMove: (e) => {
        d.pointerY = e.clientY;
        placeDragged();
        reorderIfNeeded();
      },
      onUp: () => endDrag(true),
      // 移動中は、指で画面がスクロールしないようにする
      onTouchMove: (e) => { if (e.cancelable) e.preventDefault(); },
      raf: 0,
    };
    // 画面の上下の端に近いときは、ゆっくり自動でスクロールする
    const loop = () => {
      const main = mainRef.current;
      if (main && drag.current === d) {
        const r = main.getBoundingClientRect();
        let step = 0;
        if (d.pointerY < r.top + EDGE) step = -8;
        else if (d.pointerY > r.bottom - EDGE) step = 8;
        if (step) {
          main.scrollTop += step;
          placeDragged();
          reorderIfNeeded();
        }
        d.raf = requestAnimationFrame(loop);
      }
    };
    drag.current = d;
    window.addEventListener('pointermove', d.onMove);
    window.addEventListener('pointerup', d.onUp);
    window.addEventListener('pointercancel', d.onUp);
    window.addEventListener('touchmove', d.onTouchMove, { passive: false });
    d.raf = requestAnimationFrame(loop);
    setDragId(id);
    requestAnimationFrame(placeDragged);
  }, [endDrag, placeDragged, reorderIfNeeded]);

  const clearPress = useCallback(() => {
    if (press.current) {
      clearTimeout(press.current.timer);
      press.current = null;
    }
  }, []);

  function onPointerDown(e, id) {
    if (drag.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    clearPress();
    const startX = e.clientX;
    const startY = e.clientY;
    press.current = {
      id,
      startX,
      startY,
      lastY: startY,
      timer: setTimeout(() => {
        const p = press.current;
        press.current = null;
        if (p) beginDrag(p.id, p.lastY);
      }, HOLD_MS),
    };
  }

  function onPointerMove(e) {
    const p = press.current;
    if (!p) return;
    p.lastY = e.clientY;
    if (Math.abs(e.clientX - p.startX) > MOVE_SLOP || Math.abs(e.clientY - p.startY) > MOVE_SLOP) clearPress();
  }

  // 画面を離れるときの後始末
  useEffect(() => () => { clearPress(); endDrag(false); }, [clearPress, endDrag]);

  function onSelectTab(id) {
    if (id === 'class') navigate('/class');
    else if (id === 'settings') navigate('/settings');
    // ホームは今いる画面。カレンダーはまだ画面がない
  }

  const gadgets = order.map(gadgetById).filter(Boolean);

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

      {/* ===== ヘッダー(他の画面と同じ形式) ===== */}
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
        <div style={{ padding: '0 1.714em', height: '34px', display: 'flex', alignItems: 'center' }}>
          <div style={{ color: 'var(--text-strong)', fontSize: '1.871em', fontFamily: 'Inter', fontWeight: '800', userSelect: 'none' }}>
            ホーム
          </div>
        </div>
      </header>

      {/* ===== 本体: ガジェットを並べる白紙の場所 ===== */}
      <main
        ref={mainRef}
        className="no-scrollbar"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          padding: '0 1.714em 1.143em',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.143em' }}>
          {gadgets.map((g) => {
            const dragging = dragId === g.id;
            const { Component } = g;
            return (
              <div
                key={g.id}
                ref={(el) => { if (el) wrapRefs.current.set(g.id, el); else wrapRefs.current.delete(g.id); }}
              >
                <section
                  ref={(el) => { if (el) cardRefs.current.set(g.id, el); else cardRefs.current.delete(g.id); }}
                  role="link"
                  tabIndex={0}
                  aria-label={g.title}
                  onPointerDown={(e) => onPointerDown(e, g.id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={clearPress}
                  onPointerCancel={clearPress}
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={() => {
                    if (suppressClick.current || !g.path) return;
                    navigate(g.path);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && g.path) navigate(g.path); }}
                  style={{
                    position: 'relative',
                    zIndex: dragging ? 2 : 'auto',
                    padding: '1.143em',
                    background: 'var(--surface-2)',
                    borderRadius: '1.143em',
                    boxShadow: dragging ? '0 10px 28px rgba(0,0,0,0.22)' : '0 2px 8px rgba(0,0,0,0.02)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    touchAction: 'manipulation',
                    transition: dragging ? 'box-shadow 0.15s ease' : 'box-shadow 0.15s ease, transform 0.15s ease',
                  }}
                >
                  <div style={{ color: 'var(--text-strong)', fontSize: '1.071em', fontWeight: 700, marginBottom: '0.571em' }}>
                    {g.title}
                  </div>
                  <Component identity={identity} />
                </section>
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
