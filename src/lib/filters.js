// 絞り込みに使う関数だけを集めたファイル(Firebase に依存しないので、単体でテストできる)

// 全角/半角・大文字/小文字の違いを無視して検索できるようにそろえる
export const normalize = (s) => String(s || '').normalize('NFKC').toLowerCase();

// ===== 授業 =====
// メールの授業名「２-CF②　体育　2026」→ 表示名「２-CF② 体育」
// (空白を1つにそろえ、末尾の年(2026 / 2026年度)は外す。年が変わっても同じ授業としてまとめるため)
export function courseLabel(courseName) {
  return String(courseName || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*(?:19|20)\d{2}(?:年度)?$/, '')
    .trim();
}

// 絞り込みに使うキー(「２」と「2」のような表記ゆれを同じ授業として扱う)
export function courseKey(courseName) {
  return normalize(courseLabel(courseName));
}

// ===== 形式 =====
export const KIND_OPTIONS = [
  { id: 'announcement', label: 'お知らせ' },
  { id: 'assignment', label: '課題' },
  { id: 'material', label: '資料' },
];

// GAS が保存している category(「新しいお知らせ」「新しい課題」など)から形式を決める。
// 想定外の文言のときは 'other'(「すべての形式」のときだけ表示される)
export function kindOf(category) {
  const c = normalize(category);
  if (/課題|assignment/.test(c)) return 'assignment';
  if (/資料|material/.test(c)) return 'material';
  if (/お知らせ|announcement/.test(c)) return 'announcement';
  return 'other';
}

// ===== 絞り込みメニュー用 =====
// 手元のお知らせから、授業の選択肢を作る(件数つき、名前順)
export function buildCourseOptions(items) {
  const map = new Map();
  for (const a of items) {
    if (!a.courseKey) continue;
    const cur = map.get(a.courseKey);
    if (cur) cur.count += 1;
    else map.set(a.courseKey, { id: a.courseKey, label: a.courseLabel, count: 1 });
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'ja'));
}

/**
 * @param items   useAnnouncements() の items
 * @param filters { tag: 'all'|'unread'|'read'|'test'|'festival', course: ''|キー, kind: ''|形式id, query: string }
 */
export function filterAnnouncements(items, { tag = 'all', course = '', kind = '', query = '' }) {
  const q = normalize(String(query).trim());
  return items.filter((a) => {
    if (tag === 'unread' && !a.isUnread) return false;
    if (tag === 'read' && a.isUnread) return false;
    if ((tag === 'test' || tag === 'festival') && a.tag !== tag) return false;
    if (course && a.courseKey !== course) return false;
    if (kind && a.kind !== kind) return false;
    if (!q) return true;
    return normalize(`${a.subject} ${a.courseLabel} ${a.teacher} ${a.content}`).includes(q);
  });
}

// ===== 表示用の文章の整え =====
const CJK = '\\u3000-\\u303f\\u3040-\\u30ff\\u3400-\\u9fff\\uff00-\\uffef';
const CJK_GAP = new RegExp(`([${CJK}])[ \\t\\u3000]+(?=[${CJK}])`, 'g');
const wideChar = new RegExp(`[${CJK}]`);
const displayWidth = (s) => [...s].reduce((n, c) => n + (wideChar.test(c) ? 2 : 1), 0);

// 日本語どうしの間にある不要な空白を取り除く(メールの折り返しで入ってしまう空白)
export const closeCjkGaps = (s) => String(s || '').replace(CJK_GAP, '$1');

// 本文から URL と、Google のアカウント選択などの案内行を取り除き、空白を整える。
// (URL にはメールアドレスが含まれることがあるため、画面に出さない)
export function cleanText(text) {
  return closeCjkGaps(
    String(text || '')
      .split('\n')
      .map((line) => line.replace(/https?:\/\/\S+/g, '').trim())
      .filter((line) => line && !/AccountChooser|accounts\.google\.com|@g\.nagano-c\.ed\.jp/.test(line))
      .join('\n')
  );
}

// メールの本文は約76桁で折り返されていて、お知らせでは最初の1行が「タイトル」になっている。
// 折り返しの途中で切れた長い1行(文の終わりでない)なら、本文とつなげて1文に戻す
const SENTENCE_END = /[。！？!?」』）)】…:：]$/;
export function joinTitleAndBody(title, body) {
  if (!title) return body;
  if (!body) return title;
  const wrapped = displayWidth(title) >= 56 && !SENTENCE_END.test(title);
  return wrapped ? closeCjkGaps(`${title} ${body}`) : `${title}\n${body}`;
}

// 授業名は、最初の1語だけを表示する(例: 「公共 F講座 岡庭学年」→「公共」)
export function shortCourse(courseName) {
  return courseLabel(courseName).split(' ')[0] || '';
}

// 差出人名「秋本裕子 さん（Classroom）」から「（Classroom）」を取り除く
export function cleanTeacher(name) {
  return String(name || '')
    .replace(/\s*[（(]\s*(?:Google\s*)?Classroom\s*[）)]\s*$/i, '')
    .trim();
}
