// デザイン確認用の画面。ログインなしで、お知らせ画面の見た目をダミーのデータで確かめる(#/design-preview?theme=dark&v=swatch)。
import React, { useEffect, useMemo, useRef, useState } from 'react';
import TitleRow from '../class/TitleRow';
import TagChips from '../class/TagChips';
import CourseKindFilters from '../class/CourseKindFilters';
import AnnouncementCard from '../class/AnnouncementCard';
import BottomNav from '../../components/BottomNav';
import themes from '../../data/themes.json';
import { courseTheme } from '../../lib/ui/courseTheme';
import { currentFontSize } from '../../lib/ui/fontSize';

const SAMPLE = [
  { id: 1, subject: '数学', kind: 'assignment', time: '10:42', isUnread: true, content: '問題集 p.40-45 を解いて、金曜の授業までに提出してください' },
  { id: 2, subject: '化学', kind: 'announcement', time: '9:15', isUnread: true, content: '来週の実験は2班に分かれます。白衣を忘れないこと' },
  { id: 3, subject: '古典', kind: 'material', time: '昨日 18:30', isUnread: false, content: '助動詞の活用表(プリント)' },
  { id: 4, subject: '英語', kind: 'announcement', time: '昨日 16:05', isUnread: true, content: 'スピーキングテストの日程が決まりました' },
  { id: 5, subject: '物理', kind: 'assignment', time: '11月18日', isUnread: false, content: '力学の演習 期限: 11月25日' },
  { id: 6, subject: '生物', kind: 'announcement', time: '11月18日', isUnread: false, content: 'レポートの書き方について' },
  { id: 7, subject: '論理表現', kind: 'material', time: '11月17日', isUnread: false, content: 'ディベートの資料' },
  { id: 8, subject: 'コミュ', kind: 'announcement', time: '11月17日', isUnread: false, content: '教室が変更になります(B棟 2F)' },
];

const q = () => new URLSearchParams((window.location.hash.split('?')[1] || ''));

export default function DesignPreview() {
  const params = q();
  const view = params.get('v') || 'list';
  const [filter, setFilter] = useState('all');
  const searchRef = useRef(null);
  const base = useMemo(() => currentFontSize(), []);
  useEffect(() => {
    document.documentElement.dataset.theme = params.get('theme') === 'dark' ? 'dark' : 'light';
  }, [params]);
  const none = () => {};

  if (view === 'swatch') {
    return (
      <div style={{ position: 'fixed', inset: 0, overflow: 'auto', background: 'var(--surface)', padding: '1em', fontSize: `${base}px` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5em' }}>
          {Object.entries(themes).map(([name, th]) => (
            <div key={name} style={{ background: th.gradient, color: th.textColor, borderRadius: '0.357em', padding: '0.8em 0.5em', fontWeight: 700, fontSize: '0.857em' }}>{name}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontSize: `${base}px` }}>
      <header style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.571em', paddingTop: 'calc(0.571em + env(safe-area-inset-top))', paddingBottom: '0.714em', background: 'var(--surface)', borderBottom: '1px solid var(--line)', width: '100%' }}>
        <TitleRow searchOpen={false} searchInputRef={searchRef} query="" setQuery={none} closeSearch={none} readAllShown={none} unreadShown={SAMPLE.filter((s) => s.isUnread)} devicePushOn openSearch={none} />
        <TagChips activeFilter={filter} setActiveFilter={setFilter} />
        <CourseKindFilters baseFontSize={base} courseValue="" setCourse={none} courseColor={courseTheme('化学')} courseOptions={[{ id: '化学', label: '化学' }]} kind="" setKind={none} kindColor={courseTheme('化学')} />
      </header>
      <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.857em 1.143em', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.714em', alignContent: 'start' }}>
        {SAMPLE.map((ann) => <AnnouncementCard key={ann.id} ann={ann} openAnnouncement={none} />)}
      </main>
      <BottomNav active="class" onSelect={none} />
    </div>
  );
}

