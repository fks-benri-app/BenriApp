import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useIdentity } from '../auth/identity';
import { buildGasLoginUrl, isGasConfigured } from '../config';
import { initOneSignal, subscribeAs } from '../lib/onesignal';
import { isNotifyDone, markNotifyDone } from '../lib/storage';

// ボトムナビ用アイコン
import homeIcon from '../assets/home.svg';
import calendarIcon from '../assets/calendar.svg';
import classIcon from '../assets/message-square.svg';
import settingsIcon from '../assets/settings.svg';

import homeActiveIcon from '../assets/home-active.svg';
import calendarActiveIcon from '../assets/calendar-active.svg';
import classActiveIcon from '../assets/message-square-active.svg';
import settingsActiveIcon from '../assets/settings-active.svg';

import searchIcon from '../assets/search.svg';

// カラーパターンの定義
const THEMES = {
  orangeRed: {
    gradient: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)',
    textColor: 'white',
  },
  // 1. ピンク 〜 ローズ
  pinkRose: {
    gradient: 'linear-gradient(135deg, #FF4D94 0%, #FF4D8A 100%)',
    textColor: 'white',
  },
  // 2. イエロー 〜 オレンジ
  yellowOrange: {
    gradient: 'linear-gradient(135deg, #FFD14D 0%, #FFA21B 100%)',
    textColor: 'white',
  },
  // 3. グリーン 〜 イエロー
  greenYellow: {
    gradient: 'linear-gradient(135deg, #A8FF4D 0%, #FFD11B 100%)',
    textColor: '#111827', // 明るいグラデーションのため文字色をダークカラーに
  },
  // 4. シアン 〜 エメラルド
  cyanEmerald: {
    gradient: 'linear-gradient(135deg, #4DFFFF 0%, #1BFF8A 100%)',
    textColor: '#111827', // 明るいグラデーションのため文字色をダークカラーに
  },
  // 5. ブルー 〜 シアン
  blueCyan: {
    gradient: 'linear-gradient(135deg, #4DA8FF 0%, #1BFFFF 100%)',
    textColor: 'white',
  },
  // 6. パープル 〜 バイオレット
  purpleViolet: {
    gradient: 'linear-gradient(135deg, #944DFF 0%, #4D1BFF 100%)',
    textColor: 'white',
  },
};

const ua = navigator.userAgent.toLowerCase();
const isIos = /iphone|ipad|ipod/.test(ua);
const isStandalone =
  window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

const TABS = [
  { id: 'home', label: 'ホーム', icon: homeIcon, activeIcon: homeActiveIcon },
  { id: 'calendar', label: 'カレンダー', icon: calendarIcon, activeIcon: calendarActiveIcon },
  { id: 'class', label: 'クラス', icon: classIcon, activeIcon: classActiveIcon },
  { id: 'settings', label: '設定', icon: settingsIcon, activeIcon: settingsActiveIcon },
];

