// ログインと、通知の連携(再連携)の画面。
import React, { useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useIdentity } from '../auth/identity';
import { buildGasLoginUrl, isGasConfigured } from '../config';
import { enableFcmForStudent } from '../lib/push/fcm';
import { markPushFixed } from '../lib/push/pushStatus';
import { isNotifyDone, markNotifyDone, KEYS, storage } from '../lib/data/storage';
import ClassBackdrop, { TitleHeader } from '../components/ClassBackdrop';
import Icon from '../components/Icon';
import BottomNav from '../components/BottomNav';
import loginIllustration from '../assets/images/other_svgs/login.svg';
import InstallGuide, { InstallSteps, isIos, isStandalone, needsInstall } from '../components/InstallGuide';
import { t } from '../lib/ui/text';

const GOOGLE_FONT = "'Google Sans', Roboto, 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', Arial, sans-serif";

// Class.jsx の一斉既読ダイアログと同じ見た目
const dialogTitle = { fontSize: '1.286em', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '0.444em' };
const dialogBody = { fontSize: '1em', lineHeight: '1.43em', color: 'var(--text-muted)', marginBottom: '1.43em' };
const dialogActions = { display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' };
const textBtn = (busy) => ({ padding: '0.714em 1.143em', border: 'none', background: 'transparent', color: 'var(--text-muted)', borderRadius: '999px', fontFamily: 'inherit', fontSize: '1em', fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1 });
const darkBtn = (busy) => ({ padding: '0.714em 1.143em', border: 'none', background: 'var(--ink)', color: 'var(--on-ink)', borderRadius: '999px', fontFamily: 'inherit', fontSize: '1em', fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.85 : 1, display: 'inline-flex', alignItems: 'center', gap: '8px' });

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

  const notifyDone = !!(identity && isNotifyDone(identity.id));

  if (notifyDone && !relinkMode) {
    return <Navigate to="/class" replace />;
  }

  function startLink() {
    if (!isGasConfigured()) {
      setMessage(t('link.gasUrlMissing'));
      return;
    }
    window.location.href = buildGasLoginUrl();
  }

  async function confirmRestartLink() {
    if (!identity) {
      setMessage(t('link.noLinkInfo'));
      return;
    }
    if (!isGasConfigured()) {
      setMessage(t('link.gasUrlMissing'));
      return;
    }
    setBusy(true);
    setMessage('');

    try {
      // 通知の登録は、ここでは解除しない(通知を許可する段階で付け替える)。
      // 途中で戻っても、通知が届かなくなるのを防ぐため。
      storage.remove(KEYS.notifyDoneFor);
      storage.set('relinking', '1');
      window.location.href = buildGasLoginUrl();
    } catch (e) {
      setMessage(t('link.relinkFailed') + e.message);
      setBusy(false);
    }
  }

  async function enableNotifications() {
    setBusy(true);
    setMessage('');
    setSlow(false);

    try {
      // ブラウザの許可画面を押すまでの時間は数えない(許可が終わってから10秒たったら補足を出す)
      const result = await enableFcmForStudent(identity.id, () => {
        slowTimer.current = setTimeout(() => setSlow(true), 10000);
      });
      if (result.ok) {
        markNotifyDone(identity.id);
        markPushFixed();
        storage.remove('relinking');
        navigate('/class', { replace: true });
        return;
      }
      setMessage(
        result.reason === 'denied'
          ? t('link.permissionDenied')
          : t('link.timeout')
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
    background: 'var(--surface)',
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

  // step 1: ログイン画面
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
                {offline && notice('#FEF2F2', '#FECACA', '#DC2626', t('link.offline'))}
                {needsRelogin && notice('var(--warn-bg)', 'var(--warn-line)', 'var(--warn-fg)', (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: '0.3em' }}>ログイン方法が変わりました</div>
                    お手数ですが、下の「Googleでログイン」を押して、ログインし直してください。「連携済みです」と表示されたら、「再連携する」は押さず、左下の「←」(押せないときは右上の「×」)で戻ると完了です。
                  </>
                ))}

                {/* ダークでは、イラストの下地を白い角丸パネルにして、白基調の見た目を保つ */}
                <div style={{ width: 'fit-content', margin: '0 auto', padding: '0.6em', borderRadius: '1.2em', background: 'var(--illust-bg)' }}>
                  <img
                    draggable={false}
                    src={loginIllustration}
                    alt=""
                    style={{ display: 'block', width: '15em', maxWidth: '100%', height: 'auto', margin: '0 auto' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={startLink}
                  disabled={offline}
                  style={{
                    width: '100%',
                    height: '3.857em',
                    borderRadius: '1.286em',
                    border: '1px solid var(--line)',
                    background: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.8em',
                    color: 'var(--text-strong)',
                    fontFamily: 'inherit',
                    fontSize: '1.143em',
                    fontWeight: 700,
                    cursor: offline ? 'default' : 'pointer',
                    opacity: offline ? 0.5 : 1,
                    touchAction: 'manipulation',
                  }}
                >
                  <Icon name="google" size={22} />
                  Googleでログイン
                </button>

                {message && notice('var(--warn-bg)', 'var(--warn-line)', 'var(--warn-fg)', message)}

                <div style={{ color: 'var(--text-muted)', fontSize: '0.85em', lineHeight: '1.5em', textAlign: 'center' }}>
                  ※「このアプリは確認されていません」と表示された場合は、画面内の「詳細」→「(安全ではないページ)に移動」を選択してください。
                </div>

                {needsInstall && (
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    style={{ padding: '0.5em 1em', border: 'none', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '0.85em', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    ホーム画面への追加方法を見る
                  </button>
                )}
              </>
            )}
          </div>
        </main>

        {/* 下のアイコンバー: 設定を光らせる */}
        <BottomNav active="settings" />
      </div>
    );
  }

  // step 2: お知らせ画面の上にダイアログ
  const iosNeedsHome = isIos && !isStandalone;

  return (
    <div onCopy={(e) => e.preventDefault()} style={rootStyle}>
      <ClassBackdrop />

      <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: GOOGLE_FONT }}>
        {/* 暗幕: 連携済み(再連携の確認)のときだけ、押すとお知らせに戻る */}
        <div
          onClick={() => { if (notifyDone && !busy) navigate('/class'); }}
          style={{ position: 'absolute', inset: 0, background: 'var(--overlay)' }}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="link-dialog-title"
          style={{ position: 'relative', width: '100%', maxWidth: '22.857em', maxHeight: '100%', overflowY: 'auto', background: 'var(--surface)', borderRadius: '1.143em', padding: '1.714em', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}
        >
          {offline ? (
            <>
              <div id="link-dialog-title" style={dialogTitle}>オフラインです</div>
              <div style={dialogBody}>インターネットに接続されていません。接続してからもう一度お試しください。</div>
            </>
          ) : notifyDone ? (
            // 連携済み(再連携)
            <>
              <div id="link-dialog-title" style={dialogTitle}>連携済みです</div>
              <div style={dialogBody}>
                Classroomとの連携をやり直しますか?ログインし直したあと、通知の許可をもう一度行います。
              </div>
              {message && <div style={{ ...dialogBody, color: 'var(--warn-fg)' }}>{message}</div>}
              <div style={dialogActions}>
                <button type="button" onClick={() => navigate('/class')} disabled={busy} style={textBtn(busy)}>戻る</button>
                <button type="button" onClick={confirmRestartLink} disabled={busy} style={darkBtn(busy)}>
                  {busy ? t('link.preparing') : '再連携する'}
                </button>
              </div>
            </>
          ) : iosNeedsHome ? (
            // 通知未許可: iPhone でホーム画面に追加していない
            <>
              <div id="link-dialog-title" style={dialogTitle}>ホーム画面に追加してください</div>
              <div style={dialogBody}>iPhoneで通知を受け取るには、ホーム画面に追加したアイコンから開き直す必要があります。</div>
              <div style={{ marginBottom: '20px' }}><InstallSteps /></div>
              <div style={dialogActions}>
                <button type="button" onClick={() => navigate('/class')} style={textBtn(false)}>あとで設定する</button>
              </div>
            </>
          ) : (
            // 通知未許可
            <>
              <div id="link-dialog-title" style={dialogTitle}>
                {storage.get('relinking') === '1' ? t('link.relinkWaiting') : t('link.linked')}
              </div>
              <div style={dialogBody}>最後に、通知を許可してください。</div>
              {message && <div style={{ ...dialogBody, color: 'var(--warn-fg)' }}>{message}</div>}
              {slow && <div style={{ ...dialogBody, fontSize: '0.929em' }}>反応がないときは、しばらくして再度お試しください</div>}
              <div style={dialogActions}>
                <button type="button" onClick={() => navigate('/class')} disabled={busy} style={textBtn(busy)}>あとで設定する</button>
                <button type="button" onClick={enableNotifications} disabled={busy} aria-busy={busy} style={darkBtn(busy)}>
                  {busy && <Spinner />}
                  {busy ? '設定中...' : t('link.enableNotify')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
