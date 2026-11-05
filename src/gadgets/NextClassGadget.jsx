import React from 'react';
import { currentFontSize } from '../lib/fontSize';
import { shaded } from '../lib/courseTheme';
import { THEMES } from '../lib/themes';
import globeImg from '../assets/images/class/globe.webp';

// 次の授業のガジェット(授業カード)。枠いっぱいに、授業の色の面を出す。
// テスト用の仮のデータ。本物の時間割の取得先ができたら差し替える。
// 背景の色は theme.js の THEMES のキーで指定する(例: green)
const NEXT_CLASS = { name: '地理総合', time: '08:40 - 09:35', room: '221教室', theme: 'green' };

// 大きさは、枠の幅と高さの小さいほう(cqmin)で決める。どの枠の大きさでも、同じ構図になる。
// 数字は、高さ126px(2マス)の枠での目安を、1cqmin(小さいほうの1%)で書いたもの。
// 文字サイズの設定(14px を基準)に比例して、全体を拡大縮小する。
const u = (n) => `${(n * currentFontSize() / 14).toFixed(2)}cqmin`;

// 名前はカプセルの下。教室と時間は下に寄せる。地球は右に置く。
export default function NextClassGadget() {
  const theme = THEMES[NEXT_CLASS.theme];
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
      width: '100%', height: '100%', borderRadius: 0,
      background: shaded(theme.gradient),
      color: theme.textColor,
      containerType: 'size', // この枠の幅と高さを、cqmin の基準にする
    }}>
      <div style={{
        position: 'absolute', inset: 0, boxSizing: 'border-box',
        padding: `${u(32)} ${u(12)} ${u(9.5)}`,
        display: 'flex',
      }}>
        <div style={{
          position: 'relative', zIndex: 1, minWidth: 0, maxWidth: '62%', height: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        }}>
          <div style={{
            fontSize: u(22), fontWeight: 800, fontFamily: 'Inter', lineHeight: 1.15,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
          }}>
            {NEXT_CLASS.name}
          </div>
          <div style={{ marginTop: 'auto', fontSize: u(10.5), fontWeight: 700, fontFamily: 'Inter', lineHeight: 1.35, whiteSpace: 'nowrap' }}>
            <div>{NEXT_CLASS.room}</div>
            <div>{NEXT_CLASS.time}</div>
          </div>
        </div>
      </div>
      <img
        src={globeImg}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: 'absolute', right: u(5), top: '50%', transform: 'translateY(-50%)',
          height: u(76), width: 'auto', pointerEvents: 'none', userSelect: 'none',
        }}
      />
    </div>
  );
}
