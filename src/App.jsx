import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useIdentity } from './auth/identity';
import { markStartRedirectUsed, startsFromNotification } from './lib/bootOpen';
import { loadFirestore } from './lib/firestoreLazy';
import { listenForegroundMessages } from './lib/fcm';

// 連携画面と設定画面は、開いたときに読み込む(最初の表示に必要な JS を減らす)
const LinkPage = lazy(() => import('./pages/LinkPage'));
const Settings = lazy(() => import('./pages/Settings'));
// 時間割の読み取りのテスト画面(開発中。開いたときだけ読み込む)
const OcrTest = lazy(() => import('./pages/OcrTest'));
// 通知(FCM)の試験画面(開発中。開いたときだけ読み込む)
const FcmTest = lazy(() => import('./pages/FcmTest'));
// お知らせ画面も、開いたときに読み込む(ホームの起動では読まない)
const Class = lazy(() => import('./pages/Class'));
// 通知の詳細設定は、ベルから開く大事な画面。オフラインでも開けるよう、遅延読み込みにしない
// (遅延読み込みだと、読み込んだことがない部品がオフラインで取れず、真っ白になる)
// ホームは起動直後に使うので、遅延読み込みにしない(切り替え時の白い点滅を防ぐ)
import Home from './pages/Home';
import NotifySettings from './pages/NotifySettings';

// ログイン済み(連携済み)の人だけが入れるページを包む
function RequireIdentity({ children }) {
  const { identity } = useIdentity();
  return identity ? children : <Navigate to="/" replace />;
}

// 「/」の画面。通知から起動した最初の1回だけ、お知らせ画面へ送る。
// 送るときは、お知らせ画面に必要な読み込み(Firestore と画面の JS)を先に始めて、詳細が出るまでの時間を短くする
function HomeRoute() {
  const { identity } = useIdentity();
  const [fromNotification] = useState(() => (identity ? startsFromNotification() : false));
  useEffect(() => {
    if (!fromNotification) return;
    markStartRedirectUsed();
    loadFirestore().catch(() => {});
    import('./pages/Class').catch(() => {});
  }, [fromNotification]);
  if (!identity) return <LinkPage />;
  return fromNotification ? <Navigate to="/class" replace /> : <Home />;
}

export default function App() {
  const { ready } = useIdentity();
  // FCM の前面通知(許可済みのときだけ)。ログインに関係なく、開いている間は一度だけ購読する
  useEffect(() => {
    let off = () => {};
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      listenForegroundMessages().then((f) => { off = f; }).catch(() => {});
    }
    return () => off();
  }, []);
  // ログイン状態の確認が終わるまでは何も出さない(連携画面が一瞬ちらつくのを防ぐ)
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
    <Routes>
      <Route path="/" element={<HomeRoute />} />
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
        path="/settings/notify"
        element={
          <RequireIdentity>
            <NotifySettings />
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
      <Route path="/ocr-test" element={<OcrTest />} />
      <Route path="/fcm-test" element={<FcmTest />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
