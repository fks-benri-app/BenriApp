import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useIdentity } from '../auth/identity';
import { buildGasLoginUrl, isGasConfigured } from '../config';
import { initOneSignal, subscribeAs, unsubscribe } from '../lib/onesignal';
import { isNotifyDone, markNotifyDone, KEYS, storage } from '../lib/storage';
import { THEMES } from '../lib/themes';

// アイコン類
import homeIcon from '../assets/images/icons/home.svg';
import calendarIcon from '../assets/images/icons/calendar.svg';
import classIcon from '../assets/images/icons/message-square.svg';
import settingsIcon from '../assets/images/icons/settings.svg';

import homeActiveIcon from '../assets/images/icons/home-active.svg';
import calendarActiveIcon from '../assets/images/icons/calendar-active.svg';
import classActiveIcon from '../assets/images/icons/message-square-active.svg';
import settingsActiveIcon from '../assets/images/icons/settings-active.svg';

import notifyIllustration from '../assets/images/other_svgs/notify-illustration.svg';
import linkDoneIllustration from '../assets/images/other_svgs/link-done-illustration.svg';

const ua = navigator.userAgent.toLowerCase();
const isIos = /iphone|ipad|ipod/.test(ua);
const isStandalone =
  window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

const TABS = [
  { id: 'home', label: 'ホーム', icon: homeIcon, activeIcon: homeActiveIcon },
  { id: 'calendar', label: 'カレンダー', icon: calendarIcon, activeIcon: calendarActiveIcon },
  { id: 'class', label: 'お知らせ', icon: classIcon, activeIcon: classActiveIcon },
  { id: 'settings', label: '設定', icon: settingsIcon, activeIcon: settingsActiveIcon },
];

