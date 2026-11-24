// リマインドの設定ダイアログ(候補から選ぶ、または日時を指定)と、時刻になったときのお知らせ。
import React, { useState } from 'react';
import { t } from '../../lib/ui/text';
import { reminderPresets } from '../../lib/announce/reminders';
import ModalDialog, { DialogButton } from '../../components/ModalDialog';

const ROW = {
  display: 'block', width: '100%', padding: '0.95em 1em', border: 'none', background: 'transparent', boxSizing: 'border-box',
  color: 'var(--text-strong)', fontFamily: 'inherit', fontSize: '1em', fontWeight: 600, textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation'
};

// 時刻を選んで設定する。ms を null にすると解除
export function ReminderDialog({ ann, onSave, onCancel, hasReminder }) {
  const [custom, setCustom] = useState('');
  const p = reminderPresets();
  const customMs = custom ? new Date(custom).getTime() : NaN;
  const customOk = Number.isFinite(customMs) && customMs > Date.now();
  const rows = [
    { label: t('class.reminder.hour'), at: p.hour },
    { label: t('class.reminder.tomorrowMorning'), at: p.morning },
    { label: t('class.reminder.tomorrowEvening'), at: p.evening },
  ];
  return (
    <ModalDialog zIndex={70} onClose={onCancel} title={t('class.reminder.title')} description={ann.subject}
      actions={(
        <>
          {hasReminder && <DialogButton onClick={() => onSave(null)}>{t('class.reminder.clear')}</DialogButton>}
          <DialogButton onClick={onCancel}>{t('class.reminder.cancel')}</DialogButton>
        </>
      )}
    >
      <div style={{ border: '1px solid var(--line)', borderRadius: '0.9em', overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <button key={r.label} type="button" onClick={() => onSave(r.at)} style={{ ...ROW, borderTop: i ? '1px solid var(--line)' : 'none' }}>{r.label}</button>
        ))}
      </div>
      <div style={{ marginTop: '1.43em', display: 'flex', flexDirection: 'column', gap: '0.571em' }}>
        <label style={{ fontSize: '0.857em', color: 'var(--text-muted)' }}>{t('class.reminder.custom')}</label>
        <input
          type="datetime-local"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          style={{ padding: '0.7em 0.9em', border: '1px solid var(--line)', borderRadius: '0.7em', background: 'var(--surface)', color: 'var(--text-strong)', fontFamily: 'inherit', fontSize: '1em', boxSizing: 'border-box', width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
