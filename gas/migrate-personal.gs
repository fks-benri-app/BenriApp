// 古い授業の投稿を、生徒ごとの users/{ID}/announcements に移す(一度だけ使う。中央の GAS から実行)。
// 手順: まず migratePersonalDryRun(件数だけ数える)→ 問題なければ migratePersonalRun(日数の範囲を指定)。
// 既に生徒ごとに書かれている文書は上書きしない(createOnly)。移した分は既読・リマインド済みで書く(通知の洪水を防ぐ)。
// 1回の実行で書く数に上限(MIGRATE_MAX_WRITES)を置く。Firestore の書き込みは 1日 20,000 件まで。

const MIGRATE_MAX_WRITES = 4000;   // 1回の実行で書く生徒ごとの文書の数の上限
const MIGRATE_POST_LIMIT = 300;    // 1回の範囲で読む投稿の上限(超えたら、範囲を狭めて再実行する)

function migratePersonalDryRun() {
  return migratePersonal_(7, 0, false);
}

// fromDaysAgo 日前から toDaysAgo 日前までの投稿を移す(例: 14, 7 → 14日前〜7日前)
function migratePersonalRun(fromDaysAgo, toDaysAgo) {
  return migratePersonal_(fromDaysAgo, toDaysAgo, true);
}

function migratePersonal_(fromDaysAgo, toDaysAgo, write) {
  const report = { posts: 0, skipped: 0, members: 0, written: 0, failed: 0, stoppedAtLimit: false };
  const now = Date.now();
  const from = new Date(now - fromDaysAgo * DAY_MS).toISOString();
  const to = new Date(now - toDaysAgo * DAY_MS).toISOString();
  const posts = fetchPostsInWindow_(from, to);
  if (posts.length >= MIGRATE_POST_LIMIT) console.warn('投稿が上限に達しました。範囲を狭めて再実行してください');

  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const f = p.fields;
    const ref = parsePostLink_(f.link && f.link.stringValue);
    if (!ref || (f.deleted && f.deleted.booleanValue)) { report.skipped++; continue; }
    report.posts++;
    const members = listMembers_(ref.courseId);
    report.members += members.length;
    if (!write) continue;
    if (report.written + members.length > MIGRATE_MAX_WRITES) { report.stoppedAtLimit = true; break; }

    const rec = recordFromPostFields_(f);
    const saved = saveAnnouncementsFor_(members, ref.postKey, rec, { read: true, reminded: true, createOnly: true });
    report.written += saved.length;
    report.failed += members.length - saved.length; // 既にある分(409)も含む
  }
  console.log(JSON.stringify(report));
  return report;
}

// 投稿の項目を、saveAnnouncementsFor_ が受け取る形(saveAnnouncement_ と同じ)に直す
function recordFromPostFields_(f) {
  const s = function (k) { return f[k] ? f[k].stringValue || '' : ''; };
  let attachments = [];
  try { attachments = JSON.parse(s('attachments') || '[]'); } catch (e) { attachments = []; }
  return {
    category: s('category'),
    courseName: s('courseName'),
    title: s('title'),
    description: s('description'),
    dueDate: s('dueDate'),
    link: s('link'),
    teacher: s('teacher'),
    receivedAt: f.receivedAt ? f.receivedAt.timestampValue : new Date().toISOString(),
    body: s('body'),
    attachments: attachments,
    rawBody: s('rawBody'),
    postTitle: s('postTitle'),
    deleted: false,
  };
}

// 範囲の投稿(courses/*/posts)を、受信日時で読む(コレクション グループ)
// shortcut: 上限 MIGRATE_POST_LIMIT を超える範囲は、1回では全部読めない。範囲を分けて実行する
function fetchPostsInWindow_(fromIso, toIso) {
  const url = 'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID +
    '/databases/(default)/documents:runQuery';
  const res = fsRequest_(url, 'post', {
    structuredQuery: {
      from: [{ collectionId: 'posts', allDescendants: true }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            { fieldFilter: { field: { fieldPath: 'receivedAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: fromIso } } },
            { fieldFilter: { field: { fieldPath: 'receivedAt' }, op: 'LESS_THAN', value: { timestampValue: toIso } } },
          ],
        },
      },
      orderBy: [{ field: { fieldPath: 'receivedAt' }, direction: 'ASCENDING' }],
      limit: MIGRATE_POST_LIMIT,
    },
  });
  if (res.getResponseCode() >= 300) throw new Error('投稿の取得失敗: ' + res.getContentText());
  return JSON.parse(res.getContentText())
    .filter(function (row) { return row.document; })
    .map(function (row) { return row.document; });
}
