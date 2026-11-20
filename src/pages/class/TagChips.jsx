// 「すべて・未読・既読…」の絞り込みボタンの行。
import React from 'react';
import tagFilters from '../../data/tagFilters.json';
import { shaded } from '../../lib/ui/courseTheme';

export default function TagChips({ activeFilter, setActiveFilter }) {
  return (
    <div className="no-scrollbar" style={{ padding: '0 1.143em', display: 'flex', gap: '0.571em', overflowX: 'auto' }}>
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
              backgroundImage: isActive ? shaded('linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)') : 'none',
              backgroundColor: isActive ? 'transparent' : 'var(--surface)',
              outline: isActive ? 'none' : '1px var(--line) solid',
              outlineOffset: '-1px',
              color: isActive ? 'white' : 'var(--text-muted)',
              fontSize: '0.929em',
              fontWeight: isActive ? '700' : '400',
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
