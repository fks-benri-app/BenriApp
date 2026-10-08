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

// --- モックデータ ---
// const ANNOUNCEMENTS = [
//   {
//     id: 1,
//     subject: '数学A',
//     teacher: '召田先生',
//     time: '今日 08:30',
//     content: 'あなたたち121教室で追試します！理由はお分かりですね！あなたたちが部活を理由に勉強をサボっていたからです！追試にぶち込まれる楽しみにしてください！',
//     isUnread: true,
//     tag: 'test',
//   },
//   {
//     id: 2,
//     subject: '英語コミュニケーション',
//     teacher: '伴野先生',
//     time: '昨日 16:15',
//     content: '課題の提出締め切りは、昨日の17:00までにしました。未提出の人は追試になります。',
//     isUnread: false,
//     tag: 'general',
//   },
//   {
//     id: 3,
//     subject: '地理',
//     teacher: '佐々木先生',
//     time: '10月22日',
//     content: '明日のテスト、やっぱり全範囲にするね！いけるよね！',
//     isUnread: true,
//     tag: 'test',
//   },
//   {
//     id: 4,
//     subject: '2学年探求',
//     teacher: '櫻井先生',
//     time: '10月20日',
//     content: 'はい！はい！はい！はい！はい！はい！',
//     isUnread: true,
//     tag: 'festival',
//   }
// ];

// const TABS = [
//   { id: 'home', label: 'ホーム', icon: homeIcon, activeIcon: homeActiveIcon },
//   { id: 'calendar', label: 'カレンダー', icon: calendarIcon, activeIcon: calendarActiveIcon },
//   { id: 'class', label: 'クラス', icon: classIcon, activeIcon: classActiveIcon },
//   { id: 'settings', label: '設定', icon: settingsIcon, activeIcon: settingsActiveIcon },
// ];

// const FILTERS = [
//   { id: 'all', label: 'すべて' },
//   { id: 'unread', label: '未読' },
//   { id: 'test', label: 'テスト関連' },
//   { id: 'festival', label: 'トンボ祭関連' },
// ];

export default function Class() {
  const { identity, signOut } = useIdentity();
  const { status, items, markRead } = useAnnouncements(identity.id);
  
  const [activeTab, setActiveTab] = useState('class');
  const [activeFilter, setActiveFilter] = useState('all');

  // フォントサイズ基準値（プログラム制御対応）
  const [baseFontSize, setBaseFontSize] = useState(14);

  const filteredAnnouncements = items.filter(ann => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return ann.isUnread;
    return ann.tag === activeFilter;
  });

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      overflow: 'hidden',
      fontSize: `${baseFontSize}px`
    }}>
      
      {/* ===== ヘッダー部分 ===== */}
      <header style={{ 
        flexShrink: 0, 
        paddingBottom: '0.8em', 
        borderBottom: '1px #F3F4F6 solid',
        width: '100%'
      }}>
        <div style={{ 
          padding: '1.2em 1.5em 0.8em', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ 
            color: '#111827', 
            fontSize: '1.6em', 
            fontFamily: 'Inter', 
            fontWeight: '800',
            userSelect: 'none'
          }}>
            クラスルームからのお知らせ
          </div>
          
          {/* 右上アイコン */}
          <img 
            style={{ 
              width: '1.5em', 
              height: '1.5em', 
              cursor: 'pointer', 
              userSelect: 'none',
              WebkitUserSelect: 'none' 
            }} 
            src={searchIcon} 
            alt="search" 
          />
        </div>

        {/* フィルターボタン */}
        <div style={{ padding: '0 1.5em', display: 'flex', gap: '0.7em', overflowX: 'auto' }}>
          {FILTERS.map(filter => {
            const isActive = activeFilter === filter.id;
            return (
              <div
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                style={{
                  padding: '0.5em 1.2em',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  backgroundImage: isActive ? 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)' : 'none',
                  backgroundColor: isActive ? 'transparent' : 'white',
                  border: isActive ? '1.5px solid transparent' : '1.5px solid #D1D5DB',
                  color: isActive ? 'white' : '#4B5563',
                  fontSize: '1em',
                  fontWeight: isActive ? '700' : '500',
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
        padding: '1.2em 1.5em',
        width: '100%',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.2em',
        alignContent: 'start'
      }}>
        {filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map(ann => (
            <article 
              key={ann.id}
              onClick={() => markRead(ann.id)} 
              style={{ 
                position: 'relative', 
                // ★ 下部余白を他とバランスが良い 1.2em に戻し余計な空白を解消
                padding: '1.2em', 
                background: 'white', 
                borderRadius: '1.2em', 
                outline: ann.isUnread ? '1.5px #FF4D4D solid' : '1px #E5E7EB solid', 
                outlineOffset: ann.isUnread ? '-1.5px' : '-1px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                gap: '1em',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em' }}>
                    <div style={{ padding: '0.3em 0.7em', background: '#F3F4F6', borderRadius: '0.4em' }}>
                      <div style={{ color: '#111827', fontSize: '0.85em', fontWeight: '700', userSelect: 'none' }}>
                        {ann.subject}
                      </div>
                    </div>
                    <div style={{ color: '#6B7280', fontSize: '0.9em', fontWeight: '600', userSelect: 'none' }}>
                      {ann.teacher}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4em' }}>
                    <div style={{ color: '#9CA3AF', fontSize: '0.85em', fontWeight: '400', userSelect: 'none' }}>
                      {ann.time}
                    </div>
                    {ann.isUnread && (
                      <div style={{ width: '0.6em', height: '0.6em', background: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', borderRadius: '50%' }} />
                    )}
                  </div>
                </div>
                <div style={{ color: '#1F2937', fontSize: '1em', lineHeight: '1.5em' , whiteSpace: 'pre-wrap'}}>
                  {ann.content}
                </div>
              </div>

              {/* ★ 位置をカードの右下パディングに美しく揃えて配置 */}
              <div style={{ 
                position: 'absolute', 
                bottom: '1em', 
                right: '1.2em',
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
        padding: '0.8em 1.5em', 
        background: 'white', 
        borderTop: '1px #E5E7EB solid', 
        display: 'flex', 
        justifyContent: 'space-around', 
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
                gap: '0.3em',
                cursor: 'pointer',
                padding: '0.4em 1em',
                borderRadius: '0.5em',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              <img 
                style={{ 
                  width: '1.6em', 
                  height: '1.6em', 
                  opacity: isActive ? 1 : 0.45,
                  transition: 'opacity 0.2s ease-in-out'
                }} 
                src={isActive ? tab.activeIcon : tab.icon} 
                alt={tab.id} 
              />
              <div style={{ 
                color: isActive ? '#111827' : '#6B7280',
                fontSize: '0.85em', 
                fontWeight: '700',
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