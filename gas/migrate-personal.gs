// 古い授業の投稿を、生徒ごとの users/{ID}/announcements に移す(一度だけ使う。中央の GAS から実行)。
// 手順: まず migratePersonalDryRun(件数だけ数える)→ 問題なければ migratePersonalRun(日数の範囲を指定)。
// 既に生徒ごとに書かれている文書は上書きしない(createOnly)。移した分は既読・リマインド済みで書く(通知の洪水を防ぐ)。
// 1回の実行で書く数に上限(MIGRATE_MAX_WRITES)を置く。Firestore の書き込みは 1日 20,000 件まで。

const MIGRATE_MAX_WRITES = 4000;   // 1回の実行で書く生徒ごとの文書の数の上限
const MIGRATE_POST_LIMIT = 300;    // 投稿を読むときの1ページの件数

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

// 範囲の投稿を、全授業から読む(コレクション グループ posts を、ID 順にページ分けして読み、受信日時は JS で絞る)。
// 受信日時の範囲検索は複合インデックスが要るため使わない。授業の一覧(documents.list)は、項目の無い授業を返さないため使わない。
// shortcut: 全投稿を読むので読み取りが増える(投稿は保存期間の14日分だけ)。投稿が数千件を超えたら、索引を作って範囲検索に戻す
function fetchPostsInWindow_(fromIso, toIso) {
  const url = 'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID + '/databases/(default)/documents:runQuery';
  const fromMs = Date.parse(fromIso);
  const toMs = Date.parse(toIso);
  const posts = [];
  let last = null;
  for (let page = 0; page < 200; page++) {
    const structuredQuery = {
      from: [{ collectionId: 'posts', allDescendants: true }],
      orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
      limit: MIGRATE_POST_LIMIT,
    };
    if (last) structuredQuery.startAt = { values: [{ referenceValue: last }], before: false };
    const res = fsRequest_(url, 'post', { structuredQuery: structuredQuery });
    if (res.getResponseCode() >= 300) throw new Error('投稿の取得失敗: ' + res.getContentText());
    const rows = JSON.parse(res.getContentText()).filter(function (row) { return row.document; });
    if (rows.length === 0) break;
    rows.forEach(function (row) {
      const f = row.document.fields || {};
      const t = Date.parse(f.receivedAt ? f.receivedAt.timestampValue : '');
      if (t >= fromMs && t < toMs) posts.push(row.document);
    });
    last = rows[rows.length - 1].document.name;
    if (rows.length < MIGRATE_POST_LIMIT) break;
  }
  return posts;
}
