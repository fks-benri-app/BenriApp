import React from 'react';
import { currentFontSize } from '../lib/fontSize';

// ★ assets 内の通常アイコン(Class.jsx と同じ)
import homeIcon from '../assets/images/icons/home.svg';
import calendarIcon from '../assets/images/icons/calendar.svg';
import classIcon from '../assets/images/icons/message-square.svg';
import settingsIcon from '../assets/images/icons/settings.svg';
// ★ 発光（アクティブ）バージョンアイコン
import homeActiveIcon from '../assets/images/icons/home-active.svg';
import calendarActiveIcon from '../assets/images/icons/calendar-active.svg';
import classActiveIcon from '../assets/images/icons/message-square-active.svg';
import settingsActiveIcon from '../assets/images/icons/settings-active.svg';
// ★ ヘッダー用アイコン
import searchIcon from '../assets/images/icons/search.svg';
import bellIcon from '../assets/images/icons/bell.svg';
import readAllIcon from '../assets/images/icons/read-all.svg';

// このファイルは、Class.jsx の見た目の部分(ヘッダー・フィルター・カード・ボトムナビ)を、
// スタイルそのままで写したもの。通知や検索・既読などの「機能」は付けていない(表示だけ)。
// Class.jsx の見た目を変えたときは、ここも合わせて直す。

const TABS = [
  { id: 'home', label: 'ホーム', icon: homeIcon, activeIcon: homeActiveIcon },
  { id: 'calendar', label: 'カレンダー', icon: calendarIcon, activeIcon: calendarActiveIcon },
  { id: 'class', label: 'お知らせ', icon: classIcon, activeIcon: classActiveIcon },
  { id: 'settings', label: '設定', icon: settingsIcon, activeIcon: settingsActiveIcon },
];

const FILTERS = [
  { id: 'all', label: 'すべて' },
  { id: 'unread', label: '未読' },
  { id: 'read', label: '既読' },
  { id: 'test', label: 'テスト関連' },
  { id: 'festival', label: 'とんぼ祭関連' },
];

const NO_SCROLLBAR_CSS = '.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}';



// ===== プルダウンの見た目(Class.jsx の FilterSelect と同じ。選べない) =====
const chevron = (color) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${color}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

function FilterSelectView({ allLabel }) {
  return (
    <select
      aria-hidden="true"
      tabIndex={-1}
      value=""
      onChange={() => {}}
      style={{
        flex: '0 1 auto',
        minWidth: 0,
        maxWidth: '50%',
        height: '32px',
        padding: '0 28px 0 12px',
        border: '1px solid var(--line)',
        borderRadius: '10px',
        backgroundColor: 'var(--surface)',
        backgroundImage: chevron('%236B7280'),
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 9px center',
        backgroundSize: '13px',
        color: 'var(--text-muted)',
        fontSize: 'inherit',
        fontWeight: 400,
        fontFamily: 'inherit',
        textOverflow: 'ellipsis',
        boxSizing: 'border-box',
        WebkitAppearance: 'none',
        appearance: 'none',
        outline: 'none',
        touchAction: 'manipulation',
      }}
    >
      <option value="">{allLabel}</option>
    </select>
  );
}

