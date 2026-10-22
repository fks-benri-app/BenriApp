import { Navigate, Route, Routes } from 'react-router-dom';
import { useIdentity } from './auth/identity';
import LinkPage from './pages/LinkPage';
import Class from './pages/Class';

// ログイン済み(連携済み)の人だけが入れるページを包む
function RequireIdentity({ children }) {
  const { identity } = useIdentity();
  return identity ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { ready } = useIdentity();
  // ログイン状態の確認が終わるまでは何も出さない(連携画面が一瞬ちらつくのを防ぐ)
  if (!ready) return null;
  return (
    <Routes>
      <Route path="/" element={<LinkPage />} />
      <Route
        path="/class"
        element={
          <RequireIdentity>
            <Class />
          </RequireIdentity>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
