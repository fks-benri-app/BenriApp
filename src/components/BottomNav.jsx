// 画面の下のタブバー(ホーム・お知らせ・設定)。
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

// 画面の下のタブバー。押したタブの扱いは、使う側(onSelect)で決める(省略すると、押しても何も起きない)。
export default function BottomNav({ active, onSelect }) {
  return (
    <nav
      style={{
        flexShrink: 0,
        padding: '0 0 env(safe-area-inset-bottom)',
        height: 'calc(3.857em + env(safe-area-inset-bottom))',
        background: 'var(--surface)',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        justifyContent: 'stretch',
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
            onClick={onSelect ? () => onSelect(tab.id) : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.143em',
              flex: 1, // 4等分。親指で押す場所なので、画面の幅いっぱいを押せるようにする
              height: '100%',
              cursor: 'pointer',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'manipulation',
            }}
          >
            <img
              draggable={false}
              style={{ width: '1.714em', height: '1.714em', opacity: isActive ? 1 : 0.55 }}
              className="icon-nav"
              src={isActive ? tab.activeIcon : tab.icon}
              alt={tab.id}
            />
            <div style={{ color: isActive ? 'var(--text-strong)' : 'var(--text-muted)', fontSize: '0.714em', fontWeight: isActive ? '700' : '500' }}>
              {tab.label}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