export default function LinkPage() {
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const slowTimer = useRef(null);

  // テーマ設定（切り替え可能）
  const [currentTheme, setCurrentTheme] = useState('orangeRed');
  const activeTheme = THEMES[currentTheme] || THEMES.orangeRed;

  // 文字サイズの基準値
  const [baseFontSize, setBaseFontSize] = useState(14);

  // 下部ナビゲーションの選択状態（クラス固定）
  const activeTab = 'class';

  // 画面を開いた時点で OneSignal を初期化
  useEffect(() => {
    initOneSignal();
  }, []);

  // 連携も通知設定も終わっていれば /home に遷移
  if (identity && isNotifyDone(identity.id)) {
    return <Navigate to="/home" replace />;
  }

  // ① GAS へ連携開始
  function startLink() {
    if (!isGasConfigured()) {
      setMessage('src/config.js の GAS_URL がまだ設定されていません。');
      return;
    }
    window.location.href = buildGasLoginUrl();
  }

  // ② 通知の許可と、端末のひもづけ
  async function enableNotifications() {
    setBusy(true);
    setMessage('設定中...');
    slowTimer.current = setTimeout(() => {
      setMessage('設定中...\n(反応がないときは、しばらくして再度お試しください)');
    }, 10000);

    try {
      const result = await subscribeAs(identity.id);
      if (result.ok) {
        markNotifyDone(identity.id);
        navigate('/home', { replace: true });
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
      setBusy(false);
    }
  }

  const offline = !navigator.onLine;
  const step = identity ? 2 : 1;

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
          {/* タイトルを元の「クラスルームからのお知らせ」に復元 */}
          <div style={{ 
            color: '#111827', 
            fontSize: '1.6em', 
            fontFamily: 'Inter', 
            fontWeight: '800',
            userSelect: 'none'
          }}>
            クラスルームからのお知らせ
          </div>
          
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

        {/* タグ表示（「1. 」「2. 」の数字を削除して復元） */}
        <div style={{ padding: '0 1.5em', display: 'flex', gap: '0.7em' }}>
          {/* Step 1 タグ */}
          <div style={{
            padding: '0.5em 1.2em',
            borderRadius: '9999px',
            backgroundImage: step === 1 ? activeTheme.gradient : 'none',
            backgroundColor: step === 1 ? 'transparent' : 'white',
            border: step === 1 ? '1.5px solid transparent' : '1.5px solid #D1D5DB',
            color: step === 1 ? activeTheme.textColor : '#6B7280',
            fontSize: '1em',
            fontWeight: step === 1 ? '700' : '500',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}>
            Classroom連携
          </div>

          {/* Step 2 タグ */}
          <div style={{
            padding: '0.5em 1.2em',
            borderRadius: '9999px',
            backgroundImage: step === 2 ? activeTheme.gradient : 'none',
            backgroundColor: step === 2 ? 'transparent' : 'white',
            border: step === 2 ? '1.5px solid transparent' : '1.5px solid #D1D5DB',
            color: step === 2 ? activeTheme.textColor : '#6B7280',
            fontSize: '1em',
            fontWeight: step === 2 ? '700' : '500',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}>
            通知を許可
          </div>
        </div>
      </header>

      {/* ===== メインコンテンツ部分 ===== */}
      <main style={{ 
        flex: 1,
        overflowY: 'auto',
        padding: '1.5em',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '500px',
          padding: '1.8em',
          background: 'white',
          borderRadius: '1.2em',
          outline: '1px #E5E7EB solid',
          outlineOffset: '-1px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2em'
        }}>

          {/* オフライン警告 */}
          {offline && (
            <div style={{
              padding: '0.8em 1em',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '0.6em',
              color: '#DC2626',
              fontSize: '0.95em',
              lineHeight: '1.4em'
            }}>
              インターネットに接続されていません。接続してからもう一度お試しください。
            </div>
          )}

          {/* STEP 1: Classroom 連携 */}
          {!offline && step === 1 && (
            <>
              <div>
                <h1 style={{ fontSize: '1.4em', fontWeight: '800', color: '#111827', margin: '0 0 0.5em 0' }}>
                  Classroomの課題を通知で受け取る
                </h1>
                <p style={{ color: '#4B5563', fontSize: '1em', lineHeight: '1.6em', margin: 0 }}>
                  新着課題やテスト範囲が出たら、このアプリにお知らせします。
                  学校のGoogleアカウントでログインして連携します。
                </p>
              </div>

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
                  cursor: 'pointer',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  transition: 'opacity 0.2s'
                }}
              >
                連携を開始する
              </button>

              <div style={{
                color: '#6B7280',
                fontSize: '0.85em',
                lineHeight: '1.5em'
              }}>
                ※「このアプリは確認されていません」と表示された場合は、画面内の「詳細」→「(安全ではないページ)に移動」を選択してください。
              </div>
            </>
          )}

          {/* STEP 2: iOS ホーム追加案内 */}
          {!offline && step === 2 && isIos && !isStandalone && (
            <div>
              <h1 style={{ fontSize: '1.4em', fontWeight: '800', color: '#111827', margin: '0 0 0.5em 0' }}>
                ホーム画面に追加してください
              </h1>
              <p style={{ color: '#4B5563', fontSize: '1em', lineHeight: '1.6em', margin: 0 }}>
                iPhoneで通知を受け取るには、ブラウザの共有ボタンから「ホーム画面に追加」を行い、追加されたアイコンから開き直してください。
              </p>
            </div>
          )}

          {/* STEP 2: 通知許可 */}
          {!offline && step === 2 && !(isIos && !isStandalone) && (
            <>
              <div>
                <h1 style={{ fontSize: '1.4em', fontWeight: '800', color: '#111827', margin: '0 0 0.5em 0' }}>
                  連携できました！
                </h1>
                <p style={{ color: '#4B5563', fontSize: '1em', lineHeight: '1.6em', margin: 0 }}>
                  最後に、このスマホへの通知送信を許可してください。
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8em', marginTop: '0.5em' }}>
                <button 
                  onClick={enableNotifications} 
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
                    cursor: busy ? 'not-allowed' : 'pointer',
                    opacity: busy ? 0.6 : 1,
                    userSelect: 'none',
                    WebkitUserSelect: 'none'
                  }}
                >
                  通知を有効にする
                </button>

                <button 
                  onClick={() => navigate('/home')} 
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
                    cursor: busy ? 'not-allowed' : 'pointer',
                    opacity: busy ? 0.6 : 1,
                    userSelect: 'none',
                    WebkitUserSelect: 'none'
                  }}
                >
                  あとで設定する
                </button>
              </div>
            </>
          )}

          {/* エラー / ステータスメッセージ */}
          {message && (
            <div style={{
              padding: '0.8em 1em',
              background: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: '0.6em',
              color: '#B45309',
              fontSize: '0.9em',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.4em'
            }}>
              {message}
            </div>
          )}

        </div>
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
              onClick={() => {
                if (tab.id === 'home') navigate('/home');
              }}
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