// ===== ボトムナビゲーション部分(Class.jsx と同じ。ログイン画面でも使う) =====
export function BottomNav({ activeTab, onSelect }) {
  return (
    <nav style={{
      flexShrink: 0,
      padding: '0 1.143em env(safe-area-inset-bottom)',
      height: 'calc(4.571em + env(safe-area-inset-bottom))',
      background: 'var(--surface)',
      borderTop: '1px var(--line) solid',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
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
              touchAction: 'manipulation'
            }}
          >
            {/* アニメーションなし: 押した瞬間に切り替わる */}
            <img
              draggable={false}
              style={{
                width: '1.5em',
                height: '1.5em',
                opacity: isActive ? 1 : 0.45
              }}
              src={isActive ? tab.activeIcon : tab.icon}
              alt={tab.id}
            />
            <div style={{
              color: isActive ? 'var(--text-strong)' : 'var(--text-muted)',
              fontSize: '0.786em',
              fontWeight: '600'
            }}>
              {tab.label}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

// ===== ヘッダー(タイトルの行だけ。Class.jsx と同じ寸法) =====
export function TitleHeader({ title }) {
  return (
    <header style={{
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.857em',
      paddingTop: 'calc(2em + env(safe-area-inset-top))',
      paddingBottom: '1.143em',
      background: 'var(--surface)',
      borderBottom: '1px var(--line) solid',
      width: '100%'
    }}>
      <div style={{
        padding: '0 1.714em',
        height: '34px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.857em'
      }}>
        <div style={{
          color: 'var(--text-strong)',
          fontSize: '1.871em',
          fontFamily: 'Inter',
          fontWeight: '800',
          userSelect: 'none'
        }}>
          {title}
        </div>
      </div>
    </header>
  );
}

// ===== お知らせ画面(Class.jsx)の見た目。ダイアログの背景に使う(カードは出さず「読み込み中…」) =====
export default function ClassBackdrop() {
  const baseFontSize = currentFontSize(); // Class.jsx と同じ基準の文字サイズ(設定画面の値)
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        fontSize: `${baseFontSize}px`,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pointerEvents: 'none',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none'
      }}
    >
      <style>{NO_SCROLLBAR_CSS}</style>

      {/* ===== ヘッダー部分 ===== */}
      <header style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.857em',
        paddingTop: 'calc(2em + env(safe-area-inset-top))',
        paddingBottom: '1.143em',
        background: 'var(--surface)',
        width: '100%'
      }}>
        <div style={{
          padding: '0 1.714em',
          height: '34px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.857em'
        }}>
          <div style={{
            color: 'var(--text-strong)',
            fontSize: '1.871em',
            fontFamily: 'Inter',
            fontWeight: '800',
            userSelect: 'none'
          }}>
            お知らせ
          </div>

          {/* 右上アイコン */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9em', flexShrink: 0 }}>
            <img className="icon-ink" src={readAllIcon} alt="" aria-hidden="true" draggable={false} style={{ width: '1.571em', height: '1.571em', userSelect: 'none', WebkitUserSelect: 'none' }} />
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5em',
                height: '1.571em',
                padding: 0,
                color: 'var(--text-body)'
              }}
            >
              <img className="icon-ink" src={bellIcon} alt="" aria-hidden="true" draggable={false} style={{ width: '100%', height: '100%' }} />
            </div>
            <img
              draggable={false}
              style={{ width: '1.571em', height: '1.571em', userSelect: 'none', WebkitUserSelect: 'none' }}
              className="icon-ink"
              src={searchIcon}
              alt=""
            />
          </div>
        </div>

        {/* フィルターボタン */}
        <div className="no-scrollbar" style={{ padding: '0.571em 1.714em', display: 'flex', gap: '0.571em', overflowX: 'auto' }}>
          {FILTERS.map((filter) => {
            const isActive = filter.id === 'all';
            return (
              <div
                key={filter.id}
                style={{
                  padding: '0.571em 1.143em',
                  borderRadius: '0.857em',
                  flexShrink: 0,
                  backgroundImage: isActive ? 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)' : 'none',
                  backgroundColor: isActive ? 'transparent' : 'var(--surface)',
                  outline: isActive ? 'none' : '1px var(--line) solid',
                  outlineOffset: '-1px',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  fontSize: '1em',
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

        {/* プルダウン: 授業・形式 */}
        <div style={{ padding: '0 1.714em', display: 'flex', gap: '0.571em', marginTop: '-0.476em' }}>
          <FilterSelectView allLabel="すべての授業" />
          <FilterSelectView allLabel="すべての形式" />
        </div>
      </header>

      {/* ===== メインコンテンツ部分 ===== */}
      <main style={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        padding: '0.857em 1.714em',
        width: '100%',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '0.857em',
        alignContent: 'start'
      }}>
        <div style={{ padding: '3em 0', textAlign: 'center', color: 'var(--text-faint)', gridColumn: '1 / -1', userSelect: 'none' }}>
          読み込み中…
        </div>
      </main>

      {/* ===== ボトムナビゲーション部分 ===== */}
      <BottomNav activeTab="class" />
    </div>
  );
}
