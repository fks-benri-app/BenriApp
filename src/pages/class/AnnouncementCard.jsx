// お知らせ一覧の1枚のカード。
import React from 'react';
import { KIND_LABELS } from './DetailView';
import { courseThemeOrNull, shaded } from '../../lib/ui/courseTheme';

export default function AnnouncementCard({ ann, openAnnouncement }) {
  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => openAnnouncement(ann)}
      onKeyDown={(e) => { if (e.key === 'Enter') openAnnouncement(ann); }}
      style={{
        position: 'relative',
        padding: ann.isUnread ? 'calc(0.786em - 1.5px) calc(0.929em - 1.5px)' : '0.786em 0.929em',
        border: ann.isUnread ? '1.5px solid transparent' : 'none',
        background: ann.isUnread
          ? 'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%) border-box'
          : 'var(--surface-2)', // 背景より一段だけ濃い面(枠線の色よりなじませる)
        borderRadius: '0.857em',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5em',
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
            padding: '0.214em 0.5em',
            background: shaded(courseThemeOrNull(ann.subject)?.gradient || 'var(--line)'),
            borderRadius: '0.357em'
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
              padding: '0.214em 0.5em',
              borderRadius: '0.357em',
              background: 'var(--line)',
              color: 'var(--text-body)',
              fontSize: '0.786em',
              fontWeight: '700'
            }}>
              {KIND_LABELS[ann.kind]}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.429em' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.786em', fontWeight: '400', position: 'relative', top: '-0.214em', fontVariantNumeric: 'tabular-nums' }}>
            {ann.time}
          </div>
          {/* 既読でも場所は空けておく(未読・既読で、時刻の位置がずれないように) */}
          <div style={{ width: '0.643em', height: '0.643em', background: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', borderRadius: '50%', visibility: ann.isUnread ? 'visible' : 'hidden' }} />
        </div>
      </div>
      <div style={{ color: 'var(--text-body)', fontSize: '1em', fontWeight: 400, lineHeight: 1.4286, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {ann.content}
      </div>
    </article>
  );
}
