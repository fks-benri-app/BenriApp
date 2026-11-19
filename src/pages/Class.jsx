
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAnnouncementById, useAnnouncements } from '../lib/announce/announcements';
import { goRepairNotifications, isPushRecentlyFixed } from '../lib/push/pushStatus';
import TitleRow from './class/TitleRow';
import TagChips from './class/TagChips';
import CourseKindFilters from './class/CourseKindFilters';
import AnnouncementCard from './class/AnnouncementCard';
import { DEV_MOCK, MOCK_ITEMS } from './class/mockItems';
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