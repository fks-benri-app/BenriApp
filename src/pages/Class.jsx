import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAnnouncements } from '../lib/announcements';
import { useIdentity } from '../auth/identity';
import { THEMES } from '../lib/themes';
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

// ★ ヘッダー用（検索アイコン）
import searchIcon from '../assets/images/icons/search.svg';

const TABS = [
  { id: 'home', label: 'ホーム', icon: homeIcon, activeIcon: homeActiveIcon },
  { id: 'calendar', label: 'カレンダー', icon: calendarIcon, activeIcon: calendarActiveIcon },
  { id: 'class', label: 'クラス', icon: classIcon, activeIcon: classActiveIcon },
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
    t.pathname = t.pathname.replace(/\/+$/, '').replace(/^(\/c\/[^/]+\/(?:a|m|p)\/[^/]+)$/, '$1/details');
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
const courseThemeOrNull = (label) => {
  const hit = COURSE_THEMES.find((c) => String(label).includes(c.match));
  return hit ? themeOf(hit.theme) : null;
};
const courseTheme = (label) => courseThemeOrNull(label) || themeOf(DEFAULT_THEME);

// プルダウン(授業・形式)。スマホでは端末標準の選択画面が開く
// 文字サイズを16px未満にすると、iPhoneで押したときに画面が拡大されてしまうため16pxにしている
const chevron = (color) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${color}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

// theme: 選んでいるときの色 { gradient, textColor }
function FilterSelect({ value, onChange, allLabel, options, label, theme }) {
  const isActive = value !== '';
  const onColor = theme.textColor === 'white' ? '%23FFFFFF' : '%23111827';
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
        border: isActive ? '1px solid transparent' : '1px solid #E5E7EB',
        borderRadius: '10px',
        backgroundColor: isActive ? 'transparent' : 'white',
        backgroundImage: isActive
          ? `${chevron(onColor)}, ${theme.gradient}`
          : chevron('%236B7280'),
        backgroundRepeat: 'no-repeat',
        backgroundPosition: isActive ? 'right 9px center, 0 0' : 'right 9px center',
        backgroundSize: isActive ? '13px, 100% 100%' : '13px',
        color: isActive ? theme.textColor : '#6B7280',
        fontSize: '16px',
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
      <option value="" style={{ color: '#111827', background: 'white' }}>{allLabel}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id} style={{ color: '#111827', background: 'white' }}>{o.label}</option>
      ))}
    </select>
  );
}

// 横スクロールの行に出る灰色のバーを隠す(スクロールはできる)
// ===== 開発用モック(コード上のスイッチ。false なら一切表示されず、本番に影響しない) =====
const DEV_MOCK = true;
const MOCK_ITEMS = [
  {
    id: '__mock_attach', subject: '古典', teacher: 'テスト先生', courseKey: '古典', courseLabel: '古典',
    courseFull: '古典＿２Ｆ', kind: 'announcement', time: '今日 09:00', isUnread: true, tag: 'general',
    content: '【モック】添付つきのお知らせ', body: '【モック】添付つきのお知らせ\n添付のPDFとリンクを確認してください。',
    due: '', link: 'https://classroom.google.com/c/AAA/p/BBB',
    attachments: [
      { type: 'drive', title: '2026w_poster.pdf', url: 'https://drive.google.com/file/d/xxx/view' },
      { type: 'link', title: 'https://example.com/info', url: 'https://example.com/info' },
      { type: 'youtube', title: '解説動画', url: 'https://www.youtube.com/watch?v=xxx' },
    ],
  },
  {
    id: '__mock_assign', subject: '数学', teacher: 'テスト先生', courseKey: '数学', courseLabel: '数学',
    courseFull: '数学_２Ｆ', kind: 'assignment', time: '昨日 18:30', isUnread: true, tag: 'general',
    content: '【モック】期限つきの課題\n期限: 10月31日', body: '【モック】期限つきの課題\n問題集 p.40-45 を解いて提出。',
    due: '10月31日', link: 'https://classroom.google.com/c/AAA/a/CCC', attachments: [],
  },
];

