// ホーム画面。ガジェットを並べ、長押しで並べ替え・大きさの変更ができる。
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdentity } from '../auth/identity';
import BottomNav from '../components/BottomNav';
import { GADGETS, gadgetById } from '../gadgets';
import { currentFontSize } from '../lib/ui/fontSize';
import bellIcon from '../assets/images/icons/bell.svg';
import bellOffIcon from '../assets/images/icons/bell-off.svg';
import { getDevicePushEnabled } from '../lib/push/notifications';
import { BASE_COLS, gridFor, loadLayout, rangeFor, resolveLayout, saveLayout } from '../lib/ui/homeLayout';
import { t } from '../lib/ui/text';
import homeConfig from '../data/homeConfig.json';
import GadgetItem from './home/GadgetItem';

// デザインの決まり(Apple 風): 色は青ひとつ、角丸は決まった段階、影は使わない、太さは 400 / 600 / 700 だけ
const { accent: ACCENT, radiusXl: R_XL, holdMs: HOLD_MS, slopPx: SLOP, gapPx: GAP, edgePx: EDGE, edgeStepPx: EDGE_STEP, extraRows: EXTRA_ROWS } = homeConfig;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ホーム画面: 画面の横幅に合わせた列数のマス目に、ガジェットを置く。
// ・タップ: ガジェットの画面を開く
// ・長押し: 編集モード。ドラッグで動かせる。右下の角をドラッグで大きさを変えられる(最小・最大の範囲内)
// ・重なったときは他を押し下げ、空いた隙間は上へ詰める
// ・編集中に画面の端へ指を寄せると、自動でスクロールする
export default function Home() {
  const navigate = useNavigate();
  // この端末の通知がオンか(オフなら、ベルに斜線を付ける)。画面を開くたびに確かめる
  const [devicePushOn, setDevicePushOn] = useState(true);
  useEffect(() => {
    let alive = true;
    getDevicePushEnabled().then((v) => alive && setDevicePushOn(v)).catch(() => {});
    return () => { alive = false; };
  }, []);
  const { identity } = useIdentity();
  const fontPx = currentFontSize();

  const [size, setSize] = useState({ w: 0, h: 0 }); // 表示領域の大きさ(px)
  const grid = useMemo(
    () => (size.w ? gridFor(size.w, size.h) : { cols: BASE_COLS, cell: 0, rows: 0 }),
    [size],
  );
  const { cols, cell } = grid;

  // 操作して確定した配置(列数つき)。無ければ、保存または初期配置から作る
  const [custom, setCustom] = useState({ cols: 0, items: null });
  const layout = useMemo(
    () => (custom.items && custom.cols === cols ? custom.items : loadLayout(GADGETS, cols)),
    [custom, cols],
  );

  const [preview, setPreview] = useState(null);     // 動かし中の配置(離したら確定する)
  const [activeId, setActiveId] = useState(null);   // 動かしている、または大きさを変えているガジェット
  const [activeType, setActiveType] = useState(null); // 'move' | 'resize'
  const [editing, setEditing] = useState(false);
  // 幅を測れたら true。測る前は、仮の大きさで描かない(位置が後から動いて見えるのを防ぐ)
  const measured = size.w > 0;
  // 最初の位置を描いたあとで、移動のアニメーションを有効にする(開いた直後に、位置がぐわんと動かないように)
  const [animReady, setAnimReady] = useState(false);
  useEffect(() => {
    if (!measured) return undefined;
    let id2 = 0;
    const id1 = requestAnimationFrame(() => { id2 = requestAnimationFrame(() => setAnimReady(true)); });
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2); };
  }, [measured]);

  const mainRef = useRef(null);
  const gridRef = useRef(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const colsRef = useRef(cols);
  colsRef.current = cols;
  const cellRef = useRef(cell);
  cellRef.current = cell;
  const previewRef = useRef(null);
  const editingRef = useRef(false);
  editingRef.current = editing;
  const gesture = useRef(null);       // 動かしている最中の情報
  const press = useRef(null);         // 長押しを待っている最中の情報
  const justLongPressed = useRef(false);

  const showPreview = useCallback((v) => {
    previewRef.current = v;
    setPreview(v);
  }, []);

  // 表示領域の大きさを測る(回転・ウィンドウの大きさの変化・アドレスバーの出入りにも合わせる)
  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = gridRef.current ? gridRef.current.clientWidth : 0;
      const h = el.clientHeight;
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 動かし終わったら、結果を確定して保存する(列数ごとに保存)
  const finishGesture = useCallback(() => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    clearInterval(g.timer);
    window.removeEventListener('pointermove', g.onMove);
    window.removeEventListener('pointerup', g.onEnd);
    window.removeEventListener('pointercancel', g.onEnd);
    const next = previewRef.current;
    if (next) {
      const c = colsRef.current;
      setCustom({ cols: c, items: next });
      saveLayout(next, c);
    }
    showPreview(null);
    setActiveId(null);
    setActiveType(null);
  }, [showPreview]);

  // 動かす(move)か大きさを変える(resize)かを、指の動きから決める
  function startGesture(type, id, clientX, clientY) {
    const origin = layoutRef.current.find((i) => i.id === id);
    if (!origin) return;
    const def = gadgetById(id);
    const main = mainRef.current;
    const g = {
      type, id,
      sx: clientX, sy: clientY,
      lastX: clientX, lastY: clientY,
      startScroll: main ? main.scrollTop : 0,
      timer: null,
    };

    // 指の位置と、画面の送り量から、配置を計算して見せる
    g.update = () => {
      const c = colsRef.current;
      const cw = cellRef.current;
      if (!cw) return;
      const scrollNow = main ? main.scrollTop : g.startScroll;
      // 画面を送った分も、動いた量に入れる(送りながら動かしても、指の下の枠がずれない)
      const dx = Math.round((g.lastX - g.sx) / cw);
      const dy = Math.round((g.lastY - g.sy + (scrollNow - g.startScroll)) / cw);
      const r = rangeFor(def, c);
      let next;
      if (type === 'move') {
        next = { ...origin, x: clamp(origin.x + dx, 0, c - origin.w), y: Math.max(0, origin.y + dy) };
      } else {
        next = {
          ...origin,
          w: clamp(origin.w + dx, r.minW, Math.min(r.maxW, c - origin.x)),
          h: clamp(origin.h + dy, r.minH, r.maxH),
        };
      }
      const cur = previewRef.current;
      const same = cur && cur.find((i) => i.id === id);
      if (same && same.x === next.x && same.y === next.y && same.w === next.w && same.h === next.h) return;
      showPreview(resolveLayout(layoutRef.current.map((i) => (i.id === id ? next : i)), id));
    };

    g.onMove = (e) => {
      g.lastX = e.clientX;
      g.lastY = e.clientY;
      g.update();
    };
    g.onEnd = () => finishGesture();

    // 指が画面の端にあるあいだは、指を動かさなくても送る
    g.timer = setInterval(() => {
      const m = mainRef.current;
      if (!m) return;
      const rect = m.getBoundingClientRect();
      let dir = 0;
      if (g.lastY < rect.top + EDGE) dir = -1;
      else if (g.lastY > rect.bottom - EDGE) dir = 1;
      if (!dir) return;
      const before = m.scrollTop;
      m.scrollTop = before + dir * EDGE_STEP;
      if (m.scrollTop !== before) g.update();
    }, 16);

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
      clearInterval(g.timer);
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
    if (e.pointerType === 'mouse' && e.button !== 0) return; // 右クリックでは動かさない
    if (editingRef.current) {
      startGesture('move', id, e.clientX, e.clientY);
      return;
    }
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
  const bottom = shown.reduce((m, i) => Math.max(m, i.y + i.h), 0);
  const rows = Math.max(grid.rows, bottom + (editing ? EXTRA_ROWS : 0));

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

      {/* ヘッダー(お知らせ画面と同じ形式。タイトルは「ホーム」。編集中は「完了」を出す) */}
      <header style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.857em',
        paddingTop: 'calc(0.571em + env(safe-area-inset-top))',
        paddingBottom: '0.5em',
        background: 'var(--surface)',
        width: '100%',
      }}>
        <div style={{ padding: '0 1em', height: '2.857em', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.857em' }}>
          <div style={{ color: 'var(--text-strong)', fontSize: '1.571em', fontFamily: 'Inter', fontWeight: 700, userSelect: 'none', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {editing ? t('home.edit') : 'ホーム'}
          </div>
          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="hm-press"
              style={{
                flexShrink: 0, border: 'none', borderRadius: 999, padding: '0.6em 1.4em',
                background: ACCENT, color: '#ffffff', fontWeight: 600, fontSize: '0.929em', cursor: 'pointer',
              }}
            >
              完了
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/settings/notify', { state: { from: '/' } })}
              aria-label={devicePushOn ? '通知設定' : t('common.bellOff')}
              title={devicePushOn ? '通知設定' : t('common.bellOff')}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '2.5em', height: '1.571em', padding: 0, border: 'none', background: 'transparent',
                fontSize: 'inherit', color: 'var(--text-body)', cursor: 'pointer', touchAction: 'manipulation', flexShrink: 0,
              }}
            >
              <img
                className="icon-ink"
                src={devicePushOn ? bellIcon : bellOffIcon}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{ width: '1.571em', height: '1.571em', objectFit: 'contain', display: 'block' }}
              />
            </button>
          )}
        </div>
      </header>

      {/* 本体: マス目にガジェットを置く。編集中は背景をタップすると完了 */}
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
          // マス目はヘッダーと同じ左右の余白の内側いっぱいに広げる
          style={{ position: 'relative', margin: '0 1.143em', height: rows * cell }}
        >
          {measured && shown.map((it) => (
            <GadgetItem
              key={it.id}
              it={it}
              activeId={activeId}
              activeType={activeType}
              animReady={animReady}
              cell={cell}
              editing={editing}
              onGadgetPointerDown={onGadgetPointerDown}
              onGadgetPointerMove={onGadgetPointerMove}
              onGadgetPointerUp={onGadgetPointerUp}
              onGadgetClick={onGadgetClick}
              identity={identity}
              startGesture={startGesture}
            />
          ))}
        </div>
      </main>

      {/* 下のバー(他の画面と同じ形式) */}
      <BottomNav active="home" onSelect={onSelectTab} />
    </div>
  );
}
