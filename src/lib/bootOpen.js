// 通知から開いた(?open=<お知らせID>)かどうか。
// ルーターが URL を書き換える前に、このファイルが読み込まれたときに1回だけ控える。
// App.jsx から静的に読むので、Class 画面を遅延読み込みにしても控えるタイミングは変わらない。
let bootOpen = (() => {
  try { return new URLSearchParams(window.location.search).get('open') || null; } catch { return null; }
})();

// 通知から開く途中(まだ詳細を開いていない)かどうか。起動画面をホームにしても、通知の詳細を開けるようにする
export const bootOpenPending = () => bootOpen !== null;
// 中身を見るだけ(消さない)
export const peekBootOpen = () => bootOpen;
// 中身を取り出して、消す(詳細を開くのは1回だけ)
export const takeBootOpen = () => {
  const id = bootOpen;
  bootOpen = null;
  return id;
};
