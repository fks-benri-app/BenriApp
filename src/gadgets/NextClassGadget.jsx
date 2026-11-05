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
// 数字は、参考画像の構図から決めた値。どの枠の大きさでも、同じ配置・同じ比率になる。
const NAME_STYLE = {
  position: 'absolute', left: '13cqmin', top: '18cqmin',
  fontSize: '29cqmin', fontWeight: 800, fontFamily: 'Inter', lineHeight: 1.15,
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%',
};
const DETAIL_STYLE = {
  position: 'absolute', left: '13cqmin', bottom: '16cqmin',
  fontSize: '12cqmin', fontWeight: 700, fontFamily: 'Inter', lineHeight: 1.3, whiteSpace: 'nowrap',
};

export default function NextClassGadget() {
  const theme = THEMES[NEXT_CLASS.theme];
  return (
    <div style={{
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
      <img
        src={globeImg}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: 'absolute', right: '-6cqmin', bottom: '-22cqmin',
          height: '116cqmin', width: 'auto', pointerEvents: 'none', userSelect: 'none',
        }}
      />
    </div>
  );
}
