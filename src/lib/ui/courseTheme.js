// 授業・形式の色。Class 画面と、ホームのお知らせガジェットで共有する。
// ガジェットはここだけを読む(以前は Class 画面の本体を読み込んでいたため、ホームの起動が遅かった)。
import { THEMES } from './themes';
import courseThemes from '../../data/courseThemes.json';

// 色の対応表は src/data/courseThemes.json(テーマ名は themes.json にあるもの)
const DEFAULT_THEME = courseThemes.default;

// 形式ごと
const KIND_THEMES = courseThemes.kinds;

// 授業ごと: 授業名に match の文字が含まれていたら、その色にする
const COURSE_THEMES = courseThemes.courses;

const themeOf = (name) => THEMES[name] || THEMES[DEFAULT_THEME];
// 当てはまる色がなければ null
export const courseThemeOrNull = (label) => {
  const hit = COURSE_THEMES.find((c) => String(label).includes(c.match));
  return hit ? themeOf(hit.theme) : null;
};
export const courseTheme = (label) => courseThemeOrNull(label) || themeOf(DEFAULT_THEME);

// 授業の色の上に、ダークのときだけ薄く暗くする層を重ねる(色は変えず、明度だけ下げる)
export const shaded = (gradient) => `linear-gradient(var(--tag-shade), var(--tag-shade)), ${gradient}`;
