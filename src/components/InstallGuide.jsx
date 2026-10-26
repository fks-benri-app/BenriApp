import React, { useEffect, useState } from 'react';

// ===== 端末の判定(PC には案内を出さない) =====
const ua = navigator.userAgent.toLowerCase();
const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1; // iPadOS は Mac を名乗る
export const isIos = /iphone|ipad|ipod/.test(ua) || isIpadOs;
export const isAndroid = /android/.test(ua);
export const isMobile = isIos || isAndroid;
export const isStandalone =
  window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

// ホーム画面に追加していないスマホ・タブレット
export const needsInstall = isMobile && !isStandalone;

const STEPS_IOS = [
  'Safari の画面下(iPad は上)にある共有ボタン(□から↑が出ているマーク)を押します。',
  'メニューを下にスクロールして「ホーム画面に追加」を選びます。',
  '右上の「追加」を押します。',
  'ホーム画面にできたアイコンから開き直し、ログインします。',
];

const STEPS_ANDROID = [
  'Chrome の右上にあるメニュー(⋮)を押します。',
  '「ホーム画面に追加」または「アプリをインストール」を選びます。',
  '確認の画面で「追加」(または「インストール」)を押します。',
  'ホーム画面にできたアイコンから開き直し、ログインします。',
];

// Android(Chrome)では、ボタン1つで追加できることがある
function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  return promptEvent;
}

const primaryBtn = {
  width: '100%',
  padding: '0.9em 1.2em',
  borderRadius: '1.286em',
  border: 'none',
  background: 'black',
  boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.20)',
  color: 'white',
  fontSize: '1.143em',
  fontWeight: 700,
  cursor: 'pointer',
};

// 手順の本体(ページ表示でもダイアログ内でも使う)
export function InstallSteps() {
  const promptEvent = useInstallPrompt();
  const steps = isIos ? STEPS_IOS : STEPS_ANDROID;

  async function install() {
    if (!promptEvent) return;
    promptEvent.prompt();
    try {
      await promptEvent.userChoice;
    } catch (e) {
      /* 何もしない */
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1em', textAlign: 'left' }}>
      {!isIos && promptEvent && (
        <button type="button" onClick={install} style={primaryBtn}>
          ホーム画面に追加する
        </button>
      )}
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.7em' }}>
        {steps.map((text, i) => (
          <li key={i} style={{ display: 'flex', gap: '0.8em', alignItems: 'flex-start' }}>
            <span
              style={{
                flexShrink: 0,
                width: '1.8em',
                height: '1.8em',
                borderRadius: '50%',
                background: '#111827',
                color: 'white',
                fontSize: '0.9em',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {i + 1}
            </span>
            <span style={{ color: '#374151', fontSize: '0.95em', lineHeight: '1.6em' }}>{text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ログインより先に見せる、ホーム画面への追加の案内ページ
export default function InstallGuide({ onSkip }) {
  return (
    <div style={{ width: '100%', maxWidth: '26em', display: 'flex', flexDirection: 'column', gap: '2em' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.3em' }}>
        <div style={{ color: '#111827', fontSize: '1.4em', fontFamily: 'Inter', fontWeight: 800 }}>
          ホーム画面に追加してください
        </div>
        <div style={{ color: '#6B7280', fontSize: '1em', lineHeight: '1.5em' }}>
          {isIos
            ? 'iPhone では、ホーム画面に追加したアイコンから開かないと、通知を受け取れません。'
            : 'ホーム画面に追加すると、アプリのように開けて、通知も安定して届きます。'}
        </div>
      </div>

      <InstallSteps />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6em', alignItems: 'center' }}>
        <button
          type="button"
          onClick={onSkip}
          style={{ padding: '0.7em 1.2em', border: 'none', background: 'transparent', color: '#6B7280', fontFamily: 'inherit', fontSize: '0.95em', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
        >
          追加せずに、ログイン画面へ進む
        </button>
        <div style={{ color: '#9CA3AF', fontSize: '0.8em', lineHeight: '1.5em', textAlign: 'center' }}>
          ブラウザでログインしても、ホーム画面のアイコンからは、もう一度ログインが必要です。
        </div>
      </div>
    </div>
  );
}
