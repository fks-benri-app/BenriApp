// リマインドの設定ダイアログ(候補から選ぶ、または日時を指定)と、時刻になったときのお知らせ。
import React, { useState } from 'react';
import { t } from '../../lib/ui/text';
import { reminderPresets } from '../../lib/announce/reminders';
import ModalDialog, { DialogButton } from '../../components/ModalDialog';

const btn = {
  display: 'block', width: '100%', padding: '0.857em 1em', border: 'none', background: 'var(--surface-2)',
  color: 'var(--text-strong)', borderRadius: '0.9em', fontFamily: 'inherit', fontSize: '1em', fontWeight: 600,
  textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation'
};

// 時刻を選んで設定する。ms を null にすると解除
export function ReminderDialog({ ann, onSave, onCancel, hasReminder }) {
  const [custom, setCustom] = useState('');
  const p = reminderPresets();
  const customMs = custom ? new Date(custom).getTime() : NaN;
  const customOk = Number.isFinite(customMs) && customMs > Date.now();
  return (
    <ModalDialog zIndex={70} onClose={onCancel} label={t('class.reminder.title')} title={t('class.reminder.title')}
      description={ann.subject}
      actions={(
        <>
          {hasReminder && <DialogButton onClick={() => onSave(null)}>{t('class.reminder.clear')}</DialogButton>}
          <DialogButton onClick={onCancel}>{t('class.reminder.cancel')}</DialogButton>
        </>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.571em' }}>
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
          <DialogButton primary disabled={!customOk} onClick={() => onSave(customMs)}>{t('class.reminder.save')}</DialogButton>
        </div>
      </div>
    </ModalDialog>
  );
}

// リマインドの時刻になったお知らせを、閉じずに知らせる(アプリを開いている間に出る)
export function DueReminderDialog({ items, onClose }) {
  return (
    <ModalDialog zIndex={70} onClose={onClose} title={t('class.reminder.dueTitle')}
      actions={<DialogButton primary onClick={onClose}>{t('class.reminder.dueClose')}</DialogButton>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.714em' }}>
        {items.map((a) => (
          <div key={a.id} style={{ fontSize: '1em', color: 'var(--text-body)', lineHeight: '1.43em' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.857em' }}>{a.subject}</span>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'hidden', maxHeight: '4.3em' }}>{a.content}</div>
          </div>
        ))}
      </div>
    </ModalDialog>
  );
}
