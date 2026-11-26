// カレンダー画面(試作): 月〜金 × 1〜7限の授業表の枠。画面いっぱいに並べ、授業名はまだ入れない。
import React from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { TitleHeader } from '../components/ClassBackdrop';
import { t } from '../lib/ui/text';

const WEEKDAYS = ['月', '火', '水', '木', '金'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];
const BASE_FONT_SIZE = 14;

const rootStyle = {
  position: 'fixed',
  inset: 0,
  margin: 0,
  padding: 0,
  background: 'var(--surface)',
  boxSizing: 'border-box',
  overflow: 'hidden',
  fontSize: `${BASE_FONT_SIZE}px`,
  display: 'flex',
  flexDirection: 'column',
};

// 空の枠(あとで授業名を入れる)。右上に薄い「+」を置く
const cellStyle = {
  position: 'relative',
  borderRadius: '0.857em',
  background: 'var(--surface-2, var(--surface))',
  outline: '1px var(--line) solid',
  outlineOffset: '-1px',
  minWidth: 0,
};

const plusStyle = {
  position: 'absolute',
  right: '0.429em',
  top: '0.429em',
  width: '1.714em',
  height: '1.714em',
  borderRadius: '50%',
  color: 'var(--text-faint)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1em',
  lineHeight: 1,
};

const labelStyle = {
  color: 'var(--text-muted)',
  fontSize: '0.857em',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function Calendar() {
  const navigate = useNavigate();

  function onSelectTab(id) {
    if (id === 'home') navigate('/');
    else if (id === 'class') navigate('/class');
    else if (id === 'settings') navigate('/settings');
    // カレンダーは今いる画面
  }

  return (
    <div style={rootStyle}>
      <TitleHeader title={t('calendar.title')} />

      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          padding: '0.571em 0',
          paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
          boxSizing: 'border-box',
        }}
      >
        {/* 行: 見出し1行 + 1〜7限(高さは画面に合わせて均等に割る) */}
        <div
          style={{
            height: '100%',
            display: 'grid',
            gridTemplateColumns: '1.6em repeat(5, minmax(0, 1fr))',
            gridTemplateRows: 'auto repeat(7, minmax(0, 1fr))',
            gap: '0.429em',
          }}
        >
          <div />
          {WEEKDAYS.map((w) => (
            <div key={w} style={{ ...labelStyle, color: 'var(--text-strong)', fontSize: '1em' }}>{w}</div>
          ))}

          {PERIODS.map((p) => (
            <React.Fragment key={p}>
              <div style={labelStyle}>{p}</div>
              {WEEKDAYS.map((w) => (
                <div key={`${w}${p}`} style={cellStyle} aria-label={`${w}曜 ${p}限`}>
                  <span style={plusStyle} aria-hidden="true">+</span>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </main>

      <BottomNav active="calendar" onSelect={onSelectTab} />
    </div>
  );
}
