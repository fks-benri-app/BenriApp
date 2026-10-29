// ホーム画面に置けるガジェットの登録簿。
// 新しいガジェットは、src/gadgets/ に部品を作って、ここに1行足すだけ。
//   id:        保存に使う名前(変えない)
//   title:     枠の見出し
//   path:      枠をタップしたときに開く画面(なければタップしても何も起きない)
//   Component: 枠の中身。props: { identity }
import ClassNoticesGadget from './ClassNoticesGadget';

export const GADGETS = [
  { id: 'classNotices', title: 'クラスルーム通知', path: '/class', Component: ClassNoticesGadget },
];

export const gadgetById = (id) => GADGETS.find((g) => g.id === id);
