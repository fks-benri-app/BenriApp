import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAnnouncements } from '../lib/announcements';
import { ensureSubscription, getDevicePushEnabled } from '../lib/onesignal';
import { usePushBroken, usePushKey, usePushSubs, useDeviceSubscriptionId, judgeDeviceBroken, goRepairNotifications, markPushFixed, isPushRecentlyFixed } from '../lib/pushStatus';
import { useIdentity } from '../auth/identity';
import { THEMES } from '../lib/themes';
import { currentFontSize } from '../lib/fontSize';
import { KIND_OPTIONS, buildCourseOptions, filterAnnouncements } from '../lib/filters';

// ★ assets 内の通常アイコン
import homeIcon from '../assets/images/icons/home.svg';
import calendarIcon from '../assets/images/icons/calendar.svg';
import classIcon from '../assets/images/icons/message-square.svg';
import settingsIcon from '../assets/images/icons/settings.svg';

// ★ assets 内の発光（アクティブ）バージョンアイコン
import homeActiveIcon from '../assets/images/icons/home-active.svg';
import calendarActiveIcon from '../assets/images/icons/calendar-active.svg';
import classActiveIcon from '../assets/images/icons/message-square-active.svg';
import settingsActiveIcon from '../assets/images/icons/settings-active.svg';

// ★ ヘッダー用アイコン
import searchIcon from '../assets/images/icons/search.svg';
import bellIcon from '../assets/images/icons/bell.svg';
import bellOffIcon from '../assets/images/icons/bell-off.svg';
import readAllIcon from '../assets/images/icons/read-all.svg';

const TABS = [
  { id: 'home', label: 'ホーム', icon: homeIcon, activeIcon: homeActiveIcon },
  { id: 'calendar', label: 'カレンダー', icon: calendarIcon, activeIcon: calendarActiveIcon },
  { id: 'class', label: 'お知らせ', icon: classIcon, activeIcon: classActiveIcon },
  { id: 'settings', label: '設定', icon: settingsIcon, activeIcon: settingsActiveIcon },
];

const FILTERS = [
  { id: 'all', label: 'すべて' },
  { id: 'unread', label: '未読' },
  { id: 'read', label: '既読' },
  { id: 'test', label: 'テスト関連' },
  { id: 'festival', label: 'とんぼ祭関連' },
];

// Classroom の投稿ページを開くURL。
// 学校アカウントで開くため、?authuser=学校のアドレス を付ける。アドレスは画面には出さず、この端末の localStorage にだけ置く。
// 連携ページ(GAS)から戻ってきたとき、アプリのURLの ?school=... で受け取って保存する
// 通知を押して開いたとき、URL の ?open=<お知らせID> でそのお知らせの詳細を開く。
// ルーターがURLを書き換える前に、読み込み時に1回だけ控えておく
let BOOT_OPEN = (() => {
  try { return new URLSearchParams(window.location.search).get('open') || null; } catch { return null; }
})();

// 通知から開く途中(まだ詳細を開いていない)かどうか。起動画面をホームにしても、通知の詳細を開けるようにする
export const bootOpenPending = () => BOOT_OPEN !== null;

const SCHOOL_KEY = 'schoolEmail';
const CLASSROOM_HOME = 'https://classroom.google.com/';

function loadSchoolEmail() {
  try {
    const p = new URLSearchParams(window.location.search).get('school');
    if (p && /^[^\s@]+@[^\s@]+$/.test(p)) {
      localStorage.setItem(SCHOOL_KEY, p);
      // アドレスをURLに残さない
      const u = new URL(window.location.href);
      u.searchParams.delete('school');
      window.history.replaceState(null, '', u.toString());
    }
    return localStorage.getItem(SCHOOL_KEY) || '';
  } catch {
    return '';
  }
}

function classroomUrl(link, email) {
  let target = String(link || '').replace(/&amp;/g, '&').trim();
  try {
    const u = new URL(target);
    // Google の転送URL(google.com/url?q=...)に包まれていたら、中身を取り出す
    if (u.hostname.endsWith('google.com') && u.pathname === '/url') {
      target = u.searchParams.get('q') || u.searchParams.get('url') || '';
    }
    if (new URL(target).hostname !== 'classroom.google.com') target = CLASSROOM_HOME;
  } catch {
    target = CLASSROOM_HOME;
  }
  // 課題(a)・資料(m)・お知らせ(p)の投稿ページは、末尾に /details がないと一覧になるので付ける
  try {
    const t = new URL(target);
    t.pathname = t.pathname.replace(/\/+$/, '').replace(/^(\/c\/[^/]+\/(?:a\vert{}m\vert{}p)\/[^/]+)$/, '$1/details');
    target = t.toString();
  } catch {
    /* そのまま */
  }
  if (!email) return target; // アドレスが分からないときは、そのまま開く
  // 投稿ページの末尾(/details)はそのままに、?authuser=学校のアドレス を付けて開く
  const u = new URL(target);
  u.search = '';
  u.hash = '';
  u.searchParams.set('authuser', email);
  return u.toString();
}

