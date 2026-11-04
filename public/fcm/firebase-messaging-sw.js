// FCM のバックグラウンド通知(段階2の試験用)
// 配置: /BenriApp/fcm/ のスコープ。OneSignal の SW(ルート)とは別のスコープで動く。
// 設定値は src/config.js の firebaseConfig と同じ(公開してよい値)。変えたら両方を直す。
importScripts('./firebase-app-compat.js');
importScripts('./firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyB6FxgxqrCvcGQavTVJ05PIDN4wqXXWv18',
  authDomain: 'fks-benri-application.firebaseapp.com',
  projectId: 'fks-benri-application',
  storageBucket: 'fks-benri-application.firebasestorage.app',
  messagingSenderId: '468419846692',
  appId: '1:468419846692:web:7cadd33d2f98268cceeeb1',
});

// 通知の表示は、SDK が notification の内容で行う。ここでは初期化だけする
firebase.messaging();

// 前面の通知(listenForegroundMessages)を押したとき、data.url のページを開く。
// SDK が出した通知(data.url なし)は、ここでは何もしない(SDK の既定の動きに任せる)。
self.addEventListener('notificationclick', (event) => {
  const url = event.notification.data && event.notification.data.url;
  if (!url) return;
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope.replace('/fcm/', '/')) && 'focus' in c) {
          c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
