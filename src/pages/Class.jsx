
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAnnouncementById, useAnnouncements } from '../lib/announce/announcements';
import { goRepairNotifications, isPushRecentlyFixed } from '../lib/push/pushStatus';
import TitleRow from './class/TitleRow';
import TagChips from './class/TagChips';
import CourseKindFilters from './class/CourseKindFilters';
import AnnouncementCard from './class/AnnouncementCard';
import ReadAllDialog from './class/ReadAllDialog';
import { useDevicePushState } from './class/useDevicePushState';
import { DetailView } from './class/DetailView';
import { useSchoolEmail, classroomUrl, openExternal, withAuthuser } from './class/schoolEmail';
import { useIdentity } from '../auth/identity';
import BottomNav from '../components/BottomNav';
import { currentFontSize } from '../lib/ui/fontSize';
import { buildCourseOptions, filterAnnouncements } from '../lib/announce/filters';
import { peekBootOpen, takeBootOpen } from '../lib/announce/bootOpen';
import { courseTheme } from '../lib/ui/courseTheme';

// ヘッダー用アイコン
import { t } from '../lib/ui/text';


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

// 横スクロールの行に出る灰色のバーを隠す(スクロールはできる)
const NO_SCROLLBAR_CSS = '.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none}';


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
  // 通知の状態(届いていない可能性・この端末の通知がオンか)。確認と付け直しも、このフックの中で行う
  const { pushBroken, devicePushOn } = useDevicePushState(identity?.id);

  // 詳細画面。端末の戻るボタンでも、一覧に戻れるように、履歴(history)に積む
  const [detailId, setDetailId] = useState(() => window.history.state?.__detail ?? peekBootOpen() ?? null);
  useEffect(() => {
    const onPop = () => setDetailId(window.history.state?.__detail ?? null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // 通知から開いた場合: URL をきれいにして、戻るで一覧に戻れるよう履歴を1つ積む
  useEffect(() => {
    const id = takeBootOpen();
    if (!id) return;
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

  // 一覧に無いお知らせ(通知の直後で、まだ端末に入っていない等)は、閉じずに1件だけ直接読んで開く
  const [fetched, setFetched] = useState(null); // { id, item } か { id, missing: true }
  const listed = detailId ? items.find((a) => a.id === detailId) : null;
  const isListed = !!listed;
  const detail = listed || (fetched && fetched.id === detailId && fetched.item) || null;
  useEffect(() => {
    if (!detailId || isListed || !identity?.id) return undefined;
    if (fetched && fetched.id === detailId) {
      // 読んでも無い(削除済みなど)お知らせの詳細は開かない
      if (fetched.missing) setDetailId(null);
      return undefined;
    }
    let alive = true;
    // 読めなかったとき(オフラインなど)は、詳細を開いたままにする。戻るボタンで一覧へ戻れる
    fetchAnnouncementById(identity.id, detailId)
      .then((item) => { if (alive) setFetched(item ? { id: detailId, item } : { id: detailId, missing: true }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [detailId, isListed, identity?.id, fetched]);

  const emptyMessage =
    status === 'loading'
      ? ''
      : status === 'error'
        ? t('class.loadFailed')
        : query.trim()
          ? t('class.noMatch', { query: query.trim() })
          : t('class.none');

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
        <TitleRow searchOpen={searchOpen} searchInputRef={searchInputRef} query={query} setQuery={setQuery} closeSearch={closeSearch} readAllShown={readAllShown} unreadShown={unreadShown} devicePushOn={devicePushOn} openSearch={openSearch} />

        {/* フィルターボタン */}
        <TagChips activeFilter={activeFilter} setActiveFilter={setActiveFilter} />

        {/* プルダウン: 授業・形式 */}
        <CourseKindFilters baseFontSize={baseFontSize} courseValue={courseValue} setCourse={setCourse} courseColor={courseColor} courseOptions={courseOptions} kind={kind} setKind={setKind} kindColor={kindColor} />
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
        <AnnouncementCard key={ann.id} ann={ann} openAnnouncement={openAnnouncement} />
            );
          })
        ) : (
          <div style={{ padding: '3em 0', textAlign: 'center', color: 'var(--text-faint)', gridColumn: '1 / -1', userSelect: 'none' }}>
            {emptyMessage}
          </div>
        )}
      </main>

      <BottomNav
        active={activeTab}
        onSelect={(id) => (id === 'settings' ? navigate('/settings') : id === 'home' ? navigate('/') : setActiveTab(id))}
      />

      {readAllAsk && (
        <ReadAllDialog unreadCount={unreadShown.length} onCancel={() => setReadAllAsk(false)} onConfirm={confirmReadAll} />
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