// Classroom の投稿ページを、今のアプリの画面からそのまま開く(新しいタブは作らない)。
// 戻る操作は、ブラウザ(端末)の戻るで、アプリに戻る想定
// 学校のアドレスを、生徒の情報(users/{studentId} の schoolEmail)から読む(短期の仕組み)。
// 読めないときは、この端末に保存された値を使う
function useSchoolEmail(studentId) {
  const [email, setEmail] = useState('');
  useEffect(() => {
    if (!studentId) return undefined;
    return onSnapshot(
      doc(db, 'users', studentId),
      (snap) => {
        const v = snap.exists() ? snap.data().schoolEmail : '';
        setEmail(typeof v === 'string' && v ? v : loadSchoolEmail());
      },
      () => setEmail(loadSchoolEmail())
    );
  }, [studentId]);
  return email || loadSchoolEmail();
}

// Classroom の投稿ページを開く。新しいタブは作らず、今の画面から移動する。
// (Android のホーム画面アプリでは、アプリ内の表示(閉じるとアプリに戻る)で開く。タブが増えない)
function openExternal(url) {
  window.location.href = url;
}

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

// カードに出す形式の名前
const KIND_LABELS = Object.fromEntries(KIND_OPTIONS.map((k) => [k.id, k.label]));

const themeOf = (name) => THEMES[name] || THEMES[DEFAULT_THEME];
// 当てはまる色がなければ null
export const courseThemeOrNull = (label) => {
  const hit = COURSE_THEMES.find((c) => String(label).includes(c.match));
  return hit ? themeOf(hit.theme) : null;
};
const courseTheme = (label) => courseThemeOrNull(label) || themeOf(DEFAULT_THEME);

// プルダウン(授業・形式)。スマホでは端末標準の選択画面が開く
// 文字サイズを16px未満にすると、iPhoneで押したときに画面が拡大されてしまうため16pxにしている
const chevron = (color) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${color}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

// 授業の色の上に、ダークのときだけ薄く暗くする層を重ねる(色は変えず、明度だけ下げる)
export const shaded = (gradient) => `linear-gradient(var(--tag-shade), var(--tag-shade)), ${gradient}`;
// theme: 選んでいるときの色 { gradient, textColor }
function FilterSelect({ value, onChange, allLabel, options, label, theme, fontPx }) {
  const isActive = value !== '';
  const onColor = theme.chevron || (theme.textColor === 'white' ? '%23FFFFFF' : '%23111827');
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        flex: '0 1 auto',
        minWidth: 0,
        maxWidth: '50%',
        height: '32px',
        padding: '0 28px 0 12px',
        border: isActive ? '1px solid transparent' : '1px solid var(--line)',
        borderRadius: '10px',
        backgroundColor: isActive ? 'transparent' : 'var(--surface)',
        backgroundImage: isActive
          ? `${chevron(onColor)}, ${shaded(theme.gradient)}`
          : chevron('%236B7280'),
        backgroundRepeat: 'no-repeat',
        // 選択中の背景は3層(矢印 / 暗くする層 / グラデーション)。位置とサイズも3つ分そろえる
        backgroundPosition: isActive ? 'right 9px center, 0 0, 0 0' : 'right 9px center',
        backgroundSize: isActive ? '13px, 100% 100%, 100% 100%' : '13px',
        color: isActive ? theme.textColor : 'var(--text-muted)',
        fontSize: `${fontPx}px`,
        fontWeight: isActive ? 700 : 400,
        fontFamily: 'inherit',
        textOverflow: 'ellipsis',
        boxSizing: 'border-box',
        WebkitAppearance: 'none',
        appearance: 'none',
        outline: 'none',
        cursor: 'pointer',
        touchAction: 'manipulation'
      }}
    >
      <option value="" style={{ color: 'var(--text-strong)', background: 'var(--surface)' }}>{allLabel}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id} style={{ color: 'var(--text-strong)', background: 'var(--surface)' }}>{o.label}</option>
      ))}
    </select>
  );
}

