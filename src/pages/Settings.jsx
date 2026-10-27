import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdentity } from '../auth/identity';
import BottomNav from '../components/BottomNav';
import { currentFontSize, nextFontSize } from '../lib/fontSize';
import pkg from '../../package.json';

// フィードバックのフォームのURL。ここに入れると押せるようになる(空の間は灰色で押せない)
const FEEDBACK_FORM_URL = '';

const NO_SCROLLBAR_CSS = '.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}';
const GREY = '#9CA3AF';

// 生徒ID(6桁)から学年・組・番号を読み取る。例: 250710 → 2025年入学の7組10番 → 今年度は2年7組10番
// 年度は4月に切り替わる。学年が 1〜3 の範囲に入らないときは表示しない
function classOf(id) {
  if (!/^\d{6}$/.test(id)) return null;
  const entry = 2000 + Number(id.slice(0, 2));
  const now = new Date();
  const year = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const grade = year - entry + 1;
  if (grade < 1 || grade > 3) return null;
  return `${grade}年${Number(id.slice(2, 4))}組${Number(id.slice(4, 6))}番`;
}

const Chevron = ({ dim }) => (
  <svg width="1.143em" height="1.143em" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d="M7.5 5l5 5-5 5" stroke={dim ? GREY : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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

const Divider = () => <div style={{ height: '1px', background: '#E5E7EB' }} />;

// disabled の行は、文字も見た目も灰色にして、押せないことを示す
function Row({ label, value, onClick, disabled }) {
  const active = !disabled && !!onClick;
  return (
    <div
      onClick={active ? onClick : undefined}
      aria-disabled={disabled || undefined}
      style={{
        padding: '0.857em 1.143em',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.8em',
        cursor: active ? 'pointer' : 'default',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div style={{ color: disabled ? GREY : '#111827', fontSize: '1.071em', fontWeight: 600 }}>{label}</div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em', color: disabled ? GREY : '#6B7280', fontSize: '1.071em' }}>
        {value}
        {onClick && <Chevron dim={disabled} />}
      </span>
    </div>
  );
}

function Switch({ disabled }) {
  return (
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
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ width: '1.714em', height: '1.714em', background: 'white', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }} />
    </span>
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
  // Class.jsx と同じ基準の文字サイズを使う。変更するとこの画面にもすぐ反映される
  const [font, setFont] = useState(currentFontSize);
  const studentClass = identity ? classOf(identity.id) : null;

  // 下のバー: お知らせへ移動。ホーム・カレンダーはまだ画面がないので何もしない
  function onSelectTab(id) {
    if (id === 'class') navigate('/class');
  }

  function openFeedback() {
    window.open(FEEDBACK_FORM_URL, '_blank', 'noopener');
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
        fontSize: `${font.px}px`,
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
        <div style={{ padding: '0 1.714em', height: '34px', display: 'flex', alignItems: 'center' }}>
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
                <circle cx="12" cy="8" r="4" stroke={GREY} strokeWidth="2" />
                <path d="M4 20c1-4 4-6 8-6s7 2 8 6" stroke={GREY} strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.286em' }}>
              <div style={{ color: '#111827', fontSize: '1.286em', fontFamily: 'Inter', fontWeight: 700 }}>
                ログイン中のアカウント
              </div>
              <div style={{ color: '#6B7280', fontSize: '0.929em' }}>
                {studentClass ? studentClass : `生徒ID ${identity ? identity.id : '-'}`}
              </div>
            </div>
            <Chevron />
          </div>

          <Section title="通知設定">
            <Row label="クラスルーム通知" disabled />
            <Divider />
            <Row label="授業前通知" disabled />
          </Section>

          <Section title="画面表示">
            <Row label="ダークモード" disabled value={<Switch disabled />} />
            <Divider />
            <Row
              label="文字サイズ"
              value={font.label}
              onClick={() => setFont(nextFontSize())}
            />
          </Section>

          <Section title="サポート">
            <Row label="フィードバックを送る" disabled={!FEEDBACK_FORM_URL} onClick={FEEDBACK_FORM_URL ? openFeedback : undefined} />
            <Divider />
            <Row label="アプリのバージョン" value={`v${pkg.version}`} />
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
