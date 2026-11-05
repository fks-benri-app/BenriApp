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
// 理想の画像(高さ253px = 100cqmin の枠)を、ピクセルで測って決めた値:
//   名前   : 文字の高さ60px・幅270px → フォント 27、文字の上端が上から 33.6 → 枠の上から 32
//   教室   : 文字の幅104px → フォント 11、時間との行の間隔 35px → 行の高さ 1.25(13.75)
//   時間   : 文字の下端が下から 35px(13.8) → 枠の下から 11
//   左端   : 文字の左端が左から 37px(14.6) → 文字の余白を 13.5(カプセルは 12 のまま)
const MARGIN_X = '13.5cqmin';
const NAME_STYLE = {
  position: 'absolute', fontSize: '27cqmin', fontWeight: 800, fontFamily: 'Inter', lineHeight: 1.1,
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  // 地球の左端より手前で止める(長い名前は「…」になる)
  maxWidth: 'calc(100cqw - var(--d) * 0.95 - 18cqmin)',
};
const DETAIL_STYLE = {
  fontSize: '11cqmin', fontWeight: 700, fontFamily: 'Inter', lineHeight: 1.25, whiteSpace: 'nowrap',
};

export default function NextClassGadget() {
  const theme = THEMES[NEXT_CLASS.theme];
  return (
    <div style={{
      // 地球の直径 --d。ふだんは 104cqmin。
      // 横幅がせまい(6×3 など、縦に近い形の)ときは、名前に被らないよう小さくする。
      // 地球の左端は 100cqw - 0.95×d なので、名前の右端(13.5 + 4文字×27 = 121.5cqmin)から 4.5cqmin あけると d ≤ (100cqw - 126cqmin) / 0.95。
      '--d': 'clamp(40cqmin, min(104cqmin, calc((100cqw - 126cqmin) / 0.95)), 104cqmin)',
      position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
      width: '100%', height: '100%', borderRadius: 0,
      background: shaded(theme.gradient),
      color: theme.textColor,
      containerType: 'size', // この枠の幅と高さの小さいほうを、cqmin の基準にする
    }}>
      {/* 名前は上から、教室と時間は下から置く。カプセルと名前のすきまは名前の上の位置で決まる */}
      <div style={{ ...NAME_STYLE, top: '32cqmin', left: MARGIN_X }}>{NEXT_CLASS.name}</div>
      <div style={{ ...DETAIL_STYLE, position: 'absolute', left: MARGIN_X, bottom: '11cqmin' }}>
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
