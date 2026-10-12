import React, { useState } from 'react';
import { useAnnouncements } from '../lib/announcements';
import { useIdentity } from '../auth/identity';
import CopyButton from '../components/CopyButton';

// ★ assets 内の通常アイコン
import homeIcon from '../assets/home.svg';
import calendarIcon from '../assets/calendar.svg';
import classIcon from '../assets/message-square.svg';
import settingsIcon from '../assets/settings.svg';

// ★ assets 内の発光（アクティブ）バージョンアイコン
import homeActiveIcon from '../assets/home-active.svg';
import calendarActiveIcon from '../assets/calendar-active.svg';
import classActiveIcon from '../assets/message-square-active.svg';
import settingsActiveIcon from '../assets/settings-active.svg';

// ★ ヘッダー用（検索アイコン）
import searchIcon from '../assets/search.svg';

// ★ ナビゲーションとフィルターの定数定義（コメントアウトを解除）
const TABS = [
  { id: 'home', label: 'ホーム', icon: homeIcon, activeIcon: homeActiveIcon },
  { id: 'calendar', label: 'カレンダー', icon: calendarIcon, activeIcon: calendarActiveIcon },
  { id: 'class', label: 'クラス', icon: classIcon, activeIcon: classActiveIcon },
  { id: 'settings', label: '設定', icon: settingsIcon, activeIcon: settingsActiveIcon },
];

const FILTERS = [
  { id: 'all', label: 'すべて' },
  { id: 'unread', label: '未読' },
  { id: 'test', label: 'テスト関連' },
  { id: 'festival', label: 'トンボ祭関連' },
];