// 横スクロールの行に出る灰色のバーを隠す(スクロールはできる)
// ===== 開発用モック(コード上のスイッチ。false なら一切表示されず、本番に影響しない) =====
const DEV_MOCK = false;
const MOCK_THUMB = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='88' height='72'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%2377b3ff'/><stop offset='1' stop-color='%23ff9acb'/></linearGradient></defs><rect width='88' height='72' fill='url(%23g)'/></svg>";
const MOCK_ITEMS = [
  {
    id: '__mock_list', subject: '倫理', teacher: '秋本裕子', courseKey: '倫理', courseLabel: '倫理',
    courseFull: '倫理_２Ｆ', kind: 'announcement', time: '10月15日', isUnread: true, tag: 'general',
    content: '【モック】一問一答の箇条書き', body: '', due: '', link: 'https://classroom.google.com/c/AAA/p/DDD', attachments: [],
    rawBody: 'プリント１２一問一答解答\n1.     \n功利主義\n\n\n2.     \n功利性の原理\n\n\n3.     \n最大多数の最大幸福\n\n\n10.   \n他者危害の原則\n\nプリント１３一問一答解答\n1.     \nヘーゲル\n2.     \n絶対精神\n3.     \n「世界史は自由の意識の進歩」\n9.     \n欲望の体系\n10.   \n人倫の喪失態\n\n\n\n\n\n\n11.   \n人倫の完成態\n\nプリントNo13の一問一答答えです\n\n1ヘーゲル\n2絶対精神\n3「世界史は自由の意識の進歩」\n4弁証法\n5反，ジンテーゼ\n\n来週は10月25日に実施します。',
  },
  {
    id: '__mock_attach', subject: '古典', teacher: '召田義一', courseKey: '古典', courseLabel: '古典',
    courseFull: '古典＿２Ｆ', kind: 'announcement', time: '10月16日', isUnread: true, tag: 'general',
    content: '【モック】添付つきのお知らせ', body: '', due: '', link: 'https://classroom.google.com/c/AAA/p/BBB',
    rawBody: 'https://forms.gle/xZbA5yp8aYTGonGG8\n来年度科目選択のフォーム入力が未入力の人に送信しています。\n\nこちらへ入力をお願いします。\n    (空白と改行はそのまま表示されます)\n\n【持ち物】\n1. 筆記用具\n2. 問題集(p.40-45を解いておく。長い説明が折り返されても番号の下にそろいます)\n3. 体育館シューズ\n\n①集合は8時30分 ②解散は15時',
    attachments: [
      { type: 'drive', title: '2026w_poster.pdf', url: 'https://drive.google.com/file/d/xxx/view' },
      { type: 'drive', title: '2026年7月9日（8:39）.jpg', url: 'https://drive.google.com/file/d/yyy/view', thumb: MOCK_THUMB },
      { type: 'drive', title: '読み込めない画像.png', url: 'https://drive.google.com/file/d/zzz/view', thumb: 'https://invalid.example/none.png' },
      { type: 'link', title: 'https://example.com/info', url: 'https://example.com/info' },
      { type: 'youtube', title: '解説動画', url: 'https://www.youtube.com/watch?v=xxx' },
    ],
  },
  {
    id: '__mock_assign', subject: '数学', teacher: 'テスト先生', courseKey: '数学', courseLabel: '数学',
    courseFull: '数学_２Ｆ', kind: 'assignment', time: '昨日 18:30', isUnread: true, tag: 'general',
    content: '【モック】期限つきの課題\n期限: 10月31日', body: '',
    due: '10月31日', link: 'https://classroom.google.com/c/AAA/a/CCC', attachments: [],
    postTitle: '問題集 p.40-45', rawBody: '解いて提出してください。\n分からない所は質問すること。',
  },
];

const NO_SCROLLBAR_CSS = '.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}';

// ===== 詳細画面(カードを押すと開く小窓。Classroom の投稿ページの見た目に合わせてある) =====
function withAuthuser(url, email) {
  try {
    const u = new URL(url);
    if (email && /(^|\.)google\.com$/.test(u.hostname) && !u.searchParams.has('authuser')) u.searchParams.set('authuser', email);
    return u.toString();
  } catch { return url; }
}

// アイコン(Material Symbols 系のパス。差し替えるときはここだけ直す)
const ICON_PATHS = {
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  open: 'M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
  announcement: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
  assignment: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
  material: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z',
  file: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
  link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
  youtube: 'M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  doneAll: 'M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z',
  form: 'M3 3v18h18V3H3zm7 14H6v-2h4v2zm0-4H6v-2h4v2zm0-4H6V7h4v2zm8 8h-6v-2h6v2zm0-4h-6v-2h6v2zm0-4h-6V7h6v2z',
};

function Icon({ name, size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" focusable="false" style={{ display: 'block', flexShrink: 0 }}>
      <path d={ICON_PATHS[name] || ICON_PATHS.file} />
    </svg>
  );
}

// 投稿の種類ごとの丸いアイコンの色(Classroom の配色)
const POST_STYLES = {
  announcement: { icon: 'announcement', bg: '#e7f2ff', fg: '#1157ce' },
  assignment: { icon: 'assignment', bg: '#d0e4ff', fg: '#04409f' },
  material: { icon: 'material', bg: '#ffdcc3', fg: '#9a4600' },
  other: { icon: 'announcement', bg: '#e3e3e3', fg: '#1b1b1c' },
};

