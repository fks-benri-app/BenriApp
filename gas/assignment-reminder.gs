// ==================================================
// 期限のある課題の、1日前リマインド
//
// ・保存時に、期限を dueAt(タイムスタンプ)と reminded(送信済みの印)として保存する(dueFields_)
// ・毎時のトリガー(setupDueReminderTrigger で設定)で sendDueReminders を実行する
// ・JST の 18 時以降に、「明日が期限」の課題を探して送る。送ったら reminded = true にする
// ・授業をオフにしている生徒には送らない(印だけ立てて、二度と見ない)
//
// 注意: この機能を入れる前に保存された課題には dueAt が無いため、リマインドの対象にならない
// 注意: 期限の文字列は Classroom のメールの書き方に合わせて解析する(時刻が無ければ 23:59 とする)
// ==================================================
const REMIND_HOUR_JST = 18;
const DAY_MS = 24 * 60 * 60 * 1000;
const JST_OFFSET = '+09:00';

// 期限の文字列(例: 「11月1日(日) 23:59」「2026年11月1日 15:00」)を、期限の日時(Date)にする。
// 解析できなければ null。pure な関数(テストしやすいように、現在時刻を引数で受ける)
function parseDueDate_(text, nowMs) {
  const s = String(text || '');
  const md = s.match(/(?:(\d{4})年\s*)?(\d{1,2})月\s*(\d{1,2})日/);
  if (!md) return null;
  const jstNow = new Date(nowMs + 9 * 3600 * 1000);
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

// dueAt が [startMs, endMs) の課題を、全生徒から探す(collection group のクエリ)
function queryDueAnnouncements_(startMs, endMs) {
  const res = fsRequest_(
    'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID + '/databases/(default)/documents:runQuery',
    'POST',
    {
      structuredQuery: {
        from: [{ collectionId: 'announcements', allDescendants: true }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { fieldFilter: { field: { fieldPath: 'dueAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: new Date(startMs).toISOString() } } },
              { fieldFilter: { field: { fieldPath: 'dueAt' }, op: 'LESS_THAN', value: { timestampValue: new Date(endMs).toISOString() } } },
            ],
          },
        },
      },
    }
  );
  if (res.getResponseCode() !== 200) throw new Error('課題の検索に失敗: ' + res.getContentText());
  return JSON.parse(res.getContentText())
    .filter(function (row) { return row.document; })
    .map(function (row) {
      // 名前の形: projects/…/documents/users/{生徒ID}/announcements/{docId}
      const parts = row.document.name.split('/');
      const f = row.document.fields || {};
      const str = function (k) { return (f[k] && f[k].stringValue) || ''; };
      return {
        docId: parts[parts.length - 1],
        studentId: parts[parts.length - 3],
        title: str('title'),
        courseName: str('courseName'),
        link: str('link'),
        dueDate: str('dueDate'),
        reminded: !!(f.reminded && f.reminded.booleanValue),
        deleted: !!(f.deleted && f.deleted.booleanValue),
      };
    });
}

// 送信済みの印を立てる(ほかの項目は変えない)
function markReminded_(r) {
  const res = fsRequest_(
    fsDocUrl_('/users/' + encodeURIComponent(r.studentId) + '/announcements/' + encodeURIComponent(r.docId)) +
      '?updateMask.fieldPaths=reminded',
    'patch',
    { fields: { reminded: { booleanValue: true } } }
  );
  if (res.getResponseCode() >= 300) console.error('リマインドの印を付けられませんでした: ' + res.getContentText());
}

// 毎時のトリガーから呼ぶ。JST の 18 時以降に、明日が期限の課題を送る
function sendDueReminders() {
  const now = Date.now();
  const jstHour = Number(Utilities.formatDate(new Date(now), 'Asia/Tokyo', 'H'));
  if (jstHour < REMIND_HOUR_JST) return;

  // 明日(JST)の0時から、明後日の0時までの期限
  const jstDay = Utilities.formatDate(new Date(now), 'Asia/Tokyo', 'yyyy-MM-dd');
  const tomorrowStart = new Date(jstDay + 'T00:00:00' + JST_OFFSET).getTime() + DAY_MS;

  const rows = queryDueAnnouncements_(tomorrowStart, tomorrowStart + DAY_MS);
  rows.forEach(function (r) {
    if (r.reminded || r.deleted) return;
    const prefs = getNotifyPrefs_(r.studentId);
    if (!notifyAllowed_(prefs, courseIdFromLink_(r.link))) {
      markReminded_(r); // 授業をオフにしている生徒には送らない。二度と見ない
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
      if (res && res.id) markReminded_(r); // 送れたときだけ印を立てる(失敗したら次の時間にやり直す)
    } catch (e) {
      console.error('リマインド送信に失敗(' + r.docId + '): ' + e);
    }
  });
}

// 1回だけ実行する: 毎時の trigger を設定する(同じ関数の trigger があれば、作り直す)
function setupDueReminderTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendDueReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDueReminders').timeBased().everyHours(1).create();
}
