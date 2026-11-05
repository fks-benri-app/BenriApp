import React from 'react';
import { currentFontSize } from '../lib/fontSize';
import { shaded } from '../lib/courseTheme';
import { THEMES } from '../lib/themes';
import globeImg from '../assets/images/class/globe.webp';

// 次の授業のガジェット(授業カード)。枠いっぱいに、授業の色の面を出す。
// テスト用の仮のデータ。本物の時間割の取得先ができたら差し替える。
// 背景の色は theme.js の THEMES のキーで指定する(例: green)
const NEXT_CLASS = { name: '地理総合', time: '08:40 - 09:35', room: '221教室', theme: 'green' };
// 枠いっぱいに広げる。角丸は枠に任せる(gadgets.json の flush)。タイトルのカプセルは上に重なる
export default function NextClassGadget() {
  const theme = THEMES[NEXT_CLASS.theme];
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
      width: '100%', height: '100%', padding: '3.2em 1.143em 1.143em', borderRadius: 0,
      // 地の色の上に白を薄くかけて、明るくする(文字は白のまま。0.18 を変えれば濃さを調整できる)
      background: `linear-gradient(rgba(255,255,255,0.18), rgba(255,255,255,0.18)), ${shaded(theme.gradient)}`,
      color: theme.textColor,
      display: 'flex', alignItems: 'center', // カプセルの下で、残りの高さの中央に置く
      fontSize: `${currentFontSize()}px`, // 文字サイズの設定に合わせる(14px を 1 とした比。14px で Figma と同じ大きさ)
    }}>
      <div style={{ position: 'relative', zIndex: 1, minWidth: 0, maxWidth: '62%', display: 'flex', flexDirection: 'column', gap: '0.571em' }}>
        <div style={{
          fontSize: '2.571em', fontWeight: 800, fontFamily: 'Inter', lineHeight: 1.2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {NEXT_CLASS.name}
        </div>
        <div style={{ fontSize: '1.071em', fontWeight: 700, fontFamily: 'Inter', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
          <div>{NEXT_CLASS.room}</div>
          <div>{NEXT_CLASS.time}</div>
        </div>
      </div>
      <img
        src={globeImg}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: 'absolute', right: '3%', top: '50%', transform: 'translateY(-50%)',
          height: '86%', width: 'auto', pointerEvents: 'none', userSelect: 'none',
        }}
      />
    </div>
  );
}