const GOOGLE_FONT = "'Google Sans', Roboto, 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', Arial, sans-serif";
const URL_RE = /(https?:\/\/[^\s<>"' ]+)/g;

// 本文は整形せず、そのまま出す(改行・空白は保つ)。URL だけリンクにする。
// 例外: 番号つきの行が2行以上つづく所は、番号をそろえた箇条書きにする。次の形に対応
//   「1.功利主義」「1)」「（1）」「①」(番号のあとに文章)
//   「1.」だけの行のあとに文章が来る形(Word からの貼り付けなど。間の空行は詰める)
//   「1ヘーゲル」のように区切りなしで1から順に並ぶ形
const NUM_RE = '[0-9０-９]{1,3}';
const LIST_RE = new RegExp('^[ \\t\\u3000]*(' + NUM_RE + '(?:[.．](?![0-9０-９])|[)）、])|[（(]' + NUM_RE + '[)）]|[①-⑳])[ \\t\\u3000]*(\\S.*)$');
const MARKER_ONLY_RE = new RegExp('^[ \\t\\u3000]*(' + NUM_RE + '(?:[.．]|[)）、])|[（(]' + NUM_RE + '[)）]|[①-⑳])[ \\t\\u3000]*$');
const PLAIN_NUM_RE = new RegExp('^[ \\t\\u3000]*(' + NUM_RE + ')(?![0-9０-９.．)）、])[ \\t\\u3000]*([^0-9０-９\\s月日年時分秒%％:：/／\\-].*)$');

function markerNumber(marker) {
  const c = marker.charCodeAt(0);
  if (c >= 0x2460 && c <= 0x2473) return c - 0x2460 + 1; // ①-⑳
  const d = marker.replace(/[^0-9０-９]/g, '').replace(/[０-９]/g, (x) => String(x.charCodeAt(0) - 0xFF10));
  return d ? parseInt(d, 10) : NaN;
}

const isBlank = (l) => l.trim() === '';

// lines[i] から始まる箇条書きの1項目を読む。読めなければ null
function parseItem(lines, i) {
  const line = lines[i];
  let m = LIST_RE.exec(line);
  if (m) return { kind: 'marked', n: markerNumber(m[1]), marker: m[1], body: m[2].trim(), next: i + 1 };
  m = MARKER_ONLY_RE.exec(line);
  if (m) {
    let j = i + 1;
    while (j < lines.length && isBlank(lines[j])) j += 1;
    if (j < lines.length && !MARKER_ONLY_RE.test(lines[j]) && !LIST_RE.test(lines[j])) {
      return { kind: 'marked', n: markerNumber(m[1]), marker: m[1], body: lines[j].trim(), next: j + 1 };
    }
    return null;
  }
  m = PLAIN_NUM_RE.exec(line);
  if (m) {
    const n = parseInt(m[1].replace(/[０-９]/g, (x) => String(x.charCodeAt(0) - 0xFF10)), 10);
    return { kind: 'plain', n, marker: `${n}.`, body: m[2].trim(), next: i + 1 };
  }
  return null;
}

// lines[i] から始まる箇条書きを集める。2項目に満たなければ null
function collectList(lines, i) {
  const items = [];
  let j = i;
  let prevN = null;
  while (j < lines.length) {
    let it = parseItem(lines, j);
    if (!it && items.length > 0) {
      // 空行をはさんで、次の番号(前の番号+1)が来ていれば同じ箇条書きとして続ける
      let k = j;
      while (k < lines.length && isBlank(lines[k])) k += 1;
      if (k > j && k < lines.length) {
        const it2 = parseItem(lines, k);
        if (it2 && (it2.kind === 'plain' ? it2.n === prevN + 1 : it2.n > prevN)) it = it2;
      }
    }
    if (!it) break;
    if (items.length === 0 && it.kind === 'plain' && it.n !== 1) break; // 区切りなしは1から始まるものだけ
    if (items.length > 0 && (it.kind === 'plain' || items[items.length - 1].kind === 'plain') && it.n !== prevN + 1) break;
    items.push(it);
    prevN = it.n;
    j = it.next;
  }
  return items.length >= 2 ? { items, end: j } : null;
}

function Linkified({ text, onOpenUrl }) {
  const parts = String(text || '').split(URL_RE);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={p}
        onClick={(e) => { e.preventDefault(); onOpenUrl(p); }}
        style={{ color: 'var(--link)', textDecoration: 'underline' }}
      >
        {p}
      </a>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    )
  );
}

