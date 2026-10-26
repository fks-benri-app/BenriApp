import React from 'react';
import { THEMES } from '../lib/themes';

import homeIcon from '../assets/images/icons/home.svg';
import calendarIcon from '../assets/images/icons/calendar.svg';
import classIcon from '../assets/images/icons/message-square.svg';
import settingsIcon from '../assets/images/icons/settings.svg';
import classActiveIcon from '../assets/images/icons/message-square-active.svg';

// ダイアログの背後に見せる、お知らせ画面(Class.jsx)の見た目だけの再現。
// Class.jsx 本体を重ねると通知登録などの処理が裏で動いてしまうため、静的な見た目だけを置く。
const TABS = [
  { id: 'home', label: 'ホーム', icon: homeIcon },
  { id: 'calendar', label: 'カレンダー', icon: calendarIcon },
  { id: 'class', label: 'お知らせ', icon: classActiveIcon, active: true },
  { id: 'settings', label: '設定', icon: settingsIcon },
];

const CHIPS = ['すべて', '未読', 'テスト関連'];
const CARD_COLORS = ['#FF4D4D', '#E5E7EB', '#E5E7EB', '#E5E7EB'];

const bar = (w, h = '0.9em', bg = '#F3F4F6') => ({
  width: w,
  height: h,
  borderRadius: '0.4em',
  background: bg,
});

export default function ClassBackdrop() {
  const theme = THEMES.orangeRed;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <header style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.857em', paddingTop: 'calc(2em + env(safe-area-inset-top))', paddingBottom: '1.143em', width: '100%' }}>
        <div style={{ padding: '0 1.714em', height: '40px', display: 'flex', alignItems: 'center', color: '#111827', fontSize: '1.871em', fontFamily: 'Inter', fontWeight: 800 }}>
          お知らせ
        </div>
        <div style={{ padding: '0.571em 1.714em', display: 'flex', gap: '0.571em' }}>
          {CHIPS.map((label, i) => (
            <div
              key={label}
              style={{
                padding: '0.571em 1.143em',
                borderRadius: '0.857em',
                flexShrink: 0,
                backgroundImage: i === 0 ? theme.gradient : 'none',
                backgroundColor: i === 0 ? 'transparent' : 'white',
                outline: i === 0 ? 'none' : '1px #E5E7EB solid',
                outlineOffset: '-1px',
                color: i === 0 ? theme.textColor : '#6B7280',
                fontWeight: i === 0 ? 700 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </header>

      <main style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '0.857em 1.714em', display: 'flex', flexDirection: 'column', gap: '0.857em' }}>
        {CARD_COLORS.map((color, i) => (
          <div
            key={i}
            style={{
              padding: '1.143em',
              background: 'white',
              borderRadius: '1.714em',
              outline: `1.5px ${color} solid`,
              outlineOffset: '-1.5px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.857em',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={bar('9em', '1.4em', i === 0 ? theme.gradient : '#F3F4F6')} />
              <div style={bar('3.5em')} />
            </div>
            <div style={bar('85%', '1.1em', '#E5E7EB')} />
            <div style={bar('60%')} />
          </div>
        ))}
      </main>

      <nav style={{ flexShrink: 0, padding: '0 1.143em env(safe-area-inset-bottom)', height: 'calc(4.571em + env(safe-area-inset-bottom))', background: 'white', borderTop: '1px #E5E7EB solid', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
        {TABS.map((tab) => (
          <div key={tab.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.214em', justifyContent: 'center', width: '5.714em', padding: '0.4em 0' }}>
            <img draggable={false} style={{ width: '1.5em', height: '1.5em', opacity: tab.active ? 1 : 0.45 }} src={tab.icon} alt="" />
            <div style={{ color: tab.active ? '#111827' : '#6B7280', fontSize: '0.786em', fontWeight: 600 }}>{tab.label}</div>
          </div>
        ))}
      </nav>
    </div>
  );
}
