import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useIdentity } from '../auth/identity';
import { buildGasLoginUrl, isGasConfigured } from '../config';
import { initOneSignal, subscribeAs } from '../lib/onesignal';
import { isNotifyDone, markNotifyDone } from '../lib/storage';

const ua = navigator.userAgent.toLowerCase();
const isIos = /iphone|ipad|ipod/.test(ua);
const isStandalone =
  window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

export default function LinkPage() {
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const slowTimer = useRef(null);

  // 画面を開いた時点で OneSignal を初期化しておく
  useEffect(() => {
    initOneSignal();
  }, []);

  // 連携も通知設定も終わっていれば、この画面は飛ばす
  if (identity && isNotifyDone(identity.id)) {
    return <Navigate to="/home" replace />;
  }

  // ① GAS へ(アカウント選択 → ログイン → 警告 → 連携開始ボタン)
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
    <main className="screen">
      <div className="card">
        <ol className="steps" aria-label="設定の進み具合">
          <li className={step === 1 ? 'on' : 'done'}>Classroomと連携</li>
          <li className={step === 2 ? 'on' : ''}>通知を許可</li>
        </ol>

        {offline && (
          <p className="note">
            インターネットに接続されていません。接続してからもう一度お試しください。
          </p>
        )}

        {!offline && step === 1 && (
          <>
            <h1>Classroomの課題を通知で受け取る</h1>
            <p>
              新着課題やテスト範囲が出たら、このアプリにお知らせします。
              学校のGoogleアカウントでログインして連携します。
            </p>
            <button className="btn" onClick={startLink}>
              連携を開始する
            </button>
            <p className="hint">
              「このアプリは確認されていません」と出たら、
              「詳細」→「(安全ではないページ)に移動」を選んでください。
            </p>
          </>
        )}

        {!offline && step === 2 && isIos && !isStandalone && (
          <>
            <h1>ホーム画面に追加してください</h1>
            <p>
              iPhoneで通知を受け取るには、共有ボタンから「ホーム画面に追加」して、
              追加したアイコンから開き直してください。
            </p>
          </>
        )}

        {!offline && step === 2 && !(isIos && !isStandalone) && (
          <>
            <h1>連携できました</h1>
            <p>最後に、このスマホへの通知を許可してください。</p>
            <button className="btn" onClick={enableNotifications} disabled={busy}>
              通知を有効にする
            </button>
            <button
              className="btn btn-quiet"
              onClick={() => navigate('/home')}
              disabled={busy}
            >
              あとで設定する
            </button>
          </>
        )}

        {message && <p className="note">{message}</p>}
      </div>
    </main>
  );
}
