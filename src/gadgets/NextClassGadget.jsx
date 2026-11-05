import React from 'react';
import { shaded } from '../lib/courseTheme';
import { THEMES } from '../lib/themes';
import globeImg from '../assets/images/class/globe.webp';

// 次の授業のガジェット(授業カード)。枠いっぱいに、授業の色の面を出す。
// テスト用の仮のデータ。本物の時間割の取得先ができたら差し替える。
// 背景の色は theme.js の THEMES のキーで指定する(例: green)
const NEXT_CLASS = { name: '地理総合', time: '08:40 - 09:35', room: '221教室', theme: 'green' };

// 大きさはすべて cqmin(枠の幅と高さの小さいほうの1%)で決める。
// 文字サイズの設定は使わない(設定を変えても、この構図は崩れない)。
//
// 縦の並び(上から)。上・左・下の余白をそろえて、全体が上や左に寄らないようにする。
//   余白 11 → カプセル(Home.jsx 側、高さ約13) → すきま → 名前(24) → すきま → 教室と時間(10×2行) → 余白 11
// 左の余白は 12。カプセルも名前も教室も、同じ左端にそろえる。
const MARGIN_X = '12cqmin';
const NAME_STYLE = {
  position: 'absolute', left: MARGIN_X, top: '28cqmin',
  fontSize: '24cqmin', fontWeight: 800, fontFamily: 'Inter', lineHeight: 1.1,
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  // 地球の左端より手前で止める(長い名前は「…」になる)
  maxWidth: 'calc(100cqw - var(--d) * 0.95 - 16cqmin)',
};
const DETAIL_STYLE = {
  position: 'absolute', left: MARGIN_X, bottom: '11cqmin',
  fontSize: '10cqmin', fontWeight: 700, fontFamily: 'Inter', lineHeight: 1.3, whiteSpace: 'nowrap',
};

export default function NextClassGadget() {
  const theme = THEMES[NEXT_CLASS.theme];
  return (
    <div style={{
      // 地球の直径 --d。ふだんは 104cqmin。
      // 横幅がせまい(6×3 など、縦に近い形の)ときは、名前(右端は 12+4文字×24=108cqmin)に被らないよう小さくする。
      // 地球の左端は 100cqw - 0.95×d なので、名前の右端から 4cqmin あけると d ≤ (100cqw - 112cqmin) / 0.95。
      '--d': 'clamp(40cqmin, min(104cqmin, calc((100cqw - 112cqmin) / 0.95)), 104cqmin)',
      position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
      width: '100%', height: '100%', borderRadius: 0,
      background: shaded(theme.gradient),
      color: theme.textColor,
      containerType: 'size', // この枠の幅と高さの小さいほうを、cqmin の基準にする
    }}>
      <div style={NAME_STYLE}>{NEXT_CLASS.name}</div>
      <div style={DETAIL_STYLE}>
        <div>{NEXT_CLASS.room}</div>
        <div>{NEXT_CLASS.time}</div>
      </div>
      {/* 地球は右下に置く。枠の外にはみ出た部分は、枠の overflow: hidden で切れる */}
      <img
        src={globeImg}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: 'absolute', right: 'calc(var(--d) * -0.05)', bottom: 'calc(var(--d) * -0.19)',
          height: 'var(--d)', width: 'auto', pointerEvents: 'none', userSelect: 'none',
        }}
      />
    </div>
  );
}
