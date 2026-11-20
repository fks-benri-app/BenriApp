// アプリの入り口。配色を反映して、App を画面に出す。
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { IdentityProvider } from './auth/identity';
import './styles.css';
import { applyTheme } from './lib/ui/darkMode';

applyTheme(); // 描画の前に、保存されたテーマを反映する

// オフライン用の Service Worker(アプリ本体のキャッシュ)を登録する。FCM の SW(fcm/)とは別のスコープ
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
}

// GitHub Pages はサーバー側ルーティングができないので HashRouter を使う
// (URL は .../classroom-notify/#/home のようになり、リロードしても404にならない)
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <IdentityProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </IdentityProvider>
  </React.StrictMode>
);