export default function LinkPage() {
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const location = useLocation();
  const relinkMode = new URLSearchParams(location.search).get('relink') === '1';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [restartConfirm, setRestartConfirm] = useState(false);
  const [slow, setSlow] = useState(false); // 10秒たっても終わらないときの補足表示
  const slowTimer = useRef(null);

  const [currentTheme] = useState('orangeRed');
  const activeTheme = THEMES[currentTheme] || THEMES.orangeRed;
  const [baseFontSize] = useState(14);

  const activeTab = 'class';

  useEffect(() => {
    initOneSignal();
  }, []);

  const notifyDone = !!(identity && isNotifyDone(identity.id));

  if (notifyDone && !relinkMode) {
    return <Navigate to="/class" replace />;
  }

  function startLink() {
    if (!isGasConfigured()) {
      setMessage('src/config.js の GAS_URL がまだ設定されていません。');
      return;
    }
    window.location.href = buildGasLoginUrl();
  }

  function restartLink() {
    if (!identity) {
      setMessage('連携情報を確認できません。いったんログインし直してください。');
      return;
    }
    if (!isGasConfigured()) {
      setMessage('src/config.js の GAS_URL がまだ設定されていません。');
      return;
    }

    setRestartConfirm(true);
  }

  async function confirmRestartLink() {
    setRestartConfirm(false);
    setBusy(true);
    setMessage('');

    try {
      await unsubscribe();
      storage.remove(KEYS.notifyDoneFor);
      window.location.href = buildGasLoginUrl();
    } catch (e) {
      setMessage('この端末の通知登録を解除できませんでした: ' + e.message);
      setBusy(false);
    }
  }

  async function enableNotifications() {
    setBusy(true);
    setMessage('');
    setSlow(false);
    slowTimer.current = setTimeout(() => setSlow(true), 10000);

    try {
      const result = await subscribeAs(identity.id);
      if (result.ok) {
        markNotifyDone(identity.id);
        navigate('/class', { replace: true });
        return;
      }
      setMessage(
        result.reason === 'denied'
          ? '通知が許可されませんでした。ブラウザの設定から許可してください。'
          : '登録の確認に時間がかかっています。少し待ってから、もう一度お試しください。'
      );
    } catch (e) {
      setMessage('エラー: ' + e.message);
    } finally {
      clearTimeout(slowTimer.current);
      setSlow(false);
      setBusy(false);
    }
  }

  const offline = !navigator.onLine;
  const step = identity ? 2 : 1;

  return (
    <div 
      onCopy={(e) => e.preventDefault()}
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
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none'
      }}
    >
      <style>{'.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}'}</style>

      {/* ===== ヘッダー部分 ===== */}
      <header style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.857em', paddingTop: 'calc(2em + env(safe-area-inset-top))', paddingBottom: '1.143em', width: '100%' }}>
        <div style={{ padding: '0 1.714em', height: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#111827', fontSize: '1.871em', fontFamily: 'Inter', fontWeight: '800' }}>
            お知らせ
          </div>
        </div>

        <div className="no-scrollbar" style={{ padding: '0.571em 1.714em', display: 'flex', gap: '0.571em', overflowX: 'auto' }}>
          <div style={{
            padding: '0.571em 1.143em',
            borderRadius: '0.857em',
            flexShrink: 0,
            backgroundImage: step === 1 ? activeTheme.gradient : 'none',
            backgroundColor: step === 1 ? 'transparent' : 'white',
            outline: step === 1 ? 'none' : '1px #E5E7EB solid',
            outlineOffset: '-1px',
            color: step === 1 ? activeTheme.textColor : '#6B7280',
            fontSize: '1em',
            fontWeight: step === 1 ? '700' : '400',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box'
          }}>
            Classroom連携
          </div>

          <div style={{
            padding: '0.571em 1.143em',
            borderRadius: '0.857em',
            flexShrink: 0,
            backgroundImage: step === 2 ? activeTheme.gradient : 'none',
            backgroundColor: step === 2 ? 'transparent' : 'white',
            outline: step === 2 ? 'none' : '1px #E5E7EB solid',
            outlineOffset: '-1px',
            color: step === 2 ? activeTheme.textColor : '#6B7280',
            fontSize: '1em',
            fontWeight: step === 2 ? '700' : '400',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box'
          }}>
            通知を許可
          </div>
        </div>
      </header>

      {/* ===== メインコンテンツ部分 ===== */}
      <main style={{ 
        flex: 1,
        minHeight: 0,
        overscrollBehavior: 'contain',
        overflowY: 'auto',
        padding: '0.857em 1.714em',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start'
      }}>
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '500px',
          padding: '1.8em 1.8em 2.5em 1.8em',
          background: 'white',
          borderRadius: '1.2em',
          outline: '1px #E5E7EB solid',
          outlineOffset: '-1px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2em',
          // 内容が少ないときは縦方向の中央に、多いときは上からスクロールできる
          marginTop: 'auto',
          marginBottom: 'auto'
        }}>

          {offline && (
            <div style={{ padding: '0.8em 1em', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.6em', color: '#DC2626', fontSize: '0.95em' }}>
              インターネットに接続されていません。接続してからもう一度お試しください。
            </div>
          )}

          {!offline && step === 1 && (
            <>
              <h1 style={{ fontSize: '1.4em', fontWeight: '800', color: '#111827', margin: 0, textAlign: 'center' }}>
                Classroomのお知らせを通知で
              </h1>

              <img
                draggable={false}
                src={notifyIllustration}
                alt=""
                style={{ display: 'block', width: '100%', maxWidth: '15em', height: 'auto', margin: '0 auto' }}
              />

              <button 
                onClick={startLink}
                style={{
                  width: '100%',
                  padding: '0.9em 1.2em',
                  borderRadius: '0.8em',
                  border: 'none',
                  backgroundImage: activeTheme.gradient,
                  color: activeTheme.textColor,
                  fontSize: '1.05em',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                連携を開始する
              </button>

              <div style={{ color: '#6B7280', fontSize: '0.85em', lineHeight: '1.5em', textAlign: 'center' }}>
                ※「このアプリは確認されていません」と表示された場合は、画面内の「詳細」→「(安全ではないページ)に移動」を選択してください。
              </div>
            </>
          )}

          {!offline && step === 2 && notifyDone && (
            <>
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.4em', fontWeight: '800', color: '#111827', margin: '0 0 0.4em 0' }}>
                  連携済みです
                </h1>
                <p style={{ color: '#6B7280', fontSize: '0.95em', lineHeight: '1.6em', margin: 0 }}>
                  連携をやり直す場合は、下のボタンから進んでください。
                </p>
              </div>
              <img
                draggable={false}
                src={linkDoneIllustration}
                alt=""
                style={{ display: 'block', width: '100%', maxWidth: '15em', height: 'auto', margin: '0 auto' }}
              />
              <button
                onClick={restartLink}
                disabled={busy}
                style={{
                  width: '100%',
                  padding: '0.9em 1.2em',
                  borderRadius: '0.8em',
                  border: 'none',
                  backgroundImage: activeTheme.gradient,
                  color: activeTheme.textColor,
                  fontSize: '1.05em',
                  fontWeight: '700',
                  cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.85 : 1
                }}
              >
                {busy ? '解除しています...' : '連携し直す'}
              </button>
            </>
          )}

          {!offline && step === 2 && !notifyDone && isIos && !isStandalone && (
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.4em', fontWeight: '800', color: '#111827', margin: '0 0 0.5em 0' }}>
                ホーム画面に追加してください
              </h1>
              <p style={{ color: '#4B5563', fontSize: '1em', lineHeight: '1.6em', margin: 0 }}>
                iPhoneで通知を受け取るには、ブラウザの共有ボタンから「ホーム画面に追加」を行い、追加されたアイコンから開き直してください。
              </p>
            </div>
          )}

          {!offline && step === 2 && !notifyDone && !(isIos && !isStandalone) && (
            <>
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.4em', fontWeight: '800', color: '#111827', margin: '0 0 0.4em 0' }}>
                  連携が完了しました
                </h1>
                <p style={{ color: '#6B7280', fontSize: '0.95em', lineHeight: '1.6em', margin: 0 }}>
                  最後に、通知を許可してください
                </p>
              </div>

              <img
                draggable={false}
                src={linkDoneIllustration}
                alt=""
                style={{ display: 'block', width: '100%', maxWidth: '15em', height: 'auto', margin: '0 auto' }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8em' }}>
                <button
                  onClick={enableNotifications}
                  disabled={busy}
                  aria-busy={busy}
                  style={{
                    width: '100%',
                    padding: '0.9em 1.2em',
                    borderRadius: '0.8em',
                    border: 'none',
                    backgroundImage: activeTheme.gradient,
                    color: activeTheme.textColor,
                    fontSize: '1.05em',
                    fontWeight: '700',
                    cursor: busy ? 'default' : 'pointer',
                    opacity: busy ? 0.85 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6em'
                  }}
                >
                  {busy && (
                    <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
                      <path d="M12 3a9 9 0 0 1 9 9" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
                      </path>
                    </svg>
                  )}
                  {busy ? '設定中...' : '通知を有効にする'}
                </button>

                <button
                  onClick={() => navigate('/class')}
                  disabled={busy}
                  style={{
                    width: '100%',
                    padding: '0.8em 1.2em',
                    borderRadius: '0.8em',
                    border: '1.5px solid #D1D5DB',
                    background: 'white',
                    color: '#4B5563',
                    fontSize: '1em',
                    fontWeight: '600',
                    cursor: busy ? 'default' : 'pointer',
                    opacity: busy ? 0.5 : 1
                  }}
                >
                  あとで設定する
                </button>

                {slow && (
                  <div style={{ color: '#6B7280', fontSize: '0.85em', lineHeight: '1.5em', textAlign: 'center' }}>
                    反応がないときは、しばらくして再度お試しください
                  </div>
                )}
              </div>
            </>
          )}

          {message && (
            <div style={{ padding: '0.8em 1em', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '0.6em', color: '#B45309', fontSize: '0.9em', whiteSpace: 'pre-wrap', textAlign: 'center' }}>
              {message}
            </div>
          )}

        </div>
      </main>

      {/* ===== ボトムナビゲーション部分 ===== */}
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
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <div 
              key={tab.id}
              onClick={() => {
                if (tab.id === 'class' && identity) navigate('/class');
              }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.214em', justifyContent: 'center', width: '5.714em', cursor: 'pointer', padding: '0.4em 0', touchAction: 'manipulation' }}
            >
              <img draggable={false} style={{ width: '1.5em', height: '1.5em', opacity: isActive ? 1 : 0.45 }} src={isActive ? tab.activeIcon : tab.icon} alt={tab.id} />
              <div style={{ color: isActive ? '#111827' : '#6B7280', fontSize: '0.786em', fontWeight: '600' }}>
                {tab.label}
              </div>
            </div>
          );
        })}
      </nav>

      {/* カスタムダイアログ */}
      {restartConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'inherit',
          }}
        >
          <div
            onClick={() => setRestartConfirm(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
            }}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="restart-confirm-title"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '320px',
              background: 'white',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            <div
              id="restart-confirm-title"
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '8px',
              }}
            >
              Classroomとの連携をやり直しますか？
            </div>

            <div
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                color: '#6B7280',
                marginBottom: '20px',
              }}
            >
              この端末の通知登録を解除し、Classroom連携をやり直します。
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setRestartConfirm(false)}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  background: 'transparent',
                  color: '#6B7280',
                  borderRadius: '999px',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>

              <button
                type="button"
                onClick={confirmRestartLink}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  background: '#111827',
                  color: 'white',
                  borderRadius: '999px',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                連携し直す
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}