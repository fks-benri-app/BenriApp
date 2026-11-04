import { useState } from 'react';
import { requestFcmToken, registerFcmTokenToGas } from '../lib/fcm';
import { useIdentity } from '../auth/identity';
import { usePushKey } from '../lib/pushStatus';

// 通知(FCM)の試験画面。開き方: アプリの「#/fcm-test」へ行く
// 使い方: 「通知を許可してトークンを取る」を押す → 表示されたトークンを、
// GAS のスクリプトプロパティ TEST_FCM_TOKEN に入れる → testFcmSubscribe / testFcmSend を実行する。
// ログイン済みなら、取ったトークンは GAS にも登録する(users/{生徒ID}/fcmTokens)。
// 保存はしない。トークンは、テスト端末のものだけを扱う。

const box = { borderRadius: 14, background: 'var(--surface-2)', padding: '1em', display: 'flex', flexDirection: 'column', gap: '0.7em' };
const btn = {
  borderRadius: 999, padding: '0.6em 1.2em', background: '#0066cc', color: '#fff',
  border: 'none', fontWeight: 600, fontSize: '0.929em', cursor: 'pointer', alignSelf: 'flex-start',
};
const tokenStyle = { fontFamily: 'monospace', fontSize: '0.8em', wordBreak: 'break-all', background: 'var(--surface)', padding: '0.6em', borderRadius: 8 };

export default function FcmTest() {
  const [status, setStatus] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { identity } = useIdentity();
  const pushKey = usePushKey(identity?.id);

  async function onClick() {
    setBusy(true);
    setStatus('');
    setCopied(false);
    try {
      const t = await requestFcmToken();
      setToken(t);
      let msg = 'トークンを取得しました。下の文字列を、GAS の TEST_FCM_TOKEN に入れてください。';
      if (identity && pushKey) {
        try {
          await registerFcmTokenToGas(identity.id, pushKey, t);
          msg += ' GAS への登録も済みました。';
        } catch (e) {
          msg += ' (GAS への登録は失敗: ' + e.message + ')';
        }
      }
      setStatus(msg);
    } catch (e) {
      setToken('');
      setStatus('失敗: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
    } catch {
      setStatus('コピーできませんでした。文字列を選んでコピーしてください。');
    }
  }

  return (
    <div style={{ padding: '16px', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ fontSize: '1.2em' }}>通知(FCM)の試験</h1>
      <div style={box}>
        <p style={{ fontSize: '0.9em' }}>テスト端末で押してください。iPhone は、ホーム画面に追加したアプリから開いてください。</p>
        <button style={btn} onClick={onClick} disabled={busy}>
          {busy ? '取得中…' : '通知を許可してトークンを取る'}
        </button>
        {status && <p style={{ fontSize: '0.9em' }}>{status}</p>}
        {token && (
          <>
            <div style={tokenStyle}>{token}</div>
            <button style={{ ...btn, background: 'var(--surface)', color: '#0066cc', border: '1px solid var(--line-strong)' }} onClick={onCopy}>
              {copied ? 'コピーしました' : 'トークンをコピー'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
