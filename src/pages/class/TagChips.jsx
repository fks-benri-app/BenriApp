// 「すべて・未読・既読…」の絞り込みボタンの行。
import React from 'react';
import tagFilters from '../../data/tagFilters.json';

export default function TagChips({ activeFilter, setActiveFilter }) {
  return (
    <div className="no-scrollbar" style={{ padding: '0 1em', display: 'flex', gap: '0.429em', overflowX: 'auto' }}>
      {tagFilters.map((filter) => {
        const isActive = activeFilter === filter.id;
        return (
          <div
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            style={{
              padding: '0.5em 0.929em',
              borderRadius: '0.571em',
              flexShrink: 0,
              cursor: 'pointer',
              background: isActive ? 'var(--ink)' : 'var(--surface-3)', // 選んでいるものだけ黒(ダークは白)。色は使わない
              color: isActive ? 'var(--on-ink)' : 'var(--text-body)',
              fontSize: '0.929em',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'manipulation'
            }}
          >
            {filter.label}
          </div>
        );
      })}
    </div>
  );
}
