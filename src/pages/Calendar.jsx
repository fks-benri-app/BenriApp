// カレンダー画面(試作): 自分の学年・講座(組)の授業表を表示する。まだ無いときは、画像・手入力・撮影から作る。
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { TitleHeader } from '../components/ClassBackdrop';
import { useIdentity } from '../auth/identity';
import { useProfile } from '../lib/profile/profile';
import { recognizeWithPaddle } from '../lib/timetable/paddleOcr';
import { buildGridByLabels } from '../lib/timetable/timetableGrid';
import { WEEKDAYS, PERIODS, timetableKeyOf, loadTimetable, saveTimetable, clearTimetable, emptyTable, tableFromOcr, subjectsFor, cellValue } from '../lib/timetable/ownTimetable';
import { t } from '../lib/ui/text';
import { courseThemeOrNull, shaded } from '../lib/ui/courseTheme';
import settingsOptions from '../data/settingsOptions.json';
import { THEMES } from '../lib/ui/themes';

const COLUMNS = [...WEEKDAYS, '土']; // 土: 土曜日の列
const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

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

// 空の枠は面の白の上に何も描かず、+ だけ置く(参考の表と同じ)
const emptyCellStyle = { ...cellStyle, background: 'none', outline: 'none' };

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

const dateStyle = {
  font: 'inherit',
  justifySelf: 'center',
  width: '2.286em',
  height: '2.286em',
  padding: 0,
  borderRadius: '50%',
  border: 'none',
  background: 'none',
  color: 'var(--text-strong)',
  fontWeight: 500,
  cursor: 'pointer',
};

const monthStyle = { font: 'inherit', fontSize: '1.143em', fontWeight: 700, color: 'var(--text-strong)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' };

