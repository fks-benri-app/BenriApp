import React from 'react';
import { currentFontSize } from '../lib/fontSize';
import { shaded } from '../lib/courseTheme';
import { THEMES } from '../lib/themes';
import globeImg from '../assets/images/class/globe.webp';

// 次の授業のガジェット(授業カード)。枠いっぱいに、授業の色の面を出す。
// テスト用の仮のデータ。本物の時間割の取得先ができたら差し替える。
// 背景の色は theme.js の THEMES のキーで指定する(例: green)
const NEXT_CLASS = { name: '地理総合', time: '08:40 - 09:35', room: '221教室', theme: 'green' };
// 枠いっぱいに広げる。角丸は枠に任せる(gadgets.json の flush)。タイトルのカプセルは上に重なる。
// 名前は、カプセルの下に置く。教室と時間は、下に置く(高さが変わっても、この2つの位置は保つ)。
export default function NextClassGadget() {
  const theme = THEMES[NEXT_CLASS.theme];
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
      width: '100%', height: '100%', padding: '2.9em 1.143em 0.857em', borderRadius: 0,
      background: shaded(theme.gradient),
      color: theme.textColor,
      display: 'flex',
      fontSize: `${currentFontSize()}px`, // 文字サイズの設定に合わせる(14px を 1 とした比。14px で Figma と同じ大きさ)
    }}>
      <div style={{
        position: 'relative', zIndex: 1, minWidth: 0, maxWidth: '62%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      }}>
        <div style={{
          fontSize: '2em', fontWeight: 800, fontFamily: 'Inter', lineHeight: 1.15,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
        }}>
          {NEXT_CLASS.name}
        </div>
        <div style={{ marginTop: 'auto', fontSize: '0.929em', fontWeight: 700, fontFamily: 'Inter', lineHeight: 1.35, whiteSpace: 'nowrap' }}>
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
          position: 'absolute', right: '4%', top: '50%', transform: 'translateY(-50%)',
          height: '76%', width: 'auto', pointerEvents: 'none', userSelect: 'none',
        }}
      />
    </div>
  );
}
