// 授業 ID を base64 のまま書いてしまった投稿を、数字の授業 ID に移す。開発者が中央の GAS で手動実行する。
// 先に repairCourseIdsDryRun で移す数を確かめ、問題なければ repairCourseIdsRun を 1 回実行する。
// 移したあと、base64 の投稿と授業の文書は消す。数字の側に同じ投稿があれば上書きする(何度実行しても同じ結果)。

function repairCourseIdsDryRun() { return repairCourseIds_(false); }
function repairCourseIdsRun() { return repairCourseIds_(true); }

function repairCourseIds_(write) {
  const report = { courses: 0, posts: 0, skipped: 0 };
  fsListDocs_('/courses').forEach(function (doc) {
    const encId = doc.name.split('/').pop();
    if (/^\d+$/.test(encId)) return; // 数字の授業は触らない
    const numId = decodeClassroomId_(encId);
    if (!/^\d+$/.test(numId)) { report.skipped++; return; } // 数字に戻らないものは、そのまま残す
    report.courses++;
    fsListDocs_('/courses/' + encodeURIComponent(encId) + '/posts').forEach(function (p) {
      const postId = p.name.split('/').pop();
      report.posts++;
      if (!write) return;
      const fields = Object.assign({}, p.fields, { courseId: { stringValue: numId } });
      const moved = fsRequest_(fsDocUrl_('/courses/' + numId + '/posts/' + encodeURIComponent(postId)), 'patch', { fields: fields });
      if (moved.getResponseCode() >= 300) throw new Error('移動に失敗: ' + postId + ' ' + moved.getContentText());
      fsRequest_(fsDocUrl_('/courses/' + encodeURIComponent(encId) + '/posts/' + encodeURIComponent(postId)), 'delete');
    });
    if (write) fsRequest_(fsDocUrl_('/courses/' + encodeURIComponent(encId)), 'delete');
  });
  console.log(JSON.stringify(report));
  return report;
}
