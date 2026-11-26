// 授業 ID を base64 のまま書いてしまった投稿を、数字の授業 ID に移す。開発者が中央の GAS で手動実行する。
// 先に repairCourseIdsDryRun で移す数を確かめ、問題なければ repairCourseIdsRun を 1 回実行する。
// 移したあと、base64 の投稿は消す。数字の側に同じ投稿があれば上書きする(何度実行しても同じ結果)。
// 親の授業の文書が無い(投稿だけある)授業も見つけるため、授業の一覧ではなく投稿の一覧を読む。

function repairCourseIdsDryRun() { return repairCourseIds_(false); }
function repairCourseIdsRun() { return repairCourseIds_(true); }

function repairCourseIds_(write) {
  const report = { courses: 0, posts: 0, skipped: 0 };
  const courses = {};
  fsAllPosts_(function (name, fields) {
    const m = name.match(/\/courses\/([^/]+)\/posts\/([^/]+)$/);
    if (!m) return;
    const encId = m[1];
    const postId = m[2];
    if (/^\d+$/.test(encId)) return; // 数字の授業は触らない
    const numId = decodeClassroomId_(encId);
    if (!/^\d+$/.test(numId)) { report.skipped++; return; } // 数字に戻らないものは、そのまま残す
    courses[encId] = true;
    report.posts++;
    if (!write) return;
    const moved = fsRequest_(
      fsDocUrl_('/courses/' + numId + '/posts/' + encodeURIComponent(postId)),
      'patch',
      { fields: Object.assign({}, fields, { courseId: { stringValue: numId } }) }
    );
    if (moved.getResponseCode() >= 300) throw new Error('移動に失敗: ' + postId + ' ' + moved.getContentText());
    fsRequest_(fsDocUrl_('/courses/' + encodeURIComponent(encId) + '/posts/' + encodeURIComponent(postId)), 'delete');
  });
  report.courses = Object.keys(courses).length;
  console.log(JSON.stringify(report));
  return report;
}

// すべての授業の投稿を、名前の順に 300 件ずつ読む(親の授業の文書が無くても読める)
function fsAllPosts_(fn) {
  const url = 'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID + '/databases/(default)/documents:runQuery';
  let last = null;
  for (let i = 0; i < 10000; i++) {
    const q = {
      from: [{ collectionId: 'posts', allDescendants: true }],
      orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
      limit: 300,
    };
    if (last) q.startAfter = { values: [{ referenceValue: last }], before: false };
    const res = fsRequest_(url, 'post', { structuredQuery: q });
    if (res.getResponseCode() >= 300) throw new Error('投稿の一覧の取得失敗: ' + res.getContentText());
    const rows = JSON.parse(res.getContentText()).filter(function (r) { return r.document; });
    rows.forEach(function (r) { fn(r.document.name, r.document.fields || {}); });
    if (rows.length < 300) break;
    last = rows[rows.length - 1].document.name;
  }
}
