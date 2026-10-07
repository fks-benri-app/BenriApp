import React, { useState } from 'react';
import { useIdentity } from '../auth/identity';

// --- モックデータ ---
const ANNOUNCEMENTS = [
  {
    id: 1,
    subject: '数学A',
    teacher: '佐藤先生',
    time: '今日 08:30',
    content: '今日の宿題提出について、授業開始前に提出用ロッカーに入れておいてください。忘れた場合は減点対象となります。',
    isUnread: true,
  },
  {
    id: 2,
    subject: '英語II',
    teacher: '鈴木先生',
    time: '昨日 16:15',
    content: '暗唱課題の提出締め切りを、明日の17:00まで延長します。まだ録音データを送信していない人は必ず提出してください。',
    isUnread: false,
  },
  {
    id: 3,
    subject: '物理',
    teacher: '田中先生',
    time: '10月22日',
    content: '実験レポートの書き方に関する手引き資料をアップロードしました。各自ダウンロードして目を通しておくようにしてください。',
    isUnread: true,
  }
];

const TABS = [
  { id: 'home', label: 'ホーム', iconUrl: 'https://placehold.co/22x22' },
  { id: 'calendar', label: 'カレンダー', iconUrl: 'https://placehold.co/22x22' },
  { id: 'class', label: 'クラス', iconUrl: 'https://placehold.co/22x22' },
  { id: 'settings', label: '設定', iconUrl: 'https://placehold.co/22x22' },
];

const FILTERS = [
  { id: 'all', label: 'すべて' },
  { id: 'unread', label: '未読' },
  { id: 'test', label: 'テスト関連' },
];

export default function HomePage() {
  const { identity, signOut } = useIdentity();
  
  const [activeTab, setActiveTab] = useState('home');
  const [activeFilter, setActiveFilter] = useState('all');

  return (
    // 画面いっぱいに表示（余白ゼロ）
    <div style={{
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      
      {/* ===== ヘッダー部分（固定） ===== */}
      <header style={{ 
        flexShrink: 0, 
        paddingBottom: 12, 
        borderBottom: '1px #F3F4F6 solid',
        width: '100%'
      }}>
        <div style={{ padding: '20px 24px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#111827', fontSize: 24, fontFamily: 'Inter', fontWeight: '800' }}>
            クラスルームからのお知らせ
          </div>
          <img style={{ width: 24, height: 24, cursor: 'pointer' }} src="https://placehold.co/22x22" alt="bell" />
        </div>

        {/* フィルターボタン（カプセル形状） */}
        <div style={{ padding: '0 24px', display: 'flex', gap: 10, overflowX: 'auto' }}>
          {FILTERS.map(filter => {
            const isActive = activeFilter === filter.id;
            return (
              <div
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 9999, // 完全に丸みのあるカプセル形状に指定
                  cursor: 'pointer',
                  background: isActive ? 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)' : 'white',
                  // 未選択時も完全に1pxの実線で囲む設定
                  border: isActive ? '1.5px solid transparent' : '1.5px solid #D1D5DB',
                  color: isActive ? 'white' : '#4B5563',
                  fontSize: 14,
                  fontWeight: isActive ? '700' : '500',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
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
        padding: '20px 24px',
        width: '100%',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 16,
        alignContent: 'start'
      }}>
        {ANNOUNCEMENTS.map(ann => (
          <article 
            key={ann.id} 
            style={{ 
              padding: 20, 
              background: 'white', 
              borderRadius: 20, 
              outline: ann.isUnread ? '1.50px #FF4D4D solid' : '1px #E5E7EB solid', 
              outlineOffset: ann.isUnread ? '-1.50px' : '-1px', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              gap: 14,
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ padding: '4px 10px', background: '#F3F4F6', borderRadius: 6 }}>
                    <div style={{ color: '#111827', fontSize: 12, fontWeight: '700' }}>{ann.subject}</div>
                  </div>
                  <div style={{ color: '#6B7280', fontSize: 13, fontWeight: '600' }}>{ann.teacher}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '400' }}>{ann.time}</div>
                  {ann.isUnread && (
                    <div style={{ width: 8, height: 8, background: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', borderRadius: '50%' }} />
                  )}
                </div>
              </div>
              <div style={{ color: '#1F2937', fontSize: 14, lineHeight: '22px' }}>
                {ann.content}
              </div>
            </div>
          </article>
        ))}
      </main>

      {/* ===== ボトムナビゲーション部分 ===== */}
      <nav style={{ 
        flexShrink: 0, 
        height: 72, 
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
                gap: 4,
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: 8
              }}
            >
              <img 
                style={{ 
                  width: 22, 
                  height: 22, 
                  opacity: isActive ? 1 : 0.4,
                  transition: 'opacity 0.2s'
                }} 
                src={tab.iconUrl} 
                alt={tab.id} 
              />
              <div style={{ 
                color: isActive ? '#111827' : '#6B7280', 
                fontSize: 12, 
                fontWeight: isActive ? '700' : '500' 
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