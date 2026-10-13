import React, { useMemo, useRef, useState } from 'react';
import { useAnnouncements } from '../lib/announcements';
import { useIdentity } from '../auth/identity';

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

// 全角/半角・大文字/小文字の違いを無視して検索できるようにそろえる
const normalize = (s) => String(s || '').normalize('NFKC').toLowerCase();

// Classroom の投稿ページを開くURL。
// 複数のGoogleアカウントでログイン中でも学校アカウントを選べるよう、アカウント選択を挟む
// (そのまま開きたい場合は `return link;` に変える)
function classroomUrl(link) {
  if (!link) return null;
  try {
    const u = new URL(link);
    if (u.hostname !== 'classroom.google.com') return null; // 想定外のURLは開かない
    return 'https://accounts.google.com/AccountChooser?continue=' + encodeURIComponent(link);
  } catch {
    return null;
  }
}

export default function Class() {
  const { identity } = useIdentity();
  const { status, items, markRead } = useAnnouncements(identity?.id);

  const [activeTab, setActiveTab] = useState('class');
  const [activeFilter, setActiveFilter] = useState('all');

  // 検索
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef(null);

  // フォントサイズ基準値（プログラム制御対応）
  const [baseFontSize] = useState(14);

  const filteredAnnouncements = useMemo(() => {
    const q = normalize(query.trim());
    return items.filter((ann) => {
      if (activeFilter === 'unread' && !ann.isUnread) return false;
      if (activeFilter !== 'all' && activeFilter !== 'unread' && ann.tag !== activeFilter) return false;
      if (!q) return true;
      return normalize(`${ann.subject} ${ann.teacher} ${ann.content}`).includes(q);
    });
  }, [items, activeFilter, query]);

  function openSearch() {
    setSearchOpen(true);
    // 表示されてからフォーカスする(スマホではキーボードが開く)
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery('');
  }

  // カードを押したら既読にして、Classroom の投稿ページを新しいタブで開く
  function openAnnouncement(ann) {
    markRead(ann.id);
    const url = classroomUrl(link);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  const emptyMessage =
    status === 'loading'
      ? '読み込み中…'
      : status === 'error'
        ? '読み込みに失敗しました'
        : query.trim()
          ? `「${query.trim()}」に一致するお知らせはありません`
          : '該当するお知らせはありません';

  return (
    <div style={{
      // 画面に固定する: ヘッダーとナビは常に表示され、<main> の中だけがスクロールする
      position: 'fixed',
      inset: 0,
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

      {/* ===== ヘッダー部分（常に表示） ===== */}
      <header style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.857em',
        paddingTop: 'calc(0.857em + env(safe-area-inset-top))',
        background: 'white',
        width: '100%'
      }}>
        <div style={{
          padding: '0 1.714em',
          minHeight: '2.4em',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.857em'
        }}>
          {searchOpen ? (
            <>
              <input
                ref={searchInputRef}
                type="text"
                inputMode="search"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') closeSearch(); }}
                placeholder="教科・先生・本文で検索"
                aria-label="お知らせを検索"
                enterKeyHint="search"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: '2.4em',
                  padding: '0 1em',
                  border: 'none',
                  outline: 'none',
                  borderRadius: '0.857em',
                  background: '#F3F4F6',
                  color: '#111827',
                  fontSize: '16px', // 16px未満だと iPhone でフォーカス時に画面が拡大される
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  WebkitAppearance: 'none'
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={closeSearch}
                onKeyDown={(e) => { if (e.key === 'Enter') closeSearch(); }}
                style={{
                  flexShrink: 0,
                  color: '#6B7280',
                  fontSize: '1em',
                  fontWeight: '600',
                  cursor: 'pointer',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'manipulation'
                }}
              >
                キャンセル
              </div>
            </>
          ) : (
            <>
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
                role="button"
                tabIndex={0}
                onClick={openSearch}
                onKeyDown={(e) => { if (e.key === 'Enter') openSearch(); }}
                style={{
                  width: '1.571em',
                  height: '1.571em',
                  cursor: 'pointer',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'manipulation'
                }}
                src={searchIcon}
                alt="検索"
              />
            </>
          )}
        </div>

        {/* フィルターボタン */}
        <div style={{ padding: '0.571em 1.714em', display: 'flex', gap: '0.571em', overflowX: 'auto' }}>
          {FILTERS.map((filter) => {
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
      </header>

      {/* ===== メインコンテンツ部分（ここだけスクロールする） ===== */}
      <main style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        padding: '0.857em 1.714em',
        width: '100%',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '0.857em',
        alignContent: 'start',
        borderTop: '1px #F3F4F6 solid'
      }}>
        {filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((ann) => {
            const hasLink = !!classroomUrl(ann.link);
            return (
              <article
                key={ann.id}
                role={hasLink ? 'link' : undefined}
                tabIndex={0}
                onClick={() => openAnnouncement(ann)}
                onKeyDown={(e) => { if (e.key === 'Enter') openAnnouncement(ann); }}
                style={{
                  position: 'relative',
                  padding: ann.isUnread ? 'calc(1.143em - 1.5px)' : '1.143em',
                  border: ann.isUnread ? '1.5px solid transparent' : 'none',
                  background: ann.isUnread
                    ? 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%) border-box'
                    : 'white',
                  borderRadius: '1.714em',
                  outline: ann.isUnread ? 'none' : '1px #E5E7EB solid',
                  outlineOffset: '-1px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.857em',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'manipulation'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.571em' }}>
                    <div style={{ padding: '0.286em 0.571em', background: '#F3F4F6', borderRadius: '0.429em' }}>
                      <div style={{ color: '#111827', fontSize: '0.786em', fontWeight: '700' }}>
                        {ann.subject}
                      </div>
                    </div>
                    <div style={{ color: '#6B7280', fontSize: '0.857em', fontWeight: '600' }}>
                      {ann.teacher}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.429em' }}>
                    <div style={{ color: '#6B7280', fontSize: '0.857em', fontWeight: '400' }}>
                      {ann.time}
                    </div>
                    {ann.isUnread && (
                      <div style={{ width: '0.571em', height: '0.571em', background: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', borderRadius: '50%' }} />
                    )}
                  </div>
                </div>
                <div style={{ color: '#111827', fontSize: '1em', lineHeight: 1.4286, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {ann.content}
                </div>
              </article>
            );
          })
        ) : (
          <div style={{ padding: '3em 0', textAlign: 'center', color: '#9CA3AF', gridColumn: '1 / -1', userSelect: 'none' }}>
            {emptyMessage}
          </div>
        )}
      </main>

      {/* ===== ボトムナビゲーション部分（常に表示） ===== */}
      <nav style={{
        flexShrink: 0,
        padding: '0 1.143em env(safe-area-inset-bottom)',
        height: 'calc(4.571em + env(safe-area-inset-bottom))',
        background: 'white',
        borderTop: '1px #E5E7EB solid',
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
              onClick={() => setActiveTab(tab.id)}
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
                color: isActive ? '#111827' : '#6B7280',
                fontSize: '0.786em',
                fontWeight: '600'
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
