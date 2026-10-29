import React from 'react';
import { useAnnouncements } from '../lib/announcements';
import { KIND_OPTIONS } from '../lib/filters';
import { courseThemeOrNull, shaded } from '../pages/Class';

const KIND_LABELS = Object.fromEntries(KIND_OPTIONS.map((k) => [k.id, k.label]));
const COUNT = 3;

const muted = { color: 'var(--text-faint)', fontSize: '0.929em', padding: '0.5em 0' };

// クラスルーム通知の最新3件(お知らせ画面と同じ並び・同じ色)
export default function ClassNoticesGadget({ identity }) {
  const { status, items } = useAnnouncements(identity?.id);
  if (status === 'loading') return null; // 読み込み中は何も出さない(前回の内容があれば、すぐ表示される)
  if (status === 'error') return <div style={muted}>読み込めませんでした</div>;
  const latest = items.slice(0, COUNT);
  if (latest.length === 0) return <div style={muted}>まだお知らせはありません</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {latest.map((a, i) => {
        const theme = courseThemeOrNull(a.subject);
        return (
          <div
            key={a.id}
            style={{
              padding: '0.714em 0',
              borderTop: i > 0 ? '1px solid var(--line)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.429em',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.571em' }}>
              <div style={{ padding: '0.286em 0.571em', background: shaded(theme?.gradient || 'var(--line)'), borderRadius: '0.429em' }}>
                <div style={{ color: theme?.textColor || 'var(--text-strong)', fontSize: '0.786em', fontWeight: 700 }}>{a.subject}</div>
              </div>
              {KIND_LABELS[a.kind] && (
                <div style={{ padding: '0.286em 0.571em', borderRadius: '0.429em', background: 'var(--line)', color: 'var(--text-body)', fontSize: '0.786em', fontWeight: 700 }}>
                  {KIND_LABELS[a.kind]}
                </div>
              )}
              <div style={{ flex: 1 }} />
              <div style={{ color: 'var(--text-muted)', fontSize: '0.786em' }}>{a.time}</div>
              {a.isUnread && (
                <div style={{ width: '0.571em', height: '0.571em', background: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', borderRadius: '50%' }} />
              )}
            </div>
            <div
              style={{
                color: 'var(--text-body)',
                lineHeight: 1.4286,
                wordBreak: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {a.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
