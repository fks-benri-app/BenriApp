// ==================================================
// 既存のお知らせを、授業ごとの保存(courses/{授業ID}/posts)へ移す(仕様書の移行手順6)
//
// 方針
//  ・手動で動かす。時間のトリガーには入れない。まず migrationDryRun() で件数を確かめる。
//  ・同じ投稿(postId が同じもの)は、全員分の保存を1件にまとめる。代表は次の順で選ぶ:
//      削除済み(deleted)を優先 → 本文(rawBody)が長い → 添付が多い。receivedAt は一番古いものにする。
//  ・既読は、生徒ごとの readState/main の reads に、投稿ID → 既読の時刻(ミリ秒)として移す。
//  ・link が無く投稿IDを作れないお知らせは、移さない(仕様書の決定事項 14)。
//  ・旧データ(users/*/announcements)は消さない。確認が済むまで残す(削除は別の関数で、手動で行う)。
//  ・途中で止まっても、続きから再開できるように、どこまで読んだかを残す(MIGRATION_CURSOR_KEY)。
// ==================================================
const MIGRATION_CURSOR_KEY = 'migrateCourseCursor';
const MIGRATION_PAGE_SIZE = 100;
const MIGRATION_TIME_BUDGET_MS = 4 * 60 * 1000; // GAS の実行時間の上限(6分)の手前で止める

// 1件のお知らせの中身を、courseFieldsFor_ が使う形にそろえる
function migrationRecOf_(f) {
  const str = function (k) { return (f[k] && f[k].stringValue) || ''; };
  const flag = function (k) { return !!(f[k] && f[k].booleanValue); };
  const ts = function (k) { return f[k] && f[k].timestampValue ? Date.parse(f[k].timestampValue) : NaN; };
  let attachments = [];
  try { attachments = JSON.parse(str('attachments') || '[]'); } catch (e) { attachments = []; }
  return {
    category: str('category'),
    courseName: str('courseName'),
    title: str('title'),
    description: str('description'),
    dueDate: str('dueDate'),
    link: str('link'),
    teacher: str('teacher'),
    body: str('body'),
    rawBody: str('rawBody'),
    postTitle: str('postTitle'),
    attachments: attachments,
    receivedAtMs: ts('receivedAt'),
    deleted: flag('deleted'),
    read: flag('read'),
    readAtMs: ts('readAt'),
  };
}

// 同じ投稿の複数の保存から、代表を1つ選ぶ(上の方針)
function pickRepresentative_(a, b) {
  if (a.rec.deleted !== b.rec.deleted) return a.rec.deleted ? a : b;
  const la = (a.rec.rawBody || '').length, lb = (b.rec.rawBody || '').length;
  if (la !== lb) return la > lb ? a : b;
  if (a.rec.attachments.length !== b.rec.attachments.length) return a.rec.attachments.length > b.rec.attachments.length ? a : b;
  return a;
}

// お知らせを1ページ分読む(collection group の順番で、名前の順)。cursorName より後ろを読む
function migrationPage_(cursorName) {
  const structured = {
    from: [{ collectionId: 'announcements', allDescendants: true }],
    orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
    limit: MIGRATION_PAGE_SIZE,
  };
  if (cursorName) {
    structured.startAt = { values: [{ referenceValue: cursorName }], before: false };
  }
  const res = fsRequest_(
    'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID + '/databases/(default)/documents:runQuery',
    'POST',
    { structuredQuery: structured }
  );
  if (res.getResponseCode() !== 200) throw new Error('移行: お知らせの読み取りに失敗: ' + res.getContentText());
  return JSON.parse(res.getContentText()).filter(function (row) { return row.document; }).map(function (row) {
    const parts = row.document.name.split('/'); // …/documents/users/{生徒ID}/announcements/{docId}
    return {
      name: row.document.name,
      studentId: parts[parts.length - 3],
      docId: parts[parts.length - 1],
      f: row.document.fields || {},
    };
  });
}

