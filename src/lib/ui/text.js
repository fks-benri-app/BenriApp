// 画面に出す文章の取り出し口。文章そのものは src/data/text.json にまとめてある。
// t('link.offline') のように、ドット区切りの名前で呼ぶ。{name} の部分は、第2引数で差し替える。
import text from '../../data/text.json';

export function t(key, vars) {
  const value = key.split('.').reduce((obj, k) => (obj ? obj[k] : undefined), text);
  if (value === undefined) return key; // 名前を間違えたときは、名前がそのまま出る(気づきやすい)
  if (typeof value !== 'string' || !vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`));
}
