// 長押しで出る、お知らせのメニュー(下から出る画面)。ピン留め・リマインドを選ぶ。
import React from 'react';
import { t } from '../../lib/ui/text';

export default function AnnouncementMenu({ ann, pinned, hasReminder, onTogglePin, onRemind, onClose }) {
  const rowStyle = {
    display: 'block', width: '100%', padding: '1em', border: 'none', background: 'var(--surface-2)',
    color: 'var(--text-strong)', borderRadius: '0.9em', fontFamily: 'inherit', fontSize: '1em', fontWeight: 600,
    textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation'
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'var(--overlay)' }} />
      <div role="dialog" aria-modal="true" style={{
        position: 'relative', width: '100%', maxWidth: '28em', background: 'var(--surface)',
        borderRadius: '1.429em 1.429em 0 0', padding: '1.143em 1.143em calc(1.143em + env(safe-area-inset-bottom))',
        boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '0.571em', userSelect: 'none', WebkitUserSelect: 'none'
      }}>
        <div style={{ fontSize: '0.857em', color: 'var(--text-muted)', padding: '0 0.571em 0.429em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ann.subject}
        </div>
        <button type="button" onClick={onTogglePin} style={rowStyle}>
          {pinned ? t('class.menu.unpin') : t('class.menu.pin')}
        </button>
        <button type="button" onClick={onRemind} style={rowStyle}>
          {hasReminder ? t('class.reminder.clear') : t('class.menu.remind')}
        </button>
        <button type="button" onClick={onClose} style={{ ...rowStyle, background: 'transparent', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.286em' }}>
          {t('class.menu.close')}
        </button>
      </div>
    </div>
  );
}
