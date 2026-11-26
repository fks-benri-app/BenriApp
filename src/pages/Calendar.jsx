// カレンダー画面(試作): 自分の学年・講座(組)の授業表を表示する。まだ無いときは、画像・手入力・撮影から作る。
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { TitleHeader } from '../components/ClassBackdrop';
import { useIdentity } from '../auth/identity';
import { useProfile } from '../lib/profile/profile';
import { recognizeWithPaddle } from '../lib/timetable/paddleOcr';
import { buildGridByLabels } from '../lib/timetable/timetableGrid';
import { WEEKDAYS, PERIODS, timetableKeyOf, loadTimetable, saveTimetable, emptyTable, tableFromOcr } from '../lib/timetable/ownTimetable';
import { t } from '../lib/ui/text';

const BASE_FONT_SIZE = 14;

const rootStyle = {
  position: 'fixed',
  inset: 0,
  margin: 0,
  padding: 0,
  background: 'var(--surface)',
  boxSizing: 'border-box',
  overflow: 'hidden',
  fontSize: `${BASE_FONT_SIZE}px`,
  display: 'flex',
  flexDirection: 'column',
};

const cellStyle = {
  position: 'relative',
  borderRadius: '0.857em',
  background: 'var(--surface-2, var(--surface))',
  outline: '1px var(--line) solid',
  outlineOffset: '-1px',
  minWidth: 0,
  overflow: 'hidden',
  padding: '0.357em',
  boxSizing: 'border-box',
  textAlign: 'left',
  fontSize: '0.857em',
  color: 'var(--text-strong)',
  lineHeight: 1.3,
  cursor: 'pointer',
  border: 'none',
  font: 'inherit',
};

const plusStyle = {
  position: 'absolute',
  right: '0.429em',
  top: '0.429em',
  width: '1.714em',
  height: '1.714em',
  borderRadius: '50%',
  color: 'var(--text-faint)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1em',
  lineHeight: 1,
};

const labelStyle = {
  color: 'var(--text-muted)',
  fontSize: '0.857em',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const buttonStyle = {
  padding: '0.857em 1.143em',
  borderRadius: '999px',
  border: '1px var(--line) solid',
  background: 'var(--surface)',
  color: 'var(--text-strong)',
  font: 'inherit',
  fontWeight: 600,
  cursor: 'pointer',
  width: '100%',
  maxWidth: '20em',
};

export default function Calendar() {
  const navigate = useNavigate();
  const { identity } = useIdentity();
  const studentId = identity?.id;
  const profile = useProfile(studentId);
  const key = studentId ? timetableKeyOf(studentId, profile.courseLetter) : null;

  const [table, setTable] = useState(() => (key ? loadTimetable(key) : null)); // 最初から読み、入口の画面が一瞬出ないように
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { day, period, value }
  const uploadRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    setTable(key ? loadTimetable(key) : null);
  }, [key]);


  function onSelectTab(id) {
    if (id === 'home') navigate('/');
    else if (id === 'class') navigate('/class');
    else if (id === 'settings') navigate('/settings');
    // カレンダーは今いる画面
  }

  function commit(next) {
    setTable(next);
    saveTimetable(key, next);
  }

  async function onPick(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // 同じ写真を続けて選べるように空にする
    if (!file || !key) return;
    setBusy(true);
    setError('');
    setStatus(t('calendar.reading'));
    try {
      const items = await recognizeWithPaddle(file, { fine: true }, setStatus);
      const grid = buildGridByLabels(items, []);
      if (!grid) throw new Error(t('calendar.noHeading'));
      commit(tableFromOcr(grid));
    } catch (err) {
      setError(err?.message || t('calendar.readFailed'));
    } finally {
      setBusy(false);
      setStatus('');
    }
  }

  function startEdit(day, period) {
    setEditing({ day, period, value: table?.[day]?.[period] || '' });
  }

  function finishEdit() {
    if (!editing) return;
    const { day, period, value } = editing;
    setEditing(null);
    const text = value.trim();
    if (text === (table?.[day]?.[period] || '')) return;
    const next = { ...table, [day]: { ...table[day], [period]: text } };
    commit(next);
  }

  // 学年・講座(組)がわからないときは、案内だけ出す
  if (!key) {
    return (
      <div style={rootStyle}>
        <TitleHeader title={t('calendar.title')} />
        <main style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.143em', boxSizing: 'border-box' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.857em', margin: 0, textAlign: 'center' }}>{t('calendar.unavailable')}</p>
        </main>
        <BottomNav active="calendar" onSelect={onSelectTab} />
      </div>
    );
  }

  // 授業表がまだ無いとき: 3つの入口だけを出す
  if (!table) {
    return (
      <div style={rootStyle}>
        <TitleHeader title={t('calendar.title')} />
        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.857em', padding: '1.143em', boxSizing: 'border-box' }}>
          <button type="button" style={buttonStyle} disabled={busy} onClick={() => uploadRef.current?.click()}>{t('calendar.upload')}</button>
          <button type="button" style={buttonStyle} disabled={busy} onClick={() => { setError(''); commit(emptyTable()); }}>{t('calendar.manual')}</button>
          <button type="button" style={buttonStyle} disabled={busy} onClick={() => cameraRef.current?.click()}>{t('calendar.camera')}</button>
          <input ref={uploadRef} type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onPick} style={{ display: 'none' }} />
          {status && <p style={{ color: 'var(--text-muted)', fontSize: '0.857em', margin: 0 }}>{status}</p>}
          {error && <p style={{ color: 'var(--text-strong)', fontSize: '0.857em', margin: 0, textAlign: 'center' }}>{error}</p>}
          <p style={{ color: 'var(--text-faint)', fontSize: '0.786em', margin: 0, textAlign: 'center' }}>{t('calendar.localNote')}</p>
        </main>
        <BottomNav active="calendar" onSelect={onSelectTab} />
      </div>
    );
  }

  return (
    <div style={rootStyle}>
      <TitleHeader title={t('calendar.title')} />

      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          padding: '0.571em 0',
          paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            height: '100%',
            display: 'grid',
            gridTemplateColumns: '1.6em repeat(5, minmax(0, 1fr))',
            gridTemplateRows: 'auto repeat(7, minmax(0, 1fr))',
            gap: '0.429em',
          }}
        >
          <div />
          {WEEKDAYS.map((w) => (
            <div key={w} style={{ ...labelStyle, color: 'var(--text-strong)', fontSize: '1em' }}>{w}</div>
          ))}

          {PERIODS.map((p) => (
            <React.Fragment key={p}>
              <div style={labelStyle}>{p}</div>
              {WEEKDAYS.map((w) => {
                const name = table?.[w]?.[p] || '';
                if (editing && editing.day === w && editing.period === p) {
                  return (
                    <input
                      key={`${w}${p}`}
                      autoFocus
                      value={editing.value}
                      onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                      onBlur={finishEdit}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      style={{ ...cellStyle, font: 'inherit', fontSize: '0.786em', padding: '0.214em', minWidth: 0 }}
                    />
                  );
                }
                return (
                  <button key={`${w}${p}`} type="button" onClick={() => startEdit(w, p)} aria-label={`${w}曜 ${p}限`} style={cellStyle}>
                    {name || <span style={plusStyle} aria-hidden="true">+</span>}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </main>

      <BottomNav active="calendar" onSelect={onSelectTab} />
    </div>
  );
}