const navButtonStyle = { font: 'inherit', fontSize: '1.143em', width: '2em', height: '2em', padding: 0, lineHeight: 1, borderRadius: '50%', border: '1px var(--line) solid', background: 'var(--surface)', color: 'var(--text-strong)', cursor: 'pointer' };

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
  const todayIdx = new Date().getDay() - 1; // 月=0 … 金=4(土日は -1 や 5・6 になり、どこも光らない)
  const { identity } = useIdentity();
  const studentId = identity?.id;
  const profile = useProfile(studentId);
  const key = studentId ? timetableKeyOf(studentId, profile.courseLetter) : null;

  const [table, setTable] = useState(() => (key ? loadTimetable(key) : null)); // 最初から読み、入口の画面が一瞬出ないように
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { day, period, value }
  const [weekOffset, setWeekOffset] = useState(0); // 今週からの週の数(前は負)
  const [selIdx, setSelIdx] = useState(todayIdx >= 0 && todayIdx < COLUMNS.length ? todayIdx : 0); // 一覧に出す日(月=0 … 土=5)
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
    if (!saveTimetable(key, next)) setError(t('calendar.saveFailed'));
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
      const grid = buildGridByLabels(items, subjectsFor(key));
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
    setEditing({ day, period, value: cellValue(table?.[day]?.[period]).name });
  }

  function finishEdit() {
    if (!editing) return;
    const { day, period, value } = editing;
    setEditing(null);
    const text = value.trim();
    const old = cellValue(table?.[day]?.[period]);
    if (text === old.name) return;
    const next = { ...table, [day]: { ...table[day], [period]: { name: text, room: old.room } } };
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

  // 表示している週(日曜は、次の週を見せる)。選んだ日の授業を、下の一覧に出す
  const now = new Date();
  const toMonday = now.getDay() === 0 ? 1 : 1 - now.getDay();
  const dateOf = (i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + toMonday + weekOffset * 7 + i);
  const isToday = (d) => d.toDateString() === now.toDateString();
  const selDate = dateOf(selIdx);
  const selDay = COLUMNS[selIdx];
  const dayClasses = PERIODS.map((p) => ({ p, ...cellValue(table?.[selDay]?.[p]) })).filter((x) => x.name);

  return (
    <div style={rootStyle}>
      <TitleHeader title={t('calendar.title')} />

      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '0.857em 0 1.143em',
          paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.143em',
        }}
      >
        {/* 月の表示と、週の切り替え */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <button type="button" aria-label={t('calendar.thisWeek')} onClick={() => { setWeekOffset(0); setSelIdx(todayIdx >= 0 && todayIdx < COLUMNS.length ? todayIdx : 0); }} style={monthStyle}>
            {`${selDate.getFullYear()}年${selDate.getMonth() + 1}月`}
          </button>
          <div style={{ display: 'flex', gap: '0.857em' }}>
            <button type="button" aria-label={t('calendar.prevWeek')} onClick={() => setWeekOffset(weekOffset - 1)} style={navButtonStyle}>‹</button>
            <button type="button" aria-label={t('calendar.nextWeek')} onClick={() => setWeekOffset(weekOffset + 1)} style={navButtonStyle}>›</button>
          </div>
        </div>

        {error && <p style={{ color: 'var(--text-strong)', fontSize: '0.857em', margin: 0 }}>{error}</p>}
        {/* 週の表(曜日・日付・1〜7限)。日付を押すと、その日の授業が下の一覧に出る */}
        <div style={{ flexShrink: 0, background: 'var(--surface-2, var(--surface))', borderRadius: '1.714em', outline: '1px var(--line) solid', outlineOffset: '-1px', padding: '1.429em' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2.4em repeat(6, minmax(0, 1fr))',
              gridTemplateRows: 'auto auto repeat(7, 3.2em)',
              gap: '0.429em',
            }}
          >
            <div />
            {COLUMNS.map((w) => (
              <div key={w} style={{ ...labelStyle, fontSize: '0.929em', color: w === '土' ? 'var(--text-strong)' : 'var(--text-muted)' }}>{w}</div>
            ))}

            <div />
            {COLUMNS.map((w, i) => {
              const d = dateOf(i);
              const today = isToday(d);
              const style = today
                ? { ...dateStyle, background: shaded(THEMES.orangeRed.gradient), color: '#fff', fontWeight: 700 }
                : i === selIdx ? { ...dateStyle, boxShadow: 'inset 0 0 0 1.5px var(--text-strong)' } : dateStyle;
              return (
                <button key={w} type="button" aria-label={`${d.getMonth() + 1}月${d.getDate()}日（${w}）`} aria-pressed={i === selIdx} onClick={() => setSelIdx(i)} style={style}>
                  {d.getDate()}
                </button>
              );
            })}

            {PERIODS.map((p) => (
              <React.Fragment key={p}>
                <div style={{ ...labelStyle, flexDirection: 'column', lineHeight: 1.2 }}>
                  <span>{p}</span>
                  <span style={{ fontSize: '0.714em', color: 'var(--text-muted)', fontWeight: 400 }}>{settingsOptions.periodTimes[p - 1]}</span>
                </div>
                {COLUMNS.map((w) => {
                  const { name, room } = cellValue(table?.[w]?.[p]);
                  const theme = name ? courseThemeOrNull(name) : null; // 授業ごとの色(courseThemes.json)
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
                    <button key={`${w}${p}`} type="button" onClick={() => startEdit(w, p)} aria-label={`${w}曜 ${p}限`} style={theme ? { ...cellStyle, background: shaded(theme.gradient), color: theme.textColor, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } : name ? cellStyle : emptyCellStyle}>
                      {name ? (<><span style={{ fontWeight: 600, lineHeight: 1.25 }}>{name}</span>{room && <span style={{ fontSize: '0.857em', opacity: 0.85 }}>{room}</span>}</>) : <span style={plusStyle} aria-hidden="true">+</span>}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 選んだ日の予定(表から読んだ授業) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.857em' }}>
          <div style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '1.143em' }}>
            {`${selDate.getMonth() + 1}月${selDate.getDate()}日（${WEEKDAY_NAMES[selDate.getDay()]}）${t('calendar.todayTitle')}`}
          </div>
          {dayClasses.length === 0 && <p style={{ color: 'var(--text-faint)', fontSize: '0.857em', margin: 0 }}>{t('calendar.dayEmpty')}</p>}
          {dayClasses.map((x) => {
            const theme = courseThemeOrNull(x.name);
            return (
              <div key={x.p} style={{ display: 'flex', alignItems: 'center', gap: '0.857em', padding: '1.143em', borderRadius: '1.429em', background: 'var(--surface-2, var(--surface))', outline: '1px var(--line) solid', outlineOffset: '-1px' }}>
                <div style={{ width: 4, height: '2.857em', borderRadius: 2, background: (theme || THEMES.gray).gradient, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--text-strong)', fontWeight: 700, fontSize: '1.07em' }}>{x.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.857em' }}>{`${x.p}限 ${settingsOptions.periodTimes[x.p - 1]}${x.room ? ` / ${x.room}` : ''}`}</div>
                </div>
              </div>
            );
          })}
        </section>

        <button type="button" onClick={() => { clearTimetable(key); setTable(null); }} style={{ ...buttonStyle, alignSelf: 'center', flexShrink: 0 }}>{t('calendar.reset')}</button>
      </main>

      <BottomNav active="calendar" onSelect={onSelectTab} />
    </div>
  );
}
