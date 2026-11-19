// 授業・形式の色。Class 画面と、ホームのお知らせガジェットで共有する。
// ガジェットはここだけを読む(以前は Class 画面の本体を読み込んでいたため、ホームの起動が遅かった)。
import { THEMES } from './themes';

// ===== プルダウンを選んだときの色 =====
// 存在するテーマ名（orangeRed等）を指定してエラーを防ぐ
const DEFAULT_THEME = 'gray';

// 形式ごと
const KIND_THEMES = {
  announcement: 'orangeRed',
  assignment: 'orangeRed',
  material: 'orangeRed',
};

// 授業ごと: 授業名に match の文字が含まれていたら、その色にする
const COURSE_THEMES = [
  { match: '化学', theme: 'blue' },
  { match: '物理', theme: 'indigo' },
  { match: '生物', theme: 'teal' },
  { match: '地学', theme: 'cyan' },
  { match: '数学', theme: 'indigo' },
  { match: '古典', theme: 'red' },
  { match: '英語', theme: 'cyan' },
  { match: 'コミュ', theme: 'shuiro' },
  { match: '論理表現', theme: 'pink' },
  { match: '論表', theme: 'pink' },
  { match: '論理国語', theme: 'red' },
  { match: '論国', theme: 'red' },
  { match: '国語', theme: 'red' },
  { match: '保健', theme: 'green' },
  { match: '体育', theme: 'emerald' },
  { match: '情報', theme: 'blue' },
  { match: '家庭', theme: 'lime' },
  { match: '美術', theme: 'violet' },
  { match: '書道', theme: 'violet' },
  { match: '音楽', theme: 'pink' },
  { match: '地理', theme: 'amber' },
  { match: '史', theme: 'orange' },
  { match: '公共', theme: 'yellow' },
  { match: '政経', theme: 'amber' },
  { match: '落とし物', theme: 'red' },
  { match: '学年', theme: 'teal' },
  { match: '探究', theme: 'emerald' },
  { match: '生徒会', theme: 'green' },
  { match: 'とんぼ祭', theme: 'orangeRed' },
  { match: '組', theme: 'gray' },
];

const themeOf = (name) => THEMES[name] || THEMES[DEFAULT_THEME];
// 当てはまる色がなければ null
export const courseThemeOrNull = (label) => {
  const hit = COURSE_THEMES.find((c) => String(label).includes(c.match));
  return hit ? themeOf(hit.theme) : null;
};
export const courseTheme = (label) => courseThemeOrNull(label) || themeOf(DEFAULT_THEME);

// 授業の色の上に、ダークのときだけ薄く暗くする層を重ねる(色は変えず、明度だけ下げる)
export const shaded = (gradient) => `linear-gradient(var(--tag-shade), var(--tag-shade)), ${gradient}`;
