import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdentity } from '../auth/identity';
import BottomNav from '../components/BottomNav';
import pkg from '../../package.json';

const NO_SCROLLBAR_CSS = '.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}';

// ===== 部品 =====
const Chevron = () => (
  <svg width="1.143em" height="1.143em" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d="M7.5 5l5 5-5 5" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// まだ機能がない項目に付ける目印(押しても何も起きないことを、見た目で分かるようにする)
const Soon = () => <span style={{ color: '#9CA3AF', fontSize: '0.929em', fontWeight: 400 }}>準備中</span>;

function Section({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.571em' }}>
      <div style={{ color: '#6B7280', fontSize: '0.929em', fontWeight: 600, padding: '0 0.286em' }}>{title}</div>
      <div
        style={{
          padding: '0.286em 0',
          background: 'white',
          borderRadius: '1.714em',
          outline: '1px #E5E7EB solid',
          outlineOffset: '-1px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  );
}

const Divider = () => <div style={{ height: '1px', background: '#E5E7EB', margin: '0 0' }} />;

function Row({ label, right, onClick, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        padding: '0.857em 1.143em',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.8em',
        cursor: onClick && !disabled ? 'pointer' : 'default',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div style={{ color: '#111827', fontSize: '1.071em', fontWeight: 600 }}>{label}</div>
      {right}
    </div>
  );
}

function OutlineButton({ children, color, bg, border, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        height: '3.429em',
        background: bg,
        border: `1px ${border} solid`,
        borderRadius: '1.286em',
        color,
        fontFamily: 'inherit',
        fontSize: '1.071em',
        fontWeight: 700,
        cursor: 'pointer',
        touchAction: 'manipulation',
      }}
    >
      {children}
    </button>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { identity } = useIdentity();
  const [note, setNote] = useState('');
  const [baseFontSize] = useState(14);

  // 下のバー: お知らせへは移動する。ホーム・カレンダーはまだ画面がないので、何もしない
  function onSelectTab(id) {
    if (id === 'class') navigate('/class');
  }

  return (
    <div
      style={{
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
        WebkitTouchCallout: 'none',
      }}
    >
      <style>{NO_SCROLLBAR_CSS}</style>

      {/* ===== ヘッダー(Class.jsx と同じ形式) ===== */}
      <header
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.857em',
          paddingTop: 'calc(2em + env(safe-area-inset-top))',
          paddingBottom: '1.143em',
          background: 'white',
          width: '100%',
        }}
      >
        <div
          style={{
            padding: '0 1.714em',
            height: '34px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.857em',
          }}
        >
          <div style={{ color: '#111827', fontSize: '1.871em', fontFamily: 'Inter', fontWeight: '800', userSelect: 'none' }}>
            設定
          </div>
        </div>
      </header>

      {/* ===== 本体 ===== */}
      <main
        className="no-scrollbar"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          padding: '0 1.714em 1.143em',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.143em' }}>
          {/* アカウント */}
          <div
            style={{
              padding: '0.857em 1.429em',
              background: 'white',
              borderRadius: '1.714em',
              outline: '1px #E5E7EB solid',
              outlineOffset: '-1px',
              display: 'flex',
              alignItems: 'center',
              gap: '1.143em',
            }}
          >
            <div
              style={{
                width: '4em',
                height: '4em',
                borderRadius: '50%',
                background: '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="1.8em" height="1.8em" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="4" stroke="#9CA3AF" strokeWidth="2" />
                <path d="M4 20c1-4 4-6 8-6s7 2 8 6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.286em' }}>
              <div style={{ color: '#111827', fontSize: '1.286em', fontFamily: 'Inter', fontWeight: 700 }}>
                ログイン中のアカウント
              </div>
              <div style={{ color: '#6B7280', fontSize: '0.929em' }}>生徒ID {identity ? identity.id : '-'}</div>
            </div>
          </div>

          <Section title="通知設定">
            <Row label="クラスルーム通知" onClick={() => navigate('/?relink=1')} right={<Chevron />} />
            <Divider />
            <Row label="授業前通知" disabled right={<Soon />} />
          </Section>

          <Section title="画面表示">
            <Row
              label="ダークモード"
              disabled
              right={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.7em' }}>
                  <Soon />
                  <span
                    style={{
                      width: '3.429em',
                      height: '2em',
                      padding: '0.143em',
                      background: '#E5E7EB',
                      borderRadius: '1em',
                      display: 'flex',
                      alignItems: 'center',
                      boxSizing: 'border-box',
                      opacity: 0.6,
                    }}
                  >
                    <span style={{ width: '1.714em', height: '1.714em', background: 'white', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }} />
                  </span>
                </span>
              }
            />
            <Divider />
            <Row
              label="文字サイズ"
              disabled
              right={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em', color: '#6B7280', fontSize: '1.071em' }}>
                  標準 <Soon />
                </span>
              }
            />
          </Section>

          <Section title="サポート">
            <Row label="フィードバックを送る" disabled right={<Soon />} />
            <Divider />
            <Row
              label="アプリのバージョン"
              right={<span style={{ color: '#6B7280', fontSize: '1.071em' }}>v{pkg.version}</span>}
            />
          </Section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.857em' }}>
            <OutlineButton color="#111827" bg="white" border="#E5E7EB" onClick={() => navigate('/?relink=1')}>
              再連携する
            </OutlineButton>
            <OutlineButton color="#DC2626" bg="#FFF5F5" border="#FECACA" onClick={() => setNote('アカウントの削除は準備中です。')}>
              アカウントを削除する
            </OutlineButton>
            {note && (
              <div role="status" style={{ color: '#6B7280', fontSize: '0.929em', textAlign: 'center' }}>
                {note}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ===== 下のバー(Class.jsx と同じ形式) ===== */}
      <BottomNav active="settings" onSelect={onSelectTab} />
    </div>
  );
}
