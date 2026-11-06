import React, { useLayoutEffect, useRef, useState } from 'react';
import { shaded } from '../lib/courseTheme';
import { THEMES } from '../lib/themes';
import { currentFontSize } from '../lib/fontSize';
import globeImg from '../assets/images/class/globe.webp';

// 次の授業のガジェット(授業カード)。枠いっぱいに、授業の色の面を出す。
// テスト用の仮のデータ。本物の時間割の取得先ができたら差し替える。
// 背景の色は theme.js の THEMES のキーで指定する(例: green)
const NEXT_CLASS = { name: '地理総合', time: '08:40 - 09:35', room: '221教室', theme: 'green' };
const LABEL = '次の授業は'; // 見出しは部品が描く(データには置かない)

// 大きさは、枠の幅と高さの小さいほうを 100 としたときの数字(cqmin)。
// 参考画像(2.7:1 の枠)を測って決めた値。
const MARGIN = 15;       // 左の余白(文字の左端)
const LABEL_CQ = 7.5;    // 見出しの文字
const NAME_CQ = 37;      // 名前の文字(1文字あたり)
const ROOM_CQ = 9;       // 教室と時間の文字
const GLOBE_CQ = 104;    // 地球の直径(ふだん)
const GAP = 4;           // 名前と地球のすきま
const MIN_GLOBE = 50;    // これより小さくなるときは、地球を出さない
const BASE_FONT = 14;    // 文字サイズ設定の基準(px)。設定がこれと違うと、文字だけ比例して変わる

export default function NextClassGadget() {
  const theme = THEMES[NEXT_CLASS.theme];
  const k = currentFontSize() / BASE_FONT;
  // 名前の右端(左の余白から、名前の幅とすきま分)。地球はこの右から出す
  const nameEnd = MARGIN + NAME_CQ * k * NEXT_CLASS.name.length + GAP;

  // 地球を出せるかどうかは、枠の実際の大きさで決める(せまくて名前に被るときは出さない)
  const ref = useRef(null);
  const [showGlobe, setShowGlobe] = useState(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const check = () => {
      const { width: w, height: h } = el.getBoundingClientRect();
      const cq = Math.min(w, h) / 100;
      if (!cq) return;
      const d = Math.min(GLOBE_CQ * cq, (w - nameEnd * cq) / 0.95);
      setShowGlobe(d >= MIN_GLOBE * cq);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [nameEnd]);

  return (
    <div ref={ref} style={{
      // 地球の直径。地球の左端は 100cqw - 0.95×d になるので、名前の右端から d を決める
      '--d': `max(0cqmin, min(${GLOBE_CQ}cqmin, calc((100cqw - ${nameEnd}cqmin) / 0.95)))`,
      position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
      width: '100%', height: '100%', borderRadius: 0,
      background: shaded(theme.gradient),
      color: theme.textColor,
      containerType: 'size', // この枠の幅と高さの小さいほうを、cqmin の基準にする
    }}>
      {/* 見出し。カプセルではなく、文字のまま置く */}
      <div style={{
        position: 'absolute', top: '10cqmin', left: `${MARGIN}cqmin`,
        fontSize: `${(LABEL_CQ * k).toFixed(2)}cqmin`, fontWeight: 400, lineHeight: 1.2, whiteSpace: 'nowrap',
      }}>{LABEL}</div>
      <div style={{
        position: 'absolute', top: '23cqmin', left: `${MARGIN}cqmin`,
        fontSize: `${(NAME_CQ * k).toFixed(2)}cqmin`, fontWeight: 800, fontFamily: 'Inter', lineHeight: 1.1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: `calc(100cqw - ${MARGIN * 2}cqmin)`,
      }}>{NEXT_CLASS.name}</div>
      <div style={{
        position: 'absolute', left: `${MARGIN}cqmin`, bottom: '13.5cqmin',
        fontSize: `${(ROOM_CQ * k).toFixed(2)}cqmin`, fontWeight: 700, fontFamily: 'Inter', lineHeight: 1.3, whiteSpace: 'nowrap',
      }}>
        <div>{NEXT_CLASS.room}</div>
        <div>{NEXT_CLASS.time}</div>
      </div>
      {/* 地球は右下に置く。枠の外にはみ出た部分は、枠の overflow: hidden で切れる */}
      {showGlobe && (
        <img
          src={globeImg}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: 'absolute', right: 'calc(var(--d) * -0.05)', bottom: 'calc(var(--d) * -0.17)',
            height: 'var(--d)', width: 'auto', pointerEvents: 'none', userSelect: 'none',
          }}
        />
      )}
    </div>
  );
}
