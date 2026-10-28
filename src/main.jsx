import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { IdentityProvider } from './auth/identity';
import './styles.css';
import { applyTheme } from './lib/themes';

applyTheme(); // 描画の前に、保存されたテーマを反映する

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
