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
  return (
    <Routes>
      <Route path="/" element={<LinkPage />} />
      <Route
        path="/home"
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
