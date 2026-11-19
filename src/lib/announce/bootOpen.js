// 通知から開いた(?open=<お知らせID>)かどうか。
// ルーターが URL を書き換える前に、このファイルが読み込まれたときに1回だけ控える。
// App.jsx から静的に読むので、Class 画面を遅延読み込みにしても控えるタイミングは変わらない。
let bootOpen = (() => {
  try { return new URLSearchParams(window.location.search).get('open') || null; } catch { return null; }
})();

// 通知から起動したときに、ホームをお知らせ画面へ送るかどうか。
// 起動の1回だけ true にする。以後はお知らせ画面を開いたかどうに関係なく、ホームへ行けるようにする
// (以前は、詳細を開くまで毎回 /class へ戻されて、ホームに移れなくなっていた)
let startRedirectUsed = false;
export const startsFromNotification = () => !startRedirectUsed && bootOpen !== null;
export const markStartRedirectUsed = () => { startRedirectUsed = true; };
// 中身を見るだけ(消さない)
export const peekBootOpen = () => bootOpen;
// 中身を取り出して、消す(詳細を開くのは1回だけ)
export const takeBootOpen = () => {
  const id = bootOpen;
  bootOpen = null;
  return id;
};
