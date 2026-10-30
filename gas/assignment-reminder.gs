// ==================================================
// リマインド(課題の期限・未読のお知らせ)
//
// ・保存時に、期限を dueAt、既読を read(false)、送信済みの印を reminded / unreadNotified として保存する
// ・毎時のトリガー(setupDueReminderTrigger で設定)で次の2つを実行する
//   1. sendDueReminders: 課題の期限の知らせ。生徒ごとの「何日前」(notifyPrefs.remindAssignment)に合う課題を、JST の18時以降に送る
//   2. sendUnreadReminders: 未読のお知らせの再通知。受け取ってから、生徒ごとの時間(notifyPrefs.remindUnread)がたったら送る
// ・授業をオフにしている生徒には送らない(印だけ立てて、二度と見ない)
// ・送った印は、その生徒のお知らせ(users/{ID}/announcements/{docId})に付く。生徒ごとに別なので、二重に送らない
//
// 注意: この機能を入れる前に保存されたお知らせには、dueAt や read が無いため、対象にならない
// 注意: 検索には Firestore の複合インデックスが要る(初回の実行時にエラーのリンクから作成する)
// ==================================================
const REMIND_HOUR_JST = 18;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const JST_OFFSET = '+09:00';

// 期限の文字列(例: 「11月1日(日) 23:59」「2026年11月1日 15:00」)を、期限の日時(Date)にする。
// 解析できなければ null。pure な関数(テストしやすいように、現在時刻を引数で受ける)
function parseDueDate_(text, nowMs) {
  const s = String(text || '');
  const md = s.match(/(?:(\d{4})年\s*)?(\d{1,2})月\s*(\d{1,2})日/);
  if (!md) return null;
  const jstNow = new Date(nowMs + 9 * HOUR_MS);
  const year = md[1] ? Number(md[1]) : jstNow.getUTCFullYear();
  const month = Number(md[2]);
  const day = Number(md[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null; // 12月32日のような入力は、解析しない
  const tm = s.match(/(\d{1,2}):(\d{2})/);
  const hh = tm ? Number(tm[1]) : 23;
  const mm = tm ? Number(tm[2]) : 59;
  const build = function (y) { return new Date(Date.UTC(y, month - 1, day, hh - 9, mm)); }; // JST → UTC
  let due = build(year);
  // 年の書き方が無く、今より半年以上前になるときは、翌年の日付とみなす(12月の投稿に1月の期限が付く場合)
  if (!md[1] && due.getTime() < nowMs - 183 * DAY_MS) due = build(year + 1);
  return isNaN(due.getTime()) ? null : due;
}

// 保存する項目(期限が解析できた課題だけ、dueAt と reminded を付ける)
function dueFields_(rec) {
  const due = parseDueDate_(rec.dueDate, Date.now());
  if (!due) return {};
  return {
    dueAt: { timestampValue: due.toISOString() },
    reminded: { booleanValue: false },
  };
}

// JST の日付(yyyy-MM-dd)と、その日の0時(ミリ秒)
function jstDateOf_(ms) { return Utilities.formatDate(new Date(ms), 'Asia/Tokyo', 'yyyy-MM-dd'); }
function jstMidnight_(ymd) { return new Date(ymd + 'T00:00:00' + JST_OFFSET).getTime(); }
function jstHourOf_(ms) { return Number(Utilities.formatDate(new Date(ms), 'Asia/Tokyo', 'H')); }

// Firestore の条件(fieldFilter)
function ff_(field, op, value) {
  return { fieldFilter: { field: { fieldPath: field }, op: op, value: value } };
}
function tsv_(ms) { return { timestampValue: new Date(ms).toISOString() }; }

// 全生徒のお知らせから、条件に合うものを探す(collection group)
function queryAnnouncements_(filters) {
  const res = fsRequest_(
    'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID + '/databases/(default)/documents:runQuery',
    'POST',
    {
      structuredQuery: {
        from: [{ collectionId: 'announcements', allDescendants: true }],
        where: { compositeFilter: { op: 'AND', filters: filters } },
      },
    }
  );
  if (res.getResponseCode() !== 200) throw new Error('お知らせの検索に失敗: ' + res.getContentText());
  return JSON.parse(res.getContentText())
    .filter(function (row) { return row.document; })
    .map(function (row) {
      // 名前の形: projects/…/documents/users/{生徒ID}/announcements/{docId}
      const parts = row.document.name.split('/');
      const f = row.document.fields || {};
      const str = function (k) { return (f[k] && f[k].stringValue) || ''; };
      const flag = function (k) { return !!(f[k] && f[k].booleanValue); };
      const ts = function (k) { return f[k] && f[k].timestampValue ? Date.parse(f[k].timestampValue) : NaN; };
      return {
        docId: parts[parts.length - 1],
        studentId: parts[parts.length - 3],
        title: str('title'),
        courseName: str('courseName'),
        link: str('link'),
        dueDate: str('dueDate'),
        dueAtMs: ts('dueAt'),
        receivedAtMs: ts('receivedAt'),
        read: flag('read'),
        reminded: flag('reminded'),
        unreadNotified: flag('unreadNotified'),
        deleted: flag('deleted'),
      };
    });
}

// 生徒のお知らせに、送った印を立てる(ほかの項目は変えない)
function markFlag_(r, field) {
  const res = fsRequest_(
    fsDocUrl_('/users/' + encodeURIComponent(r.studentId) + '/announcements/' + encodeURIComponent(r.docId)) +
      '?updateMask.fieldPaths=' + field,
    'patch',
    { fields: (function () { const o = {}; o[field] = { booleanValue: true }; return o; })() }
  );
  if (res.getResponseCode() >= 300) console.error('印を付けられませんでした(' + field + '): ' + res.getContentText());
}

// 同じ実行の中で、生徒の設定を何度も読まないための箱
function prefsCacheFor_(cache, studentId) {
  if (!cache[studentId]) cache[studentId] = getNotifyPrefs_(studentId);
  return cache[studentId];
}

// 課題の期限の知らせ。毎時のトリガーから呼ぶ。JST の18時以降に、生徒が設定した「何日前」に当たる課題を送る
function sendDueReminders() {
  const now = Date.now();
  if (jstHourOf_(now) < REMIND_HOUR_JST) return;

  const todayStart = jstMidnight_(jstDateOf_(now));
  // 明日から3日後の0時まで(設定できる最大は3日前)
  const rows = queryAnnouncements_([
    ff_('dueAt', 'GREATER_THAN_OR_EQUAL', tsv_(todayStart + DAY_MS)),
    ff_('dueAt', 'LESS_THAN', tsv_(todayStart + 4 * DAY_MS)),
  ]);
  const cache = {};
  rows.forEach(function (r) {
    if (r.reminded || r.deleted || isNaN(r.dueAtMs)) return;
    const prefs = prefsCacheFor_(cache, r.studentId);
    if (!prefs.remindAssignment.on) return;
    // 期限の日の0時と、今日の0時の差(日数)が、設定の「何日前」と同じなら送る
    const daysUntil = Math.round((jstMidnight_(jstDateOf_(r.dueAtMs)) - todayStart) / DAY_MS);
    if (daysUntil !== prefs.remindAssignment.daysBefore) return;
    if (!notifyAllowed_(prefs, courseIdFromLink_(r.link))) {
      markFlag_(r, 'reminded'); // 授業をオフにしている生徒には送らない。二度と見ない
      return;
    }
    try {
      const res = sendDirectNotification_(
        pushTargets_(r.studentId),
        r.courseName || '課題',
        '明日が期限: ' + r.title + (r.dueDate ? '(期限: ' + r.dueDate + ')' : ''),
        APP_URL + '?open=' + encodeURIComponent(r.docId)
      );
      recordPushResult_(r.studentId, res);
      if (res && res.id) markFlag_(r, 'reminded'); // 送れたときだけ印を立てる
    } catch (e) {
      console.error('期限の知らせに失敗(' + r.docId + '): ' + e);
    }
  });
}

// 未読のお知らせの再通知。毎時のトリガーから呼ぶ。受け取ってから、生徒が設定した時間がたった未読を送る
function sendUnreadReminders() {
  const now = Date.now();
  // 最短の12時間前から、14日前までの未読を見る(それより新しいもの・古いものは対象外)
  const rows = queryAnnouncements_([
    ff_('read', 'EQUAL', { booleanValue: false }),
    ff_('receivedAt', 'LESS_THAN_OR_EQUAL', tsv_(now - 12 * HOUR_MS)),
    ff_('receivedAt', 'GREATER_THAN', tsv_(now - 14 * DAY_MS)),
  ]);
  const cache = {};
  rows.forEach(function (r) {
    if (r.read || r.unreadNotified || r.deleted || isNaN(r.receivedAtMs)) return;
    const prefs = prefsCacheFor_(cache, r.studentId);
    if (!prefs.remindUnread.on) return;
    if (now - r.receivedAtMs < prefs.remindUnread.afterHours * HOUR_MS) return; // まだ時間がたっていない
    if (!notifyAllowed_(prefs, courseIdFromLink_(r.link))) {
      markFlag_(r, 'unreadNotified');
      return;
    }
    try {
      const res = sendDirectNotification_(
        pushTargets_(r.studentId),
        r.courseName || 'お知らせ',
        '未読のお知らせ: ' + r.title,
        APP_URL + '?open=' + encodeURIComponent(r.docId)
      );
      recordPushResult_(r.studentId, res);
      if (res && res.id) markFlag_(r, 'unreadNotified');
    } catch (e) {
      console.error('未読の再通知に失敗(' + r.docId + '): ' + e);
    }
  });
}

// 1回だけ実行する: 2つの処理の毎時 trigger を設定する(既存の trigger は作り直す)
function setupDueReminderTrigger() {
  const names = ['sendDueReminders', 'sendUnreadReminders'];
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (names.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  names.forEach(function (name) {
    ScriptApp.newTrigger(name).timeBased().everyHours(1).create();
  });
}
