// 画面の下のタブバー(ホーム・お知らせ・設定)。
import React from 'react';

import Icon from './Icon';

export const TABS = [
  { id: 'home', label: 'ホーム', icon: 'home' },
  { id: 'calendar', label: 'カレンダー', icon: 'calendar' },
  { id: 'class', label: 'お知らせ', icon: 'message' },
  { id: 'settings', label: '設定', icon: 'settings' },
];

// 画面の下のタブバー。押したタブの扱いは、使う側(onSelect)で決める(省略すると、押しても何も起きない)。
export default function BottomNav({ active, onSelect }) {
  return (
    <nav
      style={{
        flexShrink: 0,
        padding: '0 1.143em env(safe-area-inset-bottom)',
        height: 'calc(4.571em + env(safe-area-inset-bottom))',
        background: 'var(--surface)',
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
            onClick={onSelect ? () => onSelect(tab.id) : undefined}
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
            <Icon
              name={tab.icon}
              size="1.5em"
              color={isActive ? 'var(--text-strong)' : 'var(--text-muted)'}
              style={{ opacity: isActive ? 1 : 0.45 }}
            />
            <div style={{ color: isActive ? 'var(--text-strong)' : 'var(--text-muted)', fontSize: '0.786em', fontWeight: '600' }}>
              {tab.label}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
