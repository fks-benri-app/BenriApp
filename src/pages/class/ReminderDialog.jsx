// リマインドの設定ダイアログ(候補から選ぶ、または日時を指定)と、時刻になったときのお知らせ。
import React, { useState } from 'react';
import { t } from '../../lib/ui/text';
import { reminderPresets } from '../../lib/announce/reminders';

const btn = {
  display: 'block', width: '100%', padding: '0.857em 1em', border: 'none', background: 'var(--surface-2)',
  color: 'var(--text-strong)', borderRadius: '0.9em', fontFamily: 'inherit', fontSize: '1em', fontWeight: 600,
  textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation'
};
const wrap = { position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' };

// 時刻を選んで設定する。ms を null にすると解除
export function ReminderDialog({ ann, onSave, onCancel, hasReminder }) {
  const [custom, setCustom] = useState('');
  const p = reminderPresets();
  const customMs = custom ? new Date(custom).getTime() : NaN;
  const customOk = Number.isFinite(customMs) && customMs > Date.now();
  return (
    <div style={wrap}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'var(--overlay)' }} />
      <div role="dialog" aria-modal="true" style={{
        position: 'relative', width: '100%', maxWidth: '22.857em', background: 'var(--surface)', borderRadius: '1.143em',
        padding: '1.429em', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '0.571em', userSelect: 'none', WebkitUserSelect: 'none'
      }}>
        <div style={{ fontSize: '1.286em', fontWeight: 600, color: 'var(--text-strong)' }}>{t('class.reminder.title')}</div>
        <div style={{ fontSize: '0.857em', color: 'var(--text-muted)', marginBottom: '0.286em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ann.subject}</div>
        <button type="button" style={btn} onClick={() => onSave(p.hour)}>{t('class.reminder.hour')}</button>
        <button type="button" style={btn} onClick={() => onSave(p.morning)}>{t('class.reminder.tomorrowMorning')}</button>
        <button type="button" style={btn} onClick={() => onSave(p.evening)}>{t('class.reminder.tomorrowEvening')}</button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.429em', marginTop: '0.286em' }}>
          <label style={{ fontSize: '0.857em', color: 'var(--text-muted)' }}>{t('class.reminder.custom')}</label>
          <input
            type="datetime-local"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            style={{ padding: '0.7em 0.9em', border: '1px solid var(--line)', borderRadius: '0.7em', background: 'var(--surface)', color: 'var(--text-strong)', fontFamily: 'inherit', fontSize: '1em', boxSizing: 'border-box', width: '100%' }}
          />
          <button type="button" disabled={!customOk} onClick={() => onSave(customMs)} style={{ ...btn, background: customOk ? 'var(--ink)' : 'var(--line)', color: customOk ? 'var(--on-ink)' : 'var(--text-faint)', textAlign: 'center' }}>
            {t('class.reminder.save')}
          </button>
        </div>
        {hasReminder && (
          <button type="button" style={{ ...btn, background: 'transparent', color: 'var(--text-muted)', textAlign: 'center' }} onClick={() => onSave(null)}>
            {t('class.reminder.clear')}
          </button>
        )}
        <button type="button" style={{ ...btn, background: 'transparent', color: 'var(--text-muted)', textAlign: 'center' }} onClick={onCancel}>
          {t('class.reminder.cancel')}
        </button>
      </div>
    </div>
  );
}

// リマインドの時刻になったお知らせを、閉じずに知らせる(アプリを開いている間に出る)
export function DueReminderDialog({ items, onClose }) {
  return (
    <div style={wrap}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'var(--overlay)' }} />
      <div role="dialog" aria-modal="true" style={{
        position: 'relative', width: '100%', maxWidth: '22.857em', background: 'var(--surface)', borderRadius: '1.143em',
        padding: '1.429em', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '0.714em', userSelect: 'none', WebkitUserSelect: 'none'
      }}>
        <div style={{ fontSize: '1.286em', fontWeight: 600, color: 'var(--text-strong)' }}>{t('class.reminder.dueTitle')}</div>
        {items.map((a) => (
          <div key={a.id} style={{ fontSize: '1em', color: 'var(--text-body)', lineHeight: '1.43em' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.857em' }}>{a.subject}</span>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'hidden', maxHeight: '4.3em' }}>{a.content}</div>
          </div>
        ))}
        <button type="button" onClick={onClose} style={{ ...btn, background: 'var(--ink)', color: 'var(--on-ink)', textAlign: 'center' }}>
          {t('class.reminder.dueClose')}
        </button>
      </div>
    </div>
  );
}
