import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useIdentity } from './auth/identity';
import Class from './pages/Class';

// 連携画面と設定画面は、開いたときに読み込む(最初の表示に必要な JS を減らす)
const LinkPage = lazy(() => import('./pages/LinkPage'));
const Settings = lazy(() => import('./pages/Settings'));

// ログイン済み(連携済み)の人だけが入れるページを包む
function RequireIdentity({ children }) {
  const { identity } = useIdentity();
  return identity ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { ready, identity } = useIdentity();
  // ログイン状態の確認が終わるまでは何も出さない(連携画面が一瞬ちらつくのを防ぐ)
  if (!ready) return null;
  // 起動時に開く画面: 連携済みならお知らせ、未連携なら連携画面
  const home = identity ? <Class /> : <LinkPage />;
  return (
    <Suspense fallback={null}>
    <Routes>
      <Route path="/" element={home} />
      <Route path="/link" element={<LinkPage />} />
      <Route
        path="/class"
        element={
          <RequireIdentity>
            <Class />
          </RequireIdentity>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireIdentity>
            <Settings />
          </RequireIdentity>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
