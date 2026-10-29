// ホーム画面に置けるガジェットの登録簿。
// 新しいガジェットは、src/gadgets/ に部品を作って、ここに1行足すだけ。
//   id:         保存に使う名前(変えない)
//   title:      枠の見出し
//   path:       枠をタップしたときに開く画面(なければタップしても何も起きない)
//   defaultPos: 初めて置くときの位置と大きさ(マス単位: x,y,w,h)
//   minW/maxW/minH/maxH: 大きさの範囲(マス単位)
//   Component:  枠の中身。props: { identity }
import ClassNoticesGadget from './ClassNoticesGadget';

export const GADGETS = [
  {
    id: 'classNotices',
    title: 'お知らせ',
    path: '/class',
    defaultPos: { x: 0, y: 0, w: 4, h: 4 },
    minW: 2, maxW: 4,
    minH: 2, maxH: 10,
    Component: ClassNoticesGadget,
  },
];

export const gadgetById = (id) => GADGETS.find((g) => g.id === id);
