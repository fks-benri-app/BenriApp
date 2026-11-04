// ==================================================
// 授業単位の投稿の保存(仕様書の移行手順5: テスト用のデータで試す)
//
// 保存先: courses/{授業ID}/posts/{投稿ID}(全員宛て・授業ごとに1件)
//  ・書くのは GAS だけ。読めるのは、その授業のメンバー(セキュリティルールは移行前に検証する)。
//  ・updatedAt は、差分の同期(アプリ側)で使う。deleted は、削除の印。
//  ・expireAt は、古いデータの掃除で使う。掃除の対象に含めるのは、クリーンアップを拡張してから。
//
// 注意
//  ・USE_COURSE_STORE が false の間は、どこからも呼ばれない。既存の保存の動きは変わらない。
//  ・testCourseStore は、テスト用の授業(test-course)に1件だけ書く。
//    掃除の対象になるまで、Firestore のコンソールで手動で消す。
// ==================================================
const USE_COURSE_STORE = false; // テストが済むまで false のまま。切り替えは別のPRで行う
const COURSE_POST_TTL_DAYS = 14;

// 授業の投稿の中身(Firestore の fields)。個人の既読などは含めない
function courseFieldsFor_(rec, updatedAtMs, deleted) {
  const str = function (v) { return { stringValue: v || '' }; };
  const fields = {
    courseName: str(rec.courseName),
    category: str(rec.category),
    title: str(rec.title),
    description: str(rec.description),
    dueDate: str(rec.dueDate),
    link: str(rec.link),
    teacher: str(rec.teacher),
    body: str(rec.body),
    rawBody: str(rec.rawBody),
    postTitle: str(rec.postTitle),
    attachments: str(JSON.stringify(rec.attachments || [])),
    receivedAt: { timestampValue: new Date(rec.receivedAt).toISOString() },
    updatedAt: { timestampValue: new Date(updatedAtMs).toISOString() },
    deleted: { booleanValue: !!deleted },
    expireAt: { timestampValue: new Date(Date.now() + COURSE_POST_TTL_DAYS * DAY_MS).toISOString() },
  };
  const due = parseDueDate_(rec.dueDate, Date.now()); // 期限が読めた投稿だけ dueAt を入れる(アプリの並べ替え用)
  if (due) fields.dueAt = { timestampValue: due.toISOString() };
  return fields;
}

// 授業の投稿を1件保存する(同じ投稿IDなら上書き。重複しない)
// courseId と postId は、投稿のリンクから parsePostLink_ で取ったものを使う
function saveCoursePost_(courseId, postId, rec, updatedAtMs, deleted) {
  const res = fsRequest_(
    fsDocUrl_('/courses/' + encodeURIComponent(courseId) + '/posts/' + encodeURIComponent(postId)),
    'patch',
    { fields: courseFieldsFor_(rec, updatedAtMs, deleted) }
  );
  if (res.getResponseCode() >= 300) {
    throw new Error('授業の投稿の保存に失敗(' + res.getResponseCode() + '): ' + res.getContentText());
  }
}

// GAS エディタから手動で実行する。テスト用の授業に、1件だけ書く
function testCourseStore() {
  const postId = 'test-' + Date.now();
  saveCoursePost_('test-course', postId, {
    category: '新しい課題',
    courseName: 'テスト授業',
    title: '授業の投稿の保存テスト',
    description: '授業単位の保存の確認',
    dueDate: '',
    link: '',
    teacher: 'テスト先生',
    body: '',
    rawBody: '',
    postTitle: '',
    attachments: [],
    receivedAt: new Date(),
  }, Date.now(), false);
  Logger.log('保存: courses/test-course/posts/' + postId);
}