export default function Class() {
  const { identity, signOut } = useIdentity();
  const { status, items, markRead } = useAnnouncements(identity?.id);
  
  const [activeTab, setActiveTab] = useState('class');
  const [activeFilter, setActiveFilter] = useState('all');

  // フォントサイズ基準値（プログラム制御対応）
  const [baseFontSize, setBaseFontSize] = useState(14);

  const filteredAnnouncements = items.filter(ann => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return ann.isUnread;
    return ann.tag === activeFilter;
  });
  // URL全体や、取得したIDをコンソールに出力してみる
  console.log("現在のURL:", window.location.href);
  console.log("読み取ったID:", identity);

  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      margin: 0,
      padding: 0,
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      overflow: 'hidden',
      fontSize: `${baseFontSize}px`,
      WebkitTapHighlightColor: 'transparent',
      WebkitTouchCallout: 'none'
    }}>
      
      {/* ===== ヘッダー部分 ===== */}
      <header style={{ 
        flexShrink: 0, 
        display: 'flex',
        flexDirection: 'column',
        gap: '0.857em',
        paddingTop: 'calc(0.857em + env(safe-area-inset-top))',
        width: '100%'
      }}>
        <div style={{ 
          padding: '0 1.714em', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ 
            color: '#111827', 
            fontSize: '1.571em', 
            fontFamily: 'Inter', 
            fontWeight: '800',
            userSelect: 'none'
          }}>
            クラスルームからのお知らせ
          </div>
          
          {/* 右上アイコン */}
          <img 
            draggable={false}
            style={{ 
              width: '1.571em',
              height: '1.571em', 
              cursor: 'pointer', 
              userSelect: 'none',
              WebkitUserSelect: 'none' 
            }} 
            src={searchIcon} 
            alt="search" 
          />
        </div>

        {/* フィルターボタン */}
        <div style={{ padding: '0.571em 1.714em', display: 'flex', gap: '0.571em', overflowX: 'auto' }}>
          {FILTERS.map(filter => {
            const isActive = activeFilter === filter.id;
            return (
              <div
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                style={{
                  padding: '0.571em 1.143em',
                  borderRadius: '0.857em',
                flexShrink: 0,
                  cursor: 'pointer',
                  backgroundImage: isActive ? 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)' : 'none',
                  backgroundColor: isActive ? 'transparent' : 'white',
                  outline: isActive ? 'none' : '1px #E5E7EB solid',
                outlineOffset: '-1px',
                  color: isActive ? 'white' : '#6B7280',
                  fontSize: '1em',
                  fontWeight: isActive ? '700' : '400',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  userSelect: 'none',
                  WebkitUserSelect: 'none'
                }}
              >
                {filter.label}
              </div>
            );
          })}
        </div>
      </header>

      {/* ===== メインコンテンツ部分 ===== */}
      <main style={{ 
        flex: 1,
        overflowY: 'auto',
        padding: '0.857em 1.714em',
        width: '100%',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '0.857em',
        alignContent: 'start'
      }}>
        {filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map(ann => (
            <article 
              key={ann.id}
              onClick={() => markRead(ann.id)} 
              style={{ 
                position: 'relative', 
                padding: ann.isUnread ? 'calc(1.143em - 1.5px)' : '1.143em',
                border: ann.isUnread ? '1.5px solid transparent' : 'none',
                background: ann.isUnread ? 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%) border-box' : 'white',
                borderRadius: '1.714em',
                outline: ann.isUnread ? 'none' : '1px #E5E7EB solid',
                outlineOffset: '-1px',
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                gap: '0.857em',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.857em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.571em' }}>
                    <div style={{ padding: '0.286em 0.571em', background: '#F3F4F6', borderRadius: '0.429em' }}>
                      <div style={{ color: '#111827', fontSize: '0.786em', fontWeight: '700', userSelect: 'none' }}>
                        {ann.subject}
                      </div>
                    </div>
                    <div style={{ color: '#6B7280', fontSize: '0.857em', fontWeight: '600', userSelect: 'none' }}>
                      {ann.teacher}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.429em' }}>
                    <div style={{ color: '#6B7280', fontSize: '0.857em', fontWeight: '400', userSelect: 'none' }}>
                      {ann.time}
                    </div>
                    {ann.isUnread && (
                      <div style={{ width: '0.571em', height: '0.571em', background: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', borderRadius: '50%' }} />
                    )}
                  </div>
                </div>
                <div style={{ color: '#111827', fontSize: '1em', lineHeight: 1.4286, whiteSpace: 'pre-wrap'}}>
                  {ann.content}
                </div>
              </div>

              {/* ★ 位置をカードの右下パディングに美しく揃えて配置 */}
              <div style={{ 
                position: 'absolute', 
                bottom: '1.143em',
                right: '1.143em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CopyButton 
                  textToCopy={`【${ann.subject}】${ann.teacher}\n日時: ${ann.time}\n${ann.content}`} 
                />
              </div>
            </article>
          ))
        ) : (
          <div style={{ padding: '3em 0', textAlign: 'center', color: '#9CA3AF', gridColumn: '1 / -1', userSelect: 'none' }}>
            {status === 'loading' ? '読み込み中…' : status === 'error' ? '読み込みに失敗しました' : '該当するお知らせはありません'}
          </div>
        )}
      </main>

      {/* ===== ボトムナビゲーション部分 ===== */}
      <nav style={{ 
        flexShrink: 0, 
        padding: '0 1.143em env(safe-area-inset-bottom)',
        height: 'calc(6em + env(safe-area-inset-bottom))', 
        background: 'white', 
        borderTop: '1px #E5E7EB solid', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <div 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '0.286em',
                cursor: 'pointer',
                width: '5.714em',
                justifyContent: 'center',
                padding: '0.4em 0',
                borderRadius: '0.5em',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              <img 
            draggable={false}
                style={{ 
                  width: '1.571em',
                  height: '1.571em', 
                  opacity: isActive ? 1 : 0.45,
                  transition: 'opacity 0.2s ease-in-out'
                }} 
                src={isActive ? tab.activeIcon : tab.icon} 
                alt={tab.id} 
              />
              <div style={{ 
                color: isActive ? '#111827' : '#6B7280',
                fontSize: '0.786em',
                fontWeight: '600',
                transition: 'color 0.2s ease-in-out'
              }}>
                {tab.label}
              </div>
            </div>
          );
        })}
      </nav>

    </div>
  );
}