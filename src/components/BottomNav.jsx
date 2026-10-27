import React from 'react';

import homeIcon from '../assets/images/icons/home.svg';
import calendarIcon from '../assets/images/icons/calendar.svg';
import classIcon from '../assets/images/icons/message-square.svg';
import settingsIcon from '../assets/images/icons/settings.svg';
import homeActiveIcon from '../assets/images/icons/home-active.svg';
import calendarActiveIcon from '../assets/images/icons/calendar-active.svg';
import classActiveIcon from '../assets/images/icons/message-square-active.svg';
import settingsActiveIcon from '../assets/images/icons/settings-active.svg';

export const TABS = [
  { id: 'home', label: 'ホーム', icon: homeIcon, activeIcon: homeActiveIcon },
  { id: 'calendar', label: 'カレンダー', icon: calendarIcon, activeIcon: calendarActiveIcon },
  { id: 'class', label: 'お知らせ', icon: classIcon, activeIcon: classActiveIcon },
  { id: 'settings', label: '設定', icon: settingsIcon, activeIcon: settingsActiveIcon },
];

// Class.jsx の下のバーと同じ見た目。押したタブの扱いは、使う側(onSelect)で決める。
export default function BottomNav({ active, onSelect }) {
  return (
    <nav
      style={{
        flexShrink: 0,
        padding: '0 1.143em env(safe-area-inset-bottom)',
        height: 'calc(4.571em + env(safe-area-inset-bottom))',
        background: 'white',
        borderTop: '1px #E5E7EB solid',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.214em',
              width: '5.714em',
              cursor: 'pointer',
              padding: '0.4em 0',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'manipulation',
            }}
          >
            <img
              draggable={false}
              style={{ width: '1.5em', height: '1.5em', opacity: isActive ? 1 : 0.45 }}
              src={isActive ? tab.activeIcon : tab.icon}
              alt={tab.id}
            />
            <div style={{ color: isActive ? '#111827' : '#6B7280', fontSize: '0.786em', fontWeight: '600' }}>
              {tab.label}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
