import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useIdentity } from '../auth/identity';
import { buildGasLoginUrl, isGasConfigured } from '../config';
import { initOneSignal, subscribeAs } from '../lib/onesignal';
import { usePushKey, markPushFixed } from '../lib/pushStatus';
import { isNotifyDone, markNotifyDone, KEYS, storage } from '../lib/storage';
import ClassBackdrop, { BottomNav, TitleHeader } from '../components/ClassBackdrop';
import loginIllustration from '../assets/images/other_svgs/login.svg';
import InstallGuide, { InstallSteps, isIos, isStandalone, needsInstall } from '../components/InstallGuide';

const GOOGLE_FONT = "'Google Sans', Roboto, 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', Arial, sans-serif";

// Class.jsx の一斉既読ダイアログと同じ見た目
const dialogTitle = { fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '8px' };
const dialogBody = { fontSize: '14px', lineHeight: '20px', color: '#6B7280', marginBottom: '20px' };
const dialogActions = { display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' };
const textBtn = (busy) => ({ padding: '10px 16px', border: 'none', background: 'transparent', color: '#6B7280', borderRadius: '999px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1 });
const darkBtn = (busy) => ({ padding: '10px 16px', border: 'none', background: '#111827', color: 'white', borderRadius: '999px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.85 : 1, display: 'inline-flex', alignItems: 'center', gap: '8px' });

function GoogleG() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="#fff" strokeWidth="3" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

export default function LinkPage() {
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const location = useLocation();
  const relinkMode = new URLSearchParams(location.search).get('relink') === '1';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [slow, setSlow] = useState(false); // 10秒たっても終わらないときの補足表示
  const [guideOpen, setGuideOpen] = useState(needsInstall); // ホーム画面に追加していないスマホには、先に案内を出す
  const slowTimer = useRef(null);

  const [baseFontSize] = useState(14);

  useEffect(() => {
    initOneSignal();
  }, []);

  // OneSignal の External ID に使う値(生徒IDではなく、推測できない値)
  const pushKey = usePushKey(identity?.id);

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

  async function confirmRestartLink() {
    if (!identity) {
      setMessage('連携情報を確認できません。いったんログインし直してください。');
      return;
    }
    if (!isGasConfigured()) {
      setMessage('src/config.js の GAS_URL がまだ設定されていません。');
      return;
    }
    setBusy(true);
    setMessage('');

    try {
      // OneSignal の紐づけは、ここでは解除しない(通知を許可する段階で付け替える)。
      // 途中で戻っても、通知が届かなくなるのを防ぐため。
      storage.remove(KEYS.notifyDoneFor);
      storage.set('relinking', '1');
      window.location.href = buildGasLoginUrl();
    } catch (e) {
      setMessage('再連携の準備に失敗しました: ' + e.message);
      setBusy(false);
    }
  }

  async function enableNotifications() {
    setBusy(true);
    setMessage('');
    setSlow(false);

    try {
      // ブラウザの許可画面を押すまでの時間は数えない(許可が終わってから10秒たったら補足を出す)
      // キーがまだ届いていなくても許可は進める。ひもづけは、キーが届いたあとにお知らせ画面が自動で行う
      const result = await subscribeAs(pushKey, () => {
        slowTimer.current = setTimeout(() => setSlow(true), 10000);
      });
      if (result.ok) {
        markNotifyDone(identity.id);
        if (result.synced) markPushFixed();
        storage.remove('relinking');
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
  // 以前この端末を使っていた人(生徒IDが残っている)で、今はログインしていない → 再ログインを案内する
  const needsRelogin = !identity && !!storage.get(KEYS.studentId);

  const rootStyle = {
    position: 'fixed',
    inset: 0,
    margin: 0,
    padding: 0,
    background: 'white',
    boxSizing: 'border-box',
    overflow: 'hidden',
    fontSize: `${baseFontSize}px`,
    fontFamily: GOOGLE_FONT,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    WebkitTouchCallout: 'none',
  };

  const notice = (bg, border, color, children) => (
    <div style={{ padding: '0.8em 1em', background: bg, border: `1px solid ${border}`, borderRadius: '0.6em', color, fontSize: '0.9em', lineHeight: '1.6em', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
      {children}
    </div>
  );

  // ================= step 1: ログイン画面 =================
  if (!identity) {
    return (
      <div onCopy={(e) => e.preventDefault()} style={{ ...rootStyle, display: 'flex', flexDirection: 'column' }}>
        <TitleHeader title="ログイン" />

        {/* 中身は、上下左右の中央に置く(内容が多いときはスクロールする) */}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            padding: '0.857em 1.714em',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ width: '100%', maxWidth: '26em', margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.143em' }}>
            {guideOpen ? (
              <InstallGuide onSkip={() => setGuideOpen(false)} />
            ) : (
              <>
                {offline && notice('#FEF2F2', '#FECACA', '#DC2626', 'インターネットに接続されていません。接続してからもう一度お試しください。')}
                {needsRelogin && notice('#FFFBEB', '#FCD34D', '#B45309', (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: '0.3em' }}>ログイン方法が変わりました</div>
                    お手数ですが、下の「Googleでログイン」を押して、ログインし直してください。「連携済みです」と表示されたら、「再連携する」は押さず、左下の「←」(押せないときは右上の「×」)で戻ると完了です。
                  </>
                ))}

                <img
                  draggable={false}
                  src={loginIllustration}
                  alt=""
                  style={{ display: 'block', width: '100%', maxWidth: '15em', height: 'auto', margin: '0 auto' }}
                />

                <button
                  type="button"
                  onClick={startLink}
                  disabled={offline}
                  style={{
                    width: '100%',
                    height: '3.857em',
                    borderRadius: '1.286em',
                    border: '1px solid #E5E7EB',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.8em',
                    color: '#111827',
                    fontFamily: 'inherit',
                    fontSize: '1.143em',
                    fontWeight: 700,
                    cursor: offline ? 'default' : 'pointer',
                    opacity: offline ? 0.5 : 1,
                    touchAction: 'manipulation',
                  }}
                >
                  <GoogleG />
                  Googleでログイン
                </button>

                {message && notice('#FFFBEB', '#FCD34D', '#B45309', message)}

                <div style={{ color: '#6B7280', fontSize: '0.85em', lineHeight: '1.5em', textAlign: 'center' }}>
                  ※「このアプリは確認されていません」と表示された場合は、画面内の「詳細」→「(安全ではないページ)に移動」を選択してください。
                </div>

                {needsInstall && (
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    style={{ padding: '0.5em 1em', border: 'none', background: 'transparent', color: '#6B7280', fontFamily: 'inherit', fontSize: '0.85em', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    ホーム画面への追加方法を見る
                  </button>
                )}
              </>
            )}
          </div>
        </main>

        {/* 下のアイコンバー: 設定を光らせる */}
        <BottomNav activeTab="settings" />
      </div>
    );
  }

  // ================= step 2: お知らせ画面の上にダイアログ =================
  const iosNeedsHome = isIos && !isStandalone;

  return (
    <div onCopy={(e) => e.preventDefault()} style={rootStyle}>
      <ClassBackdrop />

      <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: GOOGLE_FONT }}>
        {/* 暗幕: 連携済み(再連携の確認)のときだけ、押すとお知らせに戻る */}
        <div
          onClick={() => { if (notifyDone && !busy) navigate('/class'); }}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="link-dialog-title"
          style={{ position: 'relative', width: '100%', maxWidth: '320px', maxHeight: '100%', overflowY: 'auto', background: 'white', borderRadius: '20px', padding: '24px', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}
        >
          {offline ? (
            <>
              <div id="link-dialog-title" style={dialogTitle}>オフラインです</div>
              <div style={dialogBody}>インターネットに接続されていません。接続してからもう一度お試しください。</div>
            </>
          ) : notifyDone ? (
            /* 連携済み(再連携) */
            <>
              <div id="link-dialog-title" style={dialogTitle}>連携済みです</div>
              <div style={dialogBody}>
                Classroomとの連携をやり直しますか?ログインし直したあと、通知の許可をもう一度行います。
              </div>
              {message && <div style={{ ...dialogBody, color: '#B45309' }}>{message}</div>}
              <div style={dialogActions}>
                <button type="button" onClick={() => navigate('/class')} disabled={busy} style={textBtn(busy)}>戻る</button>
                <button type="button" onClick={confirmRestartLink} disabled={busy} style={darkBtn(busy)}>
                  {busy ? '準備しています...' : '再連携する'}
                </button>
              </div>
            </>
          ) : iosNeedsHome ? (
            /* 通知未許可: iPhone でホーム画面に追加していない */
            <>
              <div id="link-dialog-title" style={dialogTitle}>ホーム画面に追加してください</div>
              <div style={dialogBody}>iPhoneで通知を受け取るには、ホーム画面に追加したアイコンから開き直す必要があります。</div>
              <div style={{ marginBottom: '20px' }}><InstallSteps /></div>
              <div style={dialogActions}>
                <button type="button" onClick={() => navigate('/class')} style={textBtn(false)}>あとで設定する</button>
              </div>
            </>
          ) : (
            /* 通知未許可 */
            <>
              <div id="link-dialog-title" style={dialogTitle}>
                {storage.get('relinking') === '1' ? '通知を許可すると再連携が完了します' : '連携が完了しました'}
              </div>
              <div style={dialogBody}>最後に、通知を許可してください。</div>
              {message && <div style={{ ...dialogBody, color: '#B45309' }}>{message}</div>}
              {slow && <div style={{ ...dialogBody, fontSize: '13px' }}>反応がないときは、しばらくして再度お試しください</div>}
              <div style={dialogActions}>
                <button type="button" onClick={() => navigate('/class')} disabled={busy} style={textBtn(busy)}>あとで設定する</button>
                <button type="button" onClick={enableNotifications} disabled={busy} aria-busy={busy} style={darkBtn(busy)}>
                  {busy && <Spinner />}
                  {busy ? '設定中...' : '通知を有効にする'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