const NO_SCROLLBAR_CSS = '.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}';

// ===== 詳細画面(カードを押すと開く。アプリの中で完結し、Classroom には移動しない) =====
const ATTACH_HINT = /添付|資料|PDF|ＰＤＦ|プリント|配布|スライド/i;

function withAuthuser(url, email) {
  try {
    const u = new URL(url);
    if (email && /(^|\.)google\.com$/.test(u.hostname) && !u.searchParams.has('authuser')) u.searchParams.set('authuser', email);
    return u.toString();
  } catch { return url; }
}

const ATTACH_ICON = { drive: '📄', link: '🔗', youtube: '▶️', form: '📝' };

function DetailView({ ann, baseFontSize, onBack, onOpenClassroom, onOpenUrl }) {
  const attachments = ann.attachments || [];
  const hasFullBody = !!ann.body;
  const body = hasFullBody ? ann.body : ann.content;
  const courseT = courseThemeOrNull(ann.subject);
  const mayHaveAttachment = attachments.length === 0 && (ann.kind === 'material' || ATTACH_HINT.test(body));
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontSize: `${baseFontSize}px`,
      WebkitTapHighlightColor: 'transparent'
    }}>
      <header style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '0.857em',
        padding: 'calc(1.143em + env(safe-area-inset-top)) 1.143em 0.857em',
        borderBottom: '1px #F3F4F6 solid'
      }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="戻る"
          style={{
            width: '2.143em',
            height: '2.143em',
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: '#434343',
            cursor: 'pointer',
            flexShrink: 0,
            touchAction: 'manipulation'
          }}
        >
          <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%' }}>
            <path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" />
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.571em', flex: 1, minWidth: 0 }}>
          <div style={{
            padding: '0.286em 0.571em',
            background: courseT?.gradient || '#F3F4F6',
            borderRadius: '0.429em'
          }}>
            <div style={{ color: courseT?.textColor || '#111827', fontSize: '0.786em', fontWeight: '700' }}>
              {ann.subject}
            </div>
          </div>
          {KIND_LABELS[ann.kind] && (
            <div style={{
              padding: '0.286em 0.571em',
              borderRadius: '0.429em',
              background: themeOf(KIND_THEMES[ann.kind]).gradient,
              color: themeOf(KIND_THEMES[ann.kind]).textColor,
              fontSize: '0.786em',
              fontWeight: '700'
            }}>
              {KIND_LABELS[ann.kind]}
            </div>
          )}
        </div>
        <div style={{ color: '#6B7280', fontSize: '0.857em', flexShrink: 0 }}>{ann.time}</div>
      </header>

      <main style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        padding: '1.143em 1.714em'
      }}>
        <div style={{ maxWidth: '40em', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1em' }}>
          {ann.teacher && (
            <div style={{ color: '#6B7280', fontSize: '0.857em' }}>{ann.teacher}</div>
          )}
          <div style={{
            color: '#111827',
            fontSize: '1.0714em',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {body}
          </div>
          {hasFullBody && ann.due && (
            <div style={{
              padding: '0.7em 1em',
              background: '#FFF7ED',
              border: '1px solid #FED7AA',
              borderRadius: '0.6em',
              color: '#C2410C',
              fontSize: '0.929em',
              fontWeight: '600'
            }}>
              期限: {ann.due}
            </div>
          )}
          {attachments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em' }}>
              <div style={{ color: '#6B7280', fontSize: '0.857em', fontWeight: '600' }}>添付ファイル</div>
              {attachments.map((f, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onOpenUrl(f.url)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.7em', textAlign: 'left',
                    padding: '0.8em 1em', background: '#F9FAFB', border: '1px solid #E5E7EB',
                    borderRadius: '0.6em', color: '#111827', fontSize: '0.929em',
                    cursor: 'pointer', font: 'inherit', width: '100%'
                  }}
                >
                  <span aria-hidden="true">{ATTACH_ICON[f.type] || '📎'}</span>
                  <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>{f.title || f.url}</span>
                </button>
              ))}
            </div>
          )}
          <div style={{
            padding: '0.8em 1em',
            background: mayHaveAttachment ? '#FFFBEB' : '#F9FAFB',
            border: `1px solid ${mayHaveAttachment ? '#FCD34D' : '#F3F4F6'}`,
            borderRadius: '0.6em',
            color: mayHaveAttachment ? '#B45309' : '#6B7280',
            fontSize: '0.857em',
            lineHeight: 1.6
          }}>
            {mayHaveAttachment
              ? '添付資料があるかもしれません。ファイルの確認や提出は、下のボタンからClassroomで行ってください。'
              : '添付資料や提出は、下のボタンからClassroomで確認してください。'}
          </div>
        </div>
      </main>

      <footer style={{
        flexShrink: 0,
        padding: '0.857em 1.714em calc(0.857em + env(safe-area-inset-bottom))',
        borderTop: '1px #E5E7EB solid'
      }}>
        <div style={{ maxWidth: '40em', margin: '0 auto' }}>
          <button
            type="button"
            onClick={onOpenClassroom}
            style={{
              width: '100%',
              padding: '0.9em 1.2em',
              border: 'none',
              borderRadius: '0.5em',
              background: '#111827',
              color: 'white',
              fontFamily: 'inherit',
              fontSize: '1.05em',
              fontWeight: '700',
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
          >
            Classroomで開く
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function Class() {
  const { identity } = useIdentity();
  const real = useAnnouncements(identity?.id);
  const { markRead } = real;
  // 開発用: DEV_MOCK を true にすると、先頭にモックが加わる(本番は false のまま)
  const status = DEV_MOCK ? 'ready' : real.status;
  const items = useMemo(() => (DEV_MOCK ? [...MOCK_ITEMS, ...real.items] : real.items), [real.items]);
  const schoolEmail = useSchoolEmail(identity?.id);

  // 詳細画面。端末の戻るボタンでも、一覧に戻れるように、履歴(history)に積む
  const [detailId, setDetailId] = useState(() => window.history.state?.__detail ?? null);
  useEffect(() => {
    const onPop = () => setDetailId(window.history.state?.__detail ?? null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const [activeTab, setActiveTab] = useState('class');
  const [activeFilter, setActiveFilter] = useState('all');
  const [course, setCourse] = useState('');
  const [kind, setKind] = useState('');

  // 検索
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef(null);

  // フォントサイズ基準値（プログラム制御対応）
  const [baseFontSize] = useState(14);

  // 授業の選択肢は、手元のお知らせから作る
  const courseOptions = useMemo(() => buildCourseOptions(items), [items]);
  // 選んでいた授業が一覧からなくなったときは「すべて」として扱う
  const courseValue = courseOptions.some((o) => o.id === course) ? course : '';

  // 選んでいる項目の色(プルダウンの背景)
  const courseColor = courseTheme(courseOptions.find((o) => o.id === courseValue)?.label);
  const kindColor = themeOf(KIND_THEMES[kind]);

  const filteredAnnouncements = useMemo(
    () => filterAnnouncements(items, { tag: activeFilter, course: courseValue, kind, query }),
    [items, activeFilter, courseValue, kind, query]
  );

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

  const emptyMessage =
    status === 'loading'
      ? '読み込み中…'
      : status === 'error'
        ? '読み込みに失敗しました'
        : query.trim()
          ? `「${query.trim()}」に一致するお知らせはありません`
          : '該当するお知らせはありません';

  if (detail) {
    return (
      <DetailView
        ann={detail}
        baseFontSize={baseFontSize}
        onBack={closeDetail}
        onOpenClassroom={() => openExternal(classroomUrl(detail.link, schoolEmail))}
        onOpenUrl={(u) => openExternal(withAuthuser(u, schoolEmail))}
      />
    );
  }

  return (
    <div style={{
      // 画面に固定する: ヘッダーとナビは常に表示され、<main> の中だけがスクロールする
      position: 'fixed',
      inset: 0,
      margin: 0,
      padding: 0,
      background: 'white',
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
        background: 'white',
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
                  height: '34px',
                  padding: '0 1em',
                  border: 'none',
                  outline: 'none',
                  borderRadius: '0.857em',
                  background: '#F3F4F6',
                  color: '#111827',
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
                  color: '#6B7280',
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
                color: '#111827',
                fontSize: '1.571em',
                fontFamily: 'Inter',
                fontWeight: '800',
                userSelect: 'none'
              }}>
                クラスルームからのお知らせ
              </div>

              {/* 右上アイコン */}
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
                src={searchIcon}
                alt="検索"
              />
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
                  backgroundImage: isActive ? 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)' : 'none',
                  backgroundColor: isActive ? 'transparent' : 'white',
                  outline: isActive ? 'none' : '1px #E5E7EB solid',
                  outlineOffset: '-1px',
                  color: isActive ? 'white' : '#6B7280',
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
        <div style={{ padding: '0 1.714em', display: 'flex', gap: '0.571em' }}>
          <FilterSelect
            label="授業で絞り込み"
            value={courseValue}
            onChange={setCourse}
            allLabel="すべての授業"
            theme={courseColor}
            options={courseOptions}
          />
          <FilterSelect
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
        alignContent: 'start',
        borderTop: '1px #F3F4F6 solid'
      }}>
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
                    ? 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%) border-box'
                    : 'white',
                  borderRadius: '1.714em',
                  outline: ann.isUnread ? 'none' : '1px #E5E7EB solid',
                  outlineOffset: '-1px',
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
                      background: courseThemeOrNull(ann.subject)?.gradient || '#F3F4F6',
                      borderRadius: '0.429em'
                    }}>
                      <div style={{
                        color: courseThemeOrNull(ann.subject)?.textColor || '#111827',
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
                        background: themeOf(KIND_THEMES[ann.kind]).gradient,
                        color: themeOf(KIND_THEMES[ann.kind]).textColor,
                        fontSize: '0.786em',
                        fontWeight: '700'
                      }}>
                        {KIND_LABELS[ann.kind]}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.429em' }}>
                    <div style={{ color: '#6B7280', fontSize: '0.857em', fontWeight: '400' }}>
                      {ann.time}
                    </div>
                    {ann.isUnread && (
                      <div style={{ width: '0.571em', height: '0.571em', background: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', borderRadius: '50%' }} />
                    )}
                  </div>
                </div>
                <div style={{ color: '#111827', fontSize: '1em', lineHeight: 1.4286, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {ann.content}
                </div>
              </article>
            );
          })
        ) : (
          <div style={{ padding: '3em 0', textAlign: 'center', color: '#9CA3AF', gridColumn: '1 / -1', userSelect: 'none' }}>
            {emptyMessage}
          </div>
        )}
      </main>

      {/* ===== ボトムナビゲーション部分（常に表示） ===== */}
      <nav style={{
        flexShrink: 0,
        padding: '0 1.143em env(safe-area-inset-bottom)',
        height: 'calc(4.571em + env(safe-area-inset-bottom))',
        background: 'white',
        borderTop: '1px #E5E7EB solid',
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
              onClick={() => setActiveTab(tab.id)}
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
                src={isActive ? tab.activeIcon : tab.icon}
                alt={tab.id}
              />
              <div style={{
                color: isActive ? '#111827' : '#6B7280',
                fontSize: '0.786em',
                fontWeight: '600'
              }}>
                {tab.label}
              </div>
            </div>
          );
        })}
      </nav>

    </div>
  );
}