function PostText({ text, onOpenUrl }) {
  const lines = String(text || '').split(/\r?\n/);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const list = collectList(lines, i);
    if (list) {
      blocks.push({ list: list.items, key: i });
      i = list.end;
      continue;
    }
    blocks.push({ line: lines[i], key: i });
    i += 1;
  }
  return blocks.map((b) =>
    b.list ? (
      <div key={b.key} style={{ margin: '4px 0' }}>
        {b.list.map((it, k) => (
          <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', paddingLeft: '8px' }}>
            <span style={{ flexShrink: 0, minWidth: '2em', textAlign: 'right' }}>{it.marker}</span>
            <span style={{ flex: 1, minWidth: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              <Linkified text={it.body} onOpenUrl={onOpenUrl} />
            </span>
          </div>
        ))}
      </div>
    ) : (
      <div key={b.key} style={{ minHeight: '20px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        <Linkified text={b.line} onOpenUrl={onOpenUrl} />
      </div>
    )
  );
}

function attachmentLabel(f) {
  if (f.type === 'youtube') return 'YouTube';
  if (f.type === 'link') return 'リンク';
  if (f.type === 'form') return 'Google フォーム';
  const ext = (String(f.title || '').match(/\.([A-Za-z0-9]{2,5})$/) || [])[1]?.toLowerCase();
  const map = { pdf: 'PDF', jpg: '画像', jpeg: '画像', png: '画像', gif: '画像', heic: '画像', doc: 'Word', docx: 'Word', xls: 'Excel', xlsx: 'Excel', ppt: 'PowerPoint', pptx: 'PowerPoint', mp4: '動画', mov: '動画' };
  return map[ext] || 'Google ドライブ';
}

function AttachmentCard({ f, onOpenUrl }) {
  const iconName = f.type === 'youtube' ? 'youtube' : f.type === 'link' ? 'link' : f.type === 'form' ? 'form' : 'file';
  // サムネイル(画像など)があれば、アイコンの代わりに出す。読み込めなかったらアイコンに戻す
  const [thumbFailed, setThumbFailed] = useState(false);
  const showThumb = !!f.thumb && !thumbFailed;
  return (
    <button
      type="button"
      onClick={() => onOpenUrl(f.url)}
      style={{
        display: 'flex', alignItems: 'stretch', width: '100%', minHeight: '72px', padding: 0, textAlign: 'left',
        background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: '8px', overflow: 'hidden',
        cursor: 'pointer', font: 'inherit', color: 'inherit', touchAction: 'manipulation'
      }}
    >
      <span style={{ width: '88px', flexShrink: 0, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-body)', borderRight: '1px solid var(--line-strong)', position: 'relative' }}>
        {showThumb ? (
          <img
            src={f.thumb}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setThumbFailed(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Icon name={iconName} size={32} />
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
        <span style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: 'var(--text-strong)', wordBreak: 'break-all' }}>{f.title || f.url}</span>
        <span style={{ fontSize: '12px', lineHeight: '16px', color: 'var(--text-body)' }}>{attachmentLabel(f)}</span>
      </span>
    </button>
  );
}

const SHEET_CSS = '@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}';

function DetailView({ ann, onBack, onOpenClassroom, onOpenUrl }) {
  const style = POST_STYLES[ann.kind] || POST_STYLES.other;
  const attachments = ann.attachments || [];
  const isAnnouncement = ann.kind === 'announcement';
  // 本家と同じ: お知らせの見出しは「お知らせ」、課題・資料は投稿のタイトル
  const heading = isAnnouncement ? 'お知らせ' : (ann.postTitle || ann.title || KIND_LABELS[ann.kind] || '投稿');
  const text = ann.rawBody || (isAnnouncement ? (ann.body || ann.content) : (ann.bodyOnly || ''));
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', fontFamily: GOOGLE_FONT }}
    >
      <style>{SHEET_CSS}</style>
      {/* 後ろの暗い部分(押すと閉じる) */}
      <div onClick={onBack} style={{ position: 'absolute', inset: 0, background: 'var(--overlay)', animation: 'fadeIn .18s ease-out' }} />
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column', background: 'var(--surface)',
        height: 'calc(100% - max(2.2rem, env(safe-area-inset-top)))', borderRadius: '16px 16px 0 0',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'sheetUp .22s ease-out'
      }}>
        <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 8px 8px 8px', borderBottom: '1px solid #e3e3e3' }}>
          <button type="button" onClick={onBack} aria-label="閉じる" style={{ width: '48px', height: '48px', border: 'none', background: 'transparent', borderRadius: '50%', color: 'var(--text-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
            <Icon name="close" />
          </button>
          <div style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 500, color: 'var(--text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ann.courseFull || ann.subject}
          </div>
          <button type="button" onClick={onOpenClassroom} aria-label="Classroomで開く" style={{ width: '48px', height: '48px', border: 'none', background: 'transparent', borderRadius: '50%', color: 'var(--text-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
            <Icon name="open" />
          </button>
        </header>

        <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '24px 16px calc(24px + env(safe-area-inset-bottom))' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            {/* 見出し: 丸いアイコン + タイトル */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: style.bg, color: style.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', flexShrink: 0 }}>
                <Icon name={style.icon} size={24} />
              </div>
              <h1 style={{ margin: 0, fontSize: '28px', lineHeight: '36px', fontWeight: 400, color: 'var(--text-strong)', overflowWrap: 'anywhere' }}>{heading}</h1>
            </div>
            {/* 投稿者 • 日付 (+ 期限) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: '8px', rowGap: '8px', marginBottom: '16px', fontSize: '14px', lineHeight: '20px', color: 'var(--text-body)' }}>
              {ann.teacher && <span>{ann.teacher}</span>}
              {ann.teacher && <span aria-hidden="true">•</span>}
              <span>{ann.time}</span>
              {ann.due && <span style={{ marginLeft: 'auto', color: 'var(--text-strong)' }}>期限: {ann.due}</span>}
            </div>
            <div style={{ borderBottom: '1px solid var(--line-strong)', marginBottom: '16px' }} />

            {/* 本文: 整形なし */}
            {text && (
              <div style={{ marginBottom: '16px', fontSize: '14px', lineHeight: '20px', color: 'var(--text-strong)' }}>
                <PostText text={text} onOpenUrl={onOpenUrl} />
              </div>
            )}

            {/* 添付 */}
            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {attachments.map((f, i) => <AttachmentCard key={i} f={f} onOpenUrl={onOpenUrl} />)}
              </div>
            )}

            <button
              type="button"
              onClick={onOpenClassroom}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '10px 24px', borderRadius: '100px', border: '1px solid #747775', background: 'var(--surface)', color: 'var(--link)', fontFamily: 'inherit', fontSize: '14px', fontWeight: 500, cursor: 'pointer', touchAction: 'manipulation' }}
            >
              <Icon name="open" size={18} />
              Classroomで開く
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Class() {
  const navigate = useNavigate();
  const { identity } = useIdentity();
  const real = useAnnouncements(identity?.id);
  const { markRead, markAllRead } = real;
  // 開発用: DEV_MOCK を true にすると、先頭にモックが加わる(本番は false のまま)
  const status = DEV_MOCK ? 'ready' : real.status;
  const items = useMemo(
    () => (DEV_MOCK ? [...MOCK_ITEMS.map((m) => ({ ...m, isUnread: !real.readIds.has(m.id) })), ...real.items] : real.items),
    [real.items, real.readIds]
  );
  const schoolEmail = useSchoolEmail(identity?.id);
  // 通知が届いていない可能性: GAS が確認した購読の一覧があれば、この端末の購読で判断する(端末ごと)
  const pushBrokenSend = usePushBroken(identity?.id);
  const pushSubs = usePushSubs(identity?.id);
  const ownSubId = useDeviceSubscriptionId(pushSubs);
  const pushBroken = judgeDeviceBroken(pushSubs, ownSubId, pushBrokenSend);
  const pushKey = usePushKey(identity?.id);

  // 開くたびに、この端末の通知の購読が正しい状態か確認する(ずれていれば付け直す)
  useEffect(() => {
    if (!pushKey) return;
    ensureSubscription(pushKey).then((r) => { if (r && r.changed) markPushFixed(); }).catch(() => {});
  }, [pushKey]);

  // 詳細画面。端末の戻るボタンでも、一覧に戻れるように、履歴(history)に積む
  const [detailId, setDetailId] = useState(() => window.history.state?.__detail ?? BOOT_OPEN ?? null);
  useEffect(() => {
    const onPop = () => setDetailId(window.history.state?.__detail ?? null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // 通知から開いた場合: URL をきれいにして、戻るで一覧に戻れるよう履歴を1つ積む
  useEffect(() => {
    if (!BOOT_OPEN) return;
    const id = BOOT_OPEN;
    BOOT_OPEN = null;
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete('open');
      const base = { ...(window.history.state || {}) };
      delete base.__detail;
      window.history.replaceState(base, '', u.toString());
      window.history.pushState({ ...base, __detail: id }, '', u.toString());
    } catch { /* 履歴が使えなくても詳細は開く */ }
    setDetailId(id);
    markRead(id);
  }, [markRead]);

  const [activeTab, setActiveTab] = useState('class');
  const [activeFilter, setActiveFilter] = useState('all');
  const [course, setCourse] = useState('');
  const [kind, setKind] = useState('');

  // 検索
  const [searchOpen, setSearchOpen] = useState(false);
  // この端末の通知がオンか(オフなら、ベルに斜線を付ける)。画面を開くたびに確かめる
  const [devicePushOn, setDevicePushOn] = useState(true);
  useEffect(() => {
    let alive = true;
    getDevicePushEnabled().then((v) => alive && setDevicePushOn(v)).catch(() => {});
    return () => { alive = false; };
  }, []);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef(null);

  // フォントサイズ基準値（プログラム制御対応）
  const [baseFontSize] = useState(currentFontSize);

  // 授業の選択肢は、手元のお知らせから作る
  const courseOptions = useMemo(() => buildCourseOptions(items), [items]);
  // 選んでいた授業が一覧からなくなったときは「すべて」として扱う
  const courseValue = courseOptions.some((o) => o.id === course) ? course : '';

  // 選んでいる項目の色(プルダウンの背景)
  const courseColor = courseTheme(courseOptions.find((o) => o.id === courseValue)?.label);
  // 形式は無彩色(灰)で表す。選択中でも色を付けない
  const kindColor = { gradient: 'linear-gradient(var(--line), var(--line))', textColor: 'var(--text-strong)', chevron: '%236B7280' };

  const filteredAnnouncements = useMemo(
    () => filterAnnouncements(items, { tag: activeFilter, course: courseValue, kind, query }),
    [items, activeFilter, courseValue, kind, query]
  );

  // 一斉既読: いま一覧に出ている(絞り込み後の)未読をまとめて既読にする
  const unreadShown = useMemo(() => filteredAnnouncements.filter((a) => a.isUnread), [filteredAnnouncements]);
  // 確認は小さなアプリ内の画面で出す(ブラウザの確認ダイアログは、タイトルがサイトのURLになって変えられないため)
  const [readAllAsk, setReadAllAsk] = useState(false);
  function readAllShown() {
    if (unreadShown.length === 0) return;
    setReadAllAsk(true);
  }
  function confirmReadAll() {
    markAllRead(unreadShown.map((a) => a.id));
    setReadAllAsk(false);
  }

  function openSearch() {
    setSearchOpen(true);
    // 表示されてからフォーカスする(スマホではキーボードが開く)
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery('');
  }

  // カードを押したら既読にして、アプリ内の詳細画面を開く(Classroom には移動しない)
  function openAnnouncement(ann) {
    markRead(ann.id);
    window.history.pushState({ ...(window.history.state || {}), __detail: ann.id }, '');
    setDetailId(ann.id);
  }

  function closeDetail() {
    // 詳細を開いた履歴があるときは戻る。ないとき(再読み込みなど)は、その場で一覧に戻す
    if (window.history.state?.__detail) window.history.back();
    else setDetailId(null);
  }

  const detail = detailId ? items.find((a) => a.id === detailId) : null;
  // 一覧に存在しない(削除済みなど)お知らせの詳細は開かない
  useEffect(() => {
    if (detailId && real.status === 'ready' && !detail) setDetailId(null);
  }, [detailId, real.status, detail]);

  const emptyMessage =
    status === 'loading'
      ? ''
      : status === 'error'
        ? '読み込みに失敗しました'
        : query.trim()
          ? `「${query.trim()}」に一致するお知らせはありません`
          : '該当するお知らせはありません';

  return (
    <div style={{
      // 画面に固定する: ヘッダーとナビは常に表示され、<main> の中だけがスクロールする
      position: 'fixed',
      inset: 0,
      margin: 0,
      padding: 0,
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      overflow: 'hidden',
      fontSize: `${baseFontSize}px`,
      WebkitTapHighlightColor: 'transparent',
      WebkitTouchCallout: 'none'
    }}>

      <style>{NO_SCROLLBAR_CSS}</style>

      {/* ===== ヘッダー部分（常に表示） ===== */}
      <header style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.857em',
        paddingTop: 'calc(2em + env(safe-area-inset-top))',
        paddingBottom: '1.143em',
        background: 'var(--surface)',
        width: '100%'
      }}>
        <div style={{
          padding: '0 1.714em',
          height: '34px', // 検索を開いても高さが変わらないよう固定
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.857em'
        }}>
          {searchOpen ? (
            <>
              <input
                ref={searchInputRef}
                type="text"
                inputMode="search"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') closeSearch(); }}
                placeholder="教科・先生・本文で検索"
                aria-label="お知らせを検索"
                enterKeyHint="search"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: '40px',
                  padding: '0 1em',
                  border: 'none',
                  outline: 'none',
                  borderRadius: '0.857em',
                  background: 'var(--surface-2)',
                  color: 'var(--text-strong)',
                  fontSize: '16px', // 16px未満だと iPhone でフォーカス時に画面が拡大される
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  WebkitAppearance: 'none'
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={closeSearch}
                onKeyDown={(e) => { if (e.key === 'Enter') closeSearch(); }}
                style={{
                  flexShrink: 0,
                  color: 'var(--text-muted)',
                  fontSize: '1em',
                  fontWeight: '600',
                  cursor: 'pointer',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'manipulation'
                }}
              >
                キャンセル
              </div>
            </>
          ) : (
            <>
              <div style={{
                color: 'var(--text-strong)',
                fontSize: '1.871em',
                fontFamily: 'Inter',
                fontWeight: '800',
                userSelect: 'none'
              }}>
                お知らせ
              </div>

              {/* 右上アイコン */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9em', flexShrink: 0 }}>
                {/* 一斉既読(ベル・検索と同じ並び。未読がないときは薄くして押せなくする) */}
                <button
                  type="button"
                  onClick={readAllShown}
                  disabled={unreadShown.length === 0}
                  aria-label="表示中の未読をすべて既読にする"
                  title="表示中の未読をすべて既読にする"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '1.571em', height: '1.571em', padding: 0, border: 'none', background: 'transparent',
                    fontSize: 'inherit', opacity: unreadShown.length === 0 ? 0.35 : 1,
                    cursor: unreadShown.length === 0 ? 'default' : 'pointer', touchAction: 'manipulation'
                  }}
                >
                  <img className="icon-ink" src={readAllIcon} alt="" aria-hidden="true" draggable={false} style={{ width: '100%', height: '100%' }} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/settings/notify', { state: { from: '/class' } })}
                  aria-label={devicePushOn ? '通知設定' : '通知設定(この端末はオフ)'}
                  title={devicePushOn ? '通知設定' : '通知設定(この端末はオフ)'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2.5em',
                    height: '1.571em',
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    fontSize: 'inherit', // ボタンは既定で文字サイズを継承しないため、em の基準を揃える
                    color: 'var(--text-body)',
                    cursor: 'pointer',
                    touchAction: 'manipulation'
                  }}
                >
                  <img
                    className="icon-ink"
                    src={devicePushOn ? bellIcon : bellOffIcon}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    style={{ width: '1.571em', height: '1.571em', objectFit: 'contain', display: 'block' }}
                  />
                </button>
                <img
                  draggable={false}
                  role="button"
                  tabIndex={0}
                  onClick={openSearch}
                  onKeyDown={(e) => { if (e.key === 'Enter') openSearch(); }}
                  style={{
                    width: '1.571em',
                    height: '1.571em',
                    cursor: 'pointer',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    touchAction: 'manipulation'
                  }}
                  className="icon-ink"
                  src={searchIcon}
                  alt="検索"
                />
              </div>
            </>
          )}
        </div>

        {/* フィルターボタン */}
        <div className="no-scrollbar" style={{ padding: '0.571em 1.714em', display: 'flex', gap: '0.571em', overflowX: 'auto' }}>
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <div
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                style={{
                  padding: '0.571em 1.143em',
                  borderRadius: '0.857em',
                  flexShrink: 0,
                  cursor: 'pointer',
                  backgroundImage: isActive ? shaded('linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)') : 'none',
                  backgroundColor: isActive ? 'transparent' : 'var(--surface)',
                  outline: isActive ? 'none' : '1px var(--line) solid',
                  outlineOffset: '-1px',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  fontSize: '1em',
                  fontWeight: isActive ? '700' : '400',
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'manipulation'
                }}
              >
                {filter.label}
              </div>
            );
          })}
        </div>

        {/* プルダウン: 授業・形式 */}
        <div style={{ padding: '0 1.714em', display: 'flex', gap: '0.571em', marginTop: '-0.476em' }}>
          <FilterSelect fontPx={baseFontSize}
            label="授業で絞り込み"
            value={courseValue}
            onChange={setCourse}
            allLabel="すべての授業"
            theme={courseColor}
            options={courseOptions}
          />
          <FilterSelect fontPx={baseFontSize}
            label="形式で絞り込み"
            value={kind}
            onChange={setKind}
            allLabel="すべての形式"
            theme={kindColor}
            options={KIND_OPTIONS}
          />
        </div>
      </header>

      {/* ===== メインコンテンツ部分（ここだけスクロールする） ===== */}
      <main style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        padding: '0.857em 1.714em',
        width: '100%',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '0.857em',
        alignContent: 'start'
      }}>
        {pushBroken && !isPushRecentlyFixed() && (
          <div style={{
            gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.8em', flexWrap: 'wrap',
            padding: '0.8em 1em', background: 'var(--warn-bg)', border: '1px solid var(--warn-line)',
            borderRadius: '0.6em', color: 'var(--warn-fg)', fontSize: '0.9em', lineHeight: '1.5em'
          }}>
            <span style={{ flex: '1 1 14em' }}>この端末に通知が届いていない可能性があります。</span>
            <button
              type="button"
              onClick={goRepairNotifications}
              style={{
                padding: '0.5em 1em', border: 'none', borderRadius: '999px', background: 'var(--ink)',
                color: 'var(--on-ink)', fontSize: '1em', fontWeight: 600, cursor: 'pointer', touchAction: 'manipulation'
              }}
            >
              通知を直す
            </button>
          </div>
        )}
        {filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((ann) => {
            return (
              <article
                key={ann.id}
                role="link"
                tabIndex={0}
                onClick={() => openAnnouncement(ann)}
                onKeyDown={(e) => { if (e.key === 'Enter') openAnnouncement(ann); }}
                style={{
                  position: 'relative',
                  padding: ann.isUnread ? 'calc(1.143em - 1.5px)' : '1.143em',
                  border: ann.isUnread ? '1.5px solid transparent' : 'none',
                  background: ann.isUnread
                    ? 'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%) border-box'
                    : 'var(--surface-2)', // 背景より一段だけ濃い面(枠線の色よりなじませる)
                  borderRadius: '1.143em',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.857em',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'manipulation'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.571em' }}>
                    <div style={{
                      padding: '0.286em 0.571em',
                      background: shaded(courseThemeOrNull(ann.subject)?.gradient || 'var(--line)'),
                      borderRadius: '0.429em'
                    }}>
                      <div style={{
                        color: courseThemeOrNull(ann.subject)?.textColor || 'var(--text-strong)',
                        fontSize: '0.786em',
                        fontWeight: '700'
                      }}>
                        {ann.subject}
                      </div>
                    </div>
                    {KIND_LABELS[ann.kind] && (
                      <div style={{
                        padding: '0.286em 0.571em',
                        borderRadius: '0.429em',
                        background: 'var(--line)', // 種別は無彩色にして、授業の色だけを目立たせる
                        color: 'var(--text-body)',
                        fontSize: '0.786em',
                        fontWeight: '700'
                      }}>
                        {KIND_LABELS[ann.kind]}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.429em' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.786em', fontWeight: '400', position: 'relative', top: '-0.214em' }}>
                      {ann.time}
                    </div>
                    {ann.isUnread && (
                      <div style={{ width: '0.571em', height: '0.571em', background: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', borderRadius: '50%' }} />
                    )}
                  </div>
                </div>
                <div style={{ color: 'var(--text-body)', fontSize: '1em', fontWeight: 400, lineHeight: 1.4286, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {ann.content}
                </div>
              </article>
            );
          })
        ) : (
          <div style={{ padding: '3em 0', textAlign: 'center', color: 'var(--text-faint)', gridColumn: '1 / -1', userSelect: 'none' }}>
            {emptyMessage}
          </div>
        )}
      </main>

      {/* ===== ボトムナビゲーション部分（常に表示） ===== */}
      <nav style={{
        flexShrink: 0,
        padding: '0 1.143em env(safe-area-inset-bottom)',
        height: 'calc(4.571em + env(safe-area-inset-bottom))',
        background: 'var(--surface)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => (tab.id === 'settings' ? navigate('/settings') : tab.id === 'home' ? navigate('/') : setActiveTab(tab.id))}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.214em',
                width: '5.714em',
                cursor: 'pointer',
                padding: '0.4em 0',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'manipulation'
              }}
            >
              {/* アニメーションなし: 押した瞬間に切り替わる */}
              <img
                draggable={false}
                style={{
                  width: '1.5em',
                  height: '1.5em',
                  opacity: isActive ? 1 : 0.45
                }}
                className={isActive ? 'icon-active' : 'icon-ink'}
                src={isActive ? tab.activeIcon : tab.icon}
                alt={tab.id}
              />
              <div style={{
                color: isActive ? 'var(--text-strong)' : 'var(--text-muted)',
                fontSize: '0.786em',
                fontWeight: '600'
              }}>
                {tab.label}
              </div>
            </div>
          );
        })}
      </nav>

      {readAllAsk && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: GOOGLE_FONT }}>
          <div onClick={() => setReadAllAsk(false)} style={{ position: 'absolute', inset: 0, background: 'var(--overlay)' }} />
          <div role="dialog" aria-modal="true" style={{ position: 'relative', width: '100%', maxWidth: '22.857em', background: 'var(--surface)', borderRadius: '1.143em', padding: '1.714em', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '1.286em', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '0.444em' }}>すべて既読にしますか?</div>
            <div style={{ fontSize: '1em', lineHeight: '1.43em', color: 'var(--text-muted)', marginBottom: '1.43em' }}>表示中の未読 {unreadShown.length} 件を既読にします。</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.571em' }}>
              <button type="button" onClick={() => setReadAllAsk(false)} style={{ padding: '0.714em 1.143em', border: 'none', background: 'transparent', color: 'var(--text-muted)', borderRadius: '999px', fontFamily: 'inherit', fontSize: '1em', fontWeight: 600, cursor: 'pointer' }}>キャンセル</button>
              <button type="button" onClick={confirmReadAll} style={{ padding: '0.714em 1.143em', border: 'none', background: 'var(--ink)', color: 'var(--on-ink)', borderRadius: '999px', fontFamily: 'inherit', fontSize: '1em', fontWeight: 600, cursor: 'pointer' }}>既読にする</button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <DetailView
          ann={detail}
          onBack={closeDetail}
          onOpenClassroom={() => openExternal(classroomUrl(detail.link, schoolEmail))}
          onOpenUrl={(u) => openExternal(withAuthuser(u, schoolEmail))}
        />
      )}
    </div>
  );
}