// 1回の実行で、時間の上限までページを読み、授業ごとの投稿と既読を書く(dryRun のときは書かない)。
// 戻り値は件数の報告。途中で時間切れになったら、続きの位置を覚えて、次の実行で続きから読む。
function migrateAnnouncementsToCourses_(dryRun) {
  const props = PropertiesService.getScriptProperties();
  const startedAt = Date.now();
  const report = { read: 0, skippedNoLink: 0, posts: 0, readStates: 0, done: false, dryRun: !!dryRun };
  const merged = {}; // postId → { courseId, best, receivedAtMs, readers: [{studentId, readAtMs}] }
  // 本番では、前回の続きから読む。dryRun は、いつも最初から数えて、位置は覚えない
  let cursor = dryRun ? '' : (props.getProperty(MIGRATION_CURSOR_KEY) || '');
  let lastCursor = cursor;

  while (Date.now() - startedAt < MIGRATION_TIME_BUDGET_MS) {
    const rows = migrationPage_(cursor);
    if (rows.length === 0) { report.done = true; break; }
    rows.forEach(function (r) {
      report.read++;
      const rec = migrationRecOf_(r.f);
      const ref = parsePostLink_(rec.link);
      if (!ref) { report.skippedNoLink++; return; }
      const cur = merged[ref.postId];
      const item = { courseId: ref.courseId, rec: rec };
      if (!cur) {
        merged[ref.postId] = { courseId: ref.courseId, best: item, receivedAtMs: rec.receivedAtMs, readers: [] };
      } else {
        cur.best = { courseId: cur.courseId, rec: pickRepresentative_(cur.best, item).rec };
        if (!isNaN(rec.receivedAtMs) && (isNaN(cur.receivedAtMs) || rec.receivedAtMs < cur.receivedAtMs)) cur.receivedAtMs = rec.receivedAtMs;
      }
      if (rec.read && !isNaN(rec.readAtMs)) merged[ref.postId].readers.push({ studentId: r.studentId, readAtMs: rec.readAtMs });
    });
    cursor = rows[rows.length - 1].name;
    lastCursor = cursor;
  }

  Object.keys(merged).forEach(function (postId) {
    const m = merged[postId];
    report.posts++;
    report.readStates += m.readers.length;
    if (dryRun) return;
    const rec = m.best.rec;
    rec.receivedAt = new Date(isNaN(m.receivedAtMs) ? Date.now() : m.receivedAtMs);
    saveCoursePost_(m.courseId, postId, rec, Date.now(), rec.deleted);
    m.readers.forEach(function (rd) { markReadMigrated_(rd.studentId, postId, rd.readAtMs); });
  });

  // 書き終わってから、位置を覚える。途中で止まっても、次は同じところから読み直す(書き込みは何度やっても同じ結果)
  if (!dryRun) {
    if (report.done) props.deleteProperty(MIGRATION_CURSOR_KEY);
    else if (lastCursor) props.setProperty(MIGRATION_CURSOR_KEY, lastCursor);
  }
  return report;
}

// 生徒の既読(readState/main の reads)に、投稿ごとの既読の時刻を入れる。ほかの既読は消さない
function markReadMigrated_(studentId, postId, readAtMs) {
  const path = '/users/' + encodeURIComponent(studentId) + '/readState/main';
  const field = 'reads.' + postId;
  const res = fsRequest_(
    fsDocUrl_(path) + '?updateMask.fieldPaths=' + encodeURIComponent(field),
    'patch',
    { fields: { reads: { mapValue: { fields: (function () { const o = {}; o[postId] = { integerValue: String(readAtMs) }; return o; })() } } } }
  );
  if (res.getResponseCode() >= 300) throw new Error('移行: 既読の保存に失敗(' + res.getResponseCode() + '): ' + res.getContentText());
}

// 手動で動かす: 件数だけ確かめる(何も書かない)
function migrationDryRun() {
  Logger.log(JSON.stringify(migrateAnnouncementsToCourses_(true)));
}

// 手動で動かす: 書く。migrationDryRun の結果を確かめてから実行する。続きがあれば、もう一度実行する
function migrationRun() {
  Logger.log(JSON.stringify(migrateAnnouncementsToCourses_(false)));
}

// 手動で動かす: 最初からやり直す(続きの位置を消す)。同じ投稿は上書きになるので、二重にはならない
function migrationResetCursor() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRATION_CURSOR_KEY);
}
