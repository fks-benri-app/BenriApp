// ホーム画面。ガジェットを並べ、長押しで並べ替え・大きさの変更ができる。
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useNavigate } from 'react-router-dom';
import { useIdentity } from '../auth/identity';
import BottomNav from '../components/BottomNav';
import { GADGETS, gadgetById } from '../gadgets';
import { currentFontSize } from '../lib/ui/fontSize';
import { useScrollMemory } from '../lib/ui/pageMemory';
import bellIcon from '../assets/images/icons/bell.svg';
import bellOffIcon from '../assets/images/icons/bell-off.svg';
import { getDevicePushEnabled } from '../lib/push/notifications';
import { BASE_COLS, gridFor, loadLayout, saveLayout } from '../lib/ui/homeLayout';
import { t } from '../lib/ui/text';
import homeConfig from '../data/homeConfig.json';
import GadgetItem from './home/GadgetItem';

// デザインの決まり(Apple 風): 色は青ひとつ、角丸は決まった段階、影は使わない、太さは 400 / 600 / 700 だけ
const { accent: ACCENT, gapPx: GAP } = homeConfig;

// ホーム画面: react-grid-layout の格子に、ガジェットを置く。
// ・タップ: ガジェットの画面を開く
// ・長押し: 編集モード。ドラッグで動かす、角をドラッグで大きさを変える(最小・最大の範囲内)
// ・重なったときは他を押し下げ、空いた隙間は上へ詰める(react-grid-layout の縦の詰め)
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
  const items = useMemo(
    () => (custom.items && custom.cols === cols ? custom.items : loadLayout(GADGETS, cols)),
    [custom, cols],
  );
  // react-grid-layout の形(範囲つき)。全幅のガジェットは、横いっぱいに固定する
  const rglLayout = useMemo(() => items.map((i) => {
    const g = gadgetById(i.id);
    const full = g && g.fullWidth;
    return {
      i: i.id, x: i.x, y: i.y, w: i.w, h: i.h,
      minW: full ? cols : (g ? g.minW : 1), maxW: full ? cols : (g ? g.maxW : cols),
      minH: g ? g.minH : 1, maxH: g ? g.maxH : 40,
    };
  }), [items, cols, ]);

  const [editing, setEditing] = useState(false);
  // 幅を測れたら true。測る前は、仮の大きさで描かない(位置が後から動いて見えるのを防ぐ)
  const measured = size.w > 0;

  const mainRef = useRef(null);
  useScrollMemory('home', mainRef);
  const gridRef = useRef(null);
  const editingRef = useRef(false);
  editingRef.current = editing;

  // 表示領域の大きさを測る(回転・ウィンドウの大きさの変化・アドレスバーの出入りにも合わせる)
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth;
      const h = mainRef.current ? mainRef.current.clientHeight : 0;
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 動かし終わったら保存する(列数ごとに保存)
  const onLayoutChange = (next) => {
    if (!editingRef.current) return;
    const c = colsRef.current;
    const mapped = next.map((n) => ({ id: n.i, x: n.x, y: n.y, w: n.w, h: n.h }));
    setCustom({ cols: c, items: mapped });
  };
  const colsRef = useRef(cols);
  colsRef.current = cols;
  const persist = () => {
    const cur = customRef.current;
    if (cur.items) saveLayout(cur.items, colsRef.current);
  };
  const customRef = useRef(custom);
  customRef.current = custom;

  const onOpen = (g) => { if (g.path) navigate(g.path); };
  const onLongPress = () => setEditing(true);

  function onSelectTab(id) {
    if (id === 'class') navigate('/class');
    else if (id === 'settings') navigate('/settings');
    else if (id === 'calendar') navigate('/calendar');
    // ホームは今いる画面
  }

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
        paddingTop: 'calc(2em + env(safe-area-inset-top))',
        paddingBottom: '1.143em',
        background: 'var(--surface)',
        width: '100%',
      }}>
        <div style={{ padding: '0 1.714em', height: '34px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.857em' }}>
          <div style={{ color: 'var(--text-strong)', fontSize: '1.871em', fontFamily: 'Noto Sans JP', fontWeight: 800, userSelect: 'none', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {editing ? t('home.edit') : 'ホーム'}
          </div>
          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="hm-press"
              style={{
                flexShrink: 0, border: 'none', borderRadius: 999, padding: '0.6em 1.4em',
                background: ACCENT, color: 'var(--on-accent)', fontWeight: 600, fontSize: '0.929em', cursor: 'pointer',
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
              <img className="icon-ink" src={devicePushOn ? bellIcon : bellOffIcon} alt="" aria-hidden="true" draggable={false} style={{ width: '1.571em', height: '1.571em', objectFit: 'contain', display: 'block' }} />
            </button>
          )}
        </div>
      </header>

      {/* 本体: 格子にガジェットを置く。編集中は背景をタップすると完了 */}
      <main
        ref={mainRef}
        className="no-scrollbar"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        <div
          ref={gridRef}
          onClick={(e) => { if (editingRef.current && e.target === e.currentTarget) setEditing(false); }}
          // 格子は、ヘッダーと同じ左右の余白の内側いっぱいに広げる
          style={{ margin: '0 1.143em' }}
        >
          {measured && (
            <GridLayout
              className="home-grid"
              width={size.w}
              cols={cols}
              rowHeight={cell - GAP}
              margin={[GAP, GAP]}
              containerPadding={[0, 0]}
              layout={rglLayout}
              onLayoutChange={onLayoutChange}
              onDragStop={persist}
              onResizeStop={persist}
              isDraggable={editing}
              isResizable={editing}
              useCSSTransforms
            >
              {rglLayout.map((li) => {
                const it = { id: li.i };
                return (
                  <GadgetItem
                    key={li.i}
                    it={it}
                    editing={editing}
                    onLongPress={onLongPress}
                    onOpen={onOpen}
                    identity={identity}
                  />
                );
              })}
            </GridLayout>
          )}
        </div>
      </main>

      {/* 下のバー(他の画面と同じ形式) */}
      <BottomNav active="home" onSelect={onSelectTab} />
    </div>
  );
}
