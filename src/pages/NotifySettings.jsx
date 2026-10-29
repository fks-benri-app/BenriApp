import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdentity } from '../auth/identity';
import Switch from '../components/Switch';
import { currentFontSize } from '../lib/fontSize';
import { useAnnouncements } from '../lib/announcements';
import { courseIdOf, saveNotifyPrefs, useNotifyPrefs } from '../lib/notifyPrefs';

// 通知の詳細設定。ベル・設定の「クラスルーム通知」から開く
export default function NotifySettings() {
  const navigate = useNavigate();
  const { identity } = useIdentity();
  const studentId = identity ? identity.id : null;
  const fontPx = currentFontSize();
  const { prefs, loaded } = useNotifyPrefs(studentId);
  const { items } = useAnnouncements(studentId);
  const [note, setNote] = useState('');

  // お知らせに出てくる授業の一覧(授業ID → 表示名)。届いたことがない授業は出ない
  const courses = useMemo(() => {
    const map = new Map();
    items.forEach((a) => {
      const id = courseIdOf(a.link);
      if (id && !map.has(id)) map.set(id, a.courseLabel || a.subject || '授業');
    });
    return Array.from(map, ([id, label]) => ({ id, label })).sort((x, y) => x.label.localeCompare(y.label, 'ja'));
  }, [items]);

  async function save(next) {
    setNote('');
    try {
      await saveNotifyPrefs(studentId, next);
    } catch {
      setNote('保存できませんでした。通信を確かめて、もう一度押してください。');
    }
  }

  const toggleAll = () => save({ ...prefs, enabled: !prefs.enabled });
  const toggleCourse = (id) => {
    const off = prefs.offCourses.includes(id);
    const offCourses = off ? prefs.offCourses.filter((x) => x !== id) : [...prefs.offCourses, id];
    save({ ...prefs, offCourses });
  };

  const rowStyle = { padding: '0.857em 1.143em', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.857em' };
  const sectionTitle = { color: 'var(--text-muted)', fontSize: '0.929em', fontWeight: 600, padding: '0 0.286em', marginBottom: '0.571em' };
  const card = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '1.143em' };
  const divider = { height: '1px', background: 'var(--line)' };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface)',
        boxSizing: 'border-box', overflow: 'hidden', fontSize: `${fontPx}px`, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif",
      }}
    >
      <header style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.857em', paddingTop: 'calc(2em + env(safe-area-inset-top))', paddingBottom: '1.143em', background: 'var(--surface)' }}>
        <div style={{ padding: '0 1.714em', height: '34px', display: 'flex', alignItems: 'center', gap: '0.857em' }}>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            aria-label="設定に戻る"
            style={{ border: 'none', background: 'transparent', color: 'var(--text-strong)', fontSize: '1.4em', padding: '0 0.286em', cursor: 'pointer' }}
          >
            ‹
          </button>
          <div style={{ color: 'var(--text-strong)', fontSize: '1.571em', fontFamily: 'Inter', fontWeight: 800 }}>通知設定</div>
        </div>
      </header>

      <main className="no-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 1.714em 1.714em', boxSizing: 'border-box' }}>
        <div style={sectionTitle}>クラスルーム通知</div>
        <div style={card}>
          <div style={rowStyle}>
            <div>
              <div style={{ color: 'var(--text-strong)', fontWeight: 600 }}>通知を受け取る</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.857em', marginTop: '0.286em' }}>
                オフにすると、新しいお知らせの通知が届きません。
              </div>
            </div>
            <button type="button" onClick={toggleAll} disabled={!loaded} aria-pressed={prefs.enabled} aria-label="通知を受け取る" style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}>
              <Switch on={prefs.enabled} disabled={!loaded} />
            </button>
          </div>
        </div>

        <div style={{ ...sectionTitle, marginTop: '1.714em' }}>授業ごと</div>
        <div style={card}>
          {courses.length === 0 ? (
            <div style={{ ...rowStyle, color: 'var(--text-muted)', fontSize: '0.929em', lineHeight: '1.6em' }}>
              授業の一覧は、お知らせが届くと表示されます。
            </div>
          ) : (
            courses.map((c, i) => {
              const on = !prefs.offCourses.includes(c.id);
              return (
                <React.Fragment key={c.id}>
                  {i > 0 && <div style={divider} />}
                  <div style={{ ...rowStyle, opacity: prefs.enabled ? 1 : 0.5 }}>
                    <div style={{ color: 'var(--text-strong)', fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>{c.label}</div>
                    <button
                      type="button"
                      onClick={() => toggleCourse(c.id)}
                      disabled={!loaded || !prefs.enabled}
                      aria-pressed={on}
                      aria-label={`${c.label}の通知`}
                      style={{ border: 'none', background: 'transparent', padding: 0, cursor: prefs.enabled ? 'pointer' : 'default', flexShrink: 0 }}
                    >
                      <Switch on={on} disabled={!prefs.enabled} />
                    </button>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.857em', lineHeight: '1.6em', margin: '1em 0.286em 0' }}>
          授業をオフにすると、その授業の新しいお知らせは、あなたには通知されません。お知らせの一覧には、これまでどおり表示されます。
        </p>
        {note && <div role="status" style={{ marginTop: '1em', color: 'var(--warn-fg)', fontSize: '0.929em', textAlign: 'center' }}>{note}</div>}
      </main>
    </div>
  );
}
