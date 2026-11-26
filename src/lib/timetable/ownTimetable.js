// 授業表(曜日×時限→授業名)の鍵・保存・OCR結果の変換。試作では端末にだけ保存する(GAS・スプレッドシートは次の段階)。
import { storage } from '../data/storage';
import { gradeOf } from '../profile/profile';
import subjects from '../../data/timetableSubjects.json';

export const WEEKDAYS = ['月', '火', '水', '木', '金'];
export const PERIODS = [1, 2, 3, 4, 5, 6, 7];

// 共有の鍵: 1年は「学年-組」(例 1-2)、2・3年は「学年-講座の記号」(例 2-A)。対象外は null
export function timetableKeyOf(studentId, courseLetter) {
  const grade = gradeOf(studentId);
  if (!grade) return null;
  if (grade === 1) return `1-${Number(studentId.slice(2, 4))}`;
  return courseLetter ? `${grade}-${courseLetter}` : null;
}

const storageKey = (key) => 'timetable:' + key;

export function loadTimetable(key) {
  try {
    const raw = storage.get(storageKey(key));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveTimetable(key, table) {
  storage.set(storageKey(key), JSON.stringify(table));
}

// 読み取りで照合する教科名(学年の数字で引く)
export function subjectsFor(key) {
  return subjects[key.split('-')[0]] || [];
}

export function clearTimetable(key) {
  storage.remove(storageKey(key));
}

export function emptyTable() {
  return Object.fromEntries(WEEKDAYS.map((w) => [w, {}]));
}

// 教科名の候補に一致したら、その名前だけを使う(先生の名前・教室は入れない)。一致しなければ、学年の字と空白の後ろを落とす
function nameOf(cell) {
  if (cell.match) return cell.match.candidate;
  return cell.lines.join('').replace(/^\d年/, '').split(/\s+/)[0] || '';
}

// buildGridByLabels の結果を、曜日→時限→授業名の表にする(読めなかった枠は空のまま)
export function tableFromOcr(grid) {
  const table = emptyTable();
  grid.rows.forEach((row) => {
    row.cells.forEach((cell, c) => {
      const day = grid.dayLabels[c];
      if (WEEKDAYS.includes(day) && cell.raw) table[day][row.period] = nameOf(cell);
    });
  });
  return table;
}
