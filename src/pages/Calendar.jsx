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
import timeTemplates from '../data/timeTemplates.json';
import subjectShort from '../data/subjectShort.json';
import { THEMES } from '../lib/ui/themes';

const COLUMNS = [...WEEKDAYS, '土']; // 土: 土曜日の列
const LONG_PRESS_MS = 500; // カードを長押ししたら、授業名を直せる
const TEMPLATE = timeTemplates.templates[timeTemplates.default]; // 時程(仮。運営が番号で管理する予定)
const startOf = (p) => TEMPLATE.periods.find((x) => x.period === p)?.start || '';
const shortName = (name) => subjectShort[name] || name; // 省略形(無ければ、そのまま)

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
  borderRadius: '0.4cqi',
  background: 'var(--surface-2, var(--surface))',
  outline: '1px var(--line) solid',
  outlineOffset: '-1px',
  minWidth: 0,
  overflow: 'hidden',
  padding: '0.7cqi',
  boxSizing: 'border-box',
  textAlign: 'left',
  aspectRatio: '1.95 / 1', // 紙の時間割と同じ比率(画像の実測。幅に対して高さが約半分)
  fontSize: '1.19cqi', // 紙の時間割と同じ大きさ(表の幅に比例する。cqi は表の幅の1%)
  color: 'var(--text-strong)',
  lineHeight: 1.2,
  border: 'none',
  WebkitTouchCallout: 'none', // 長押しで、メニューや文字選択を出さない
  userSelect: 'none',
};

// 空の枠は、面の白の上に何も描かない(+ は置かない)
const emptyCellStyle = { ...cellStyle, background: 'none', outline: 'none' };

const nameStyle = {
  fontWeight: 600,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  overflowWrap: 'anywhere',
};

const roomStyle = { fontSize: '0.889em', opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

const labelStyle = {
  color: 'var(--text-muted)',
  fontSize: '0.857em',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const todayStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2em',
  height: '2em',
  borderRadius: '50%',
  background: shaded(THEMES.orangeRed.gradient),
  color: '#fff',
  fontWeight: 700,
};

const selectStyle = {
  font: 'inherit',
  fontSize: '0.857em',
  padding: '0.429em 0.857em',
  borderRadius: '999px',
  border: '1px var(--line) solid',
  background: 'var(--surface)',
  color: 'var(--text-strong)',
};

const hintStyle = { color: 'var(--text-faint)', fontSize: '0.786em', margin: 0, textAlign: 'center' };

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

// 読み取り中の処理を、画面の外で持つ(ページを離れて戻っても、読み取りの結果を受け取れるように)
const readingByKey = new Map(); // 授業表の鍵 → 読み取りの処理

// 写真を読んで、表にして、保存する。保存できたかを返す
async function readPhoto(file, key, onStatus) {
  const items = await recognizeWithPaddle(file, { fine: true }, onStatus);
  const grid = buildGridByLabels(items, subjectsFor(key));
  if (!grid) throw new Error(t('calendar.noHeading'));
  const next = tableFromOcr(grid);
  return { next, saved: saveTimetable(key, next) };
}

export default function Calendar() {
  const navigate = useNavigate();
  const todayIdx = new Date().getDay() - 1; // 月=0 … 土=5(日曜は -1 で、どこも光らない)
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
  const pressTimer = useRef(null);

  // 前の画面で始めた読み取りが続いていれば、その結果が出るまで待つ
  useEffect(() => {
    setTable(key ? loadTimetable(key) : null);
    const reading = key && readingByKey.get(key);
    if (!reading) return;
    setBusy(true);
    setStatus(t('calendar.reading'));
    const done = () => {
      setBusy(false);
      setStatus('');
      setTable(loadTimetable(key));
    };
    reading.then(done, done);
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
    const reading = readPhoto(file, key, setStatus).finally(() => readingByKey.delete(key));
    readingByKey.set(key, reading);
    try {
      const { next, saved } = await reading;
      setTable(next);
      if (!saved) setError(t('calendar.saveFailed'));
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

  // カードの長押しで、授業名を直す(タップでは何もしない)
  const cancelPress = () => clearTimeout(pressTimer.current);
  function pressProps(day, period) {
    return {
      onPointerDown: () => {
        cancelPress();
        pressTimer.current = setTimeout(() => startEdit(day, period), LONG_PRESS_MS);
      },
      onPointerUp: cancelPress,
      onPointerLeave: cancelPress,
      onPointerMove: cancelPress,
      onPointerCancel: cancelPress,
      onContextMenu: (e) => e.preventDefault(),
    };
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
          overflowY: 'auto',
          padding: '0.857em 0 1.143em',
          paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.857em',
        }}
      >
        {/* 表示の切り替え(今は授業表だけ。年間行事表と月のカレンダーは準備中) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <select aria-label={t('calendar.viewLabel')} defaultValue="timetable" style={selectStyle}>
            <option value="year" disabled>{t('calendar.viewYear')}</option>
            <option value="month" disabled>{t('calendar.viewMonth')}</option>
            <option value="timetable">{t('calendar.viewTimetable')}</option>
          </select>
        </div>

        {error && <p style={{ color: 'var(--text-strong)', fontSize: '0.857em', margin: 0 }}>{error}</p>}

        {/* 授業表(曜日・1〜7限)。カードを長押しすると、授業名を直せる */}
        <div style={{ flexShrink: 0, background: 'var(--surface-2, var(--surface))', borderRadius: '1.714em', outline: '1px var(--line) solid', outlineOffset: '-1px', padding: '1em' }}>
          <div
            style={{
              display: 'grid',
              containerType: 'inline-size', // 中の大きさを、表の幅に比例させる
              gridTemplateColumns: '0.46fr repeat(6, 1fr)', // 時限の列は、曜日の列の約0.46倍(紙と同じ)
              gap: 0,
            }}
          >
            <div />
            {COLUMNS.map((w, i) => (
              <div key={w} style={{ ...labelStyle, aspectRatio: '6.5 / 1', fontSize: '0.98cqi', color: w === '土' ? 'var(--text-strong)' : 'var(--text-muted)' }}>
                {i === todayIdx ? <span style={todayStyle}>{w}</span> : w}
              </div>
            ))}

            {PERIODS.map((p) => (
              <React.Fragment key={p}>
                <div style={{ ...labelStyle, flexDirection: 'column', fontSize: '1.19cqi', lineHeight: 1.2 }}>
                  <span>{p}</span>
                  <span style={{ fontSize: '0.9cqi', color: 'var(--text-muted)', fontWeight: 400 }}>{startOf(p)}</span>
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
                        style={{ ...cellStyle, font: 'inherit', fontSize: '1.19cqi', padding: '0.7cqi', minWidth: 0 }}
                      />
                    );
                  }
                  const base = theme ? { ...cellStyle, background: shaded(theme.gradient), color: theme.textColor } : name ? cellStyle : emptyCellStyle;
                  return (
                    <div key={`${w}${p}`} role="button" tabIndex={0} aria-label={`${w}曜 ${p}限`} {...pressProps(w, p)} style={base}>
                      {name && <span style={nameStyle}>{shortName(name)}</span>}
                      {name && room && <span style={roomStyle}>{room}</span>}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        <p style={hintStyle}>{t('calendar.editHint')}</p>

        <button type="button" onClick={() => { clearTimetable(key); setTable(null); }} style={{ ...buttonStyle, alignSelf: 'center', flexShrink: 0 }}>{t('calendar.reset')}</button>
      </main>

      <BottomNav active="calendar" onSelect={onSelectTab} />
    </div>
  );
}
