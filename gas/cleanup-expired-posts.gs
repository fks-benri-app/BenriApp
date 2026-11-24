// ==================================================
// 期限切れの posts を消す(Firestore の TTL を使わない方法)
//
// 使い方(一度だけ)
//  1. このファイルを Apps Script に貼り付ける(shared-notify.gs と同じプロジェクト)。
//  2. setupCleanupTrigger() を手動で1回実行する(毎日 3 時に cleanupExpiredPosts を動かす設定)。
//
// 仕組み
//  expireAt(Timestamp)が今より前の posts を探して削除する。対象は次の2つ。
//    ・posts/{鍵}(shared-notify.gs の claimPost_。作成から SHARE_RECORD_TTL_DAYS 日後)
//    ・courses/{授業ID}/posts/{投稿ID}(course-store.gs の saveCoursePost_。作成から COURSE_POST_TTL_DAYS 日後)
//  後者は別の階層にあるので、collectionGroup(allDescendants)で両方を探す。
//  1回の実行は CLEANUP_TIME_BUDGET_MS で止める(GAS の 6 分の上限を超えないため。残りは翌日の実行で消える)。
//  Firestore の課金は不要(GAS から REST で呼ぶだけ)。
// ==================================================
const CLEANUP_BATCH_SIZE = 300;   // 1回の問い合わせで取る件数
const CLEANUP_MAX_ROUNDS = 50;    // 1回の実行での上限(暴走防止)
const CLEANUP_TIME_BUDGET_MS = 4 * 60 * 1000; // 1回の実行の時間の上限(GAS の 6 分より前で止める)

function cleanupExpiredPosts() {
  const nowIso = new Date().toISOString();
  const startedAt = Date.now();
  let deletedTotal = 0;
  for (let round = 0; round < CLEANUP_MAX_ROUNDS; round++) {
    if (Date.now() - startedAt > CLEANUP_TIME_BUDGET_MS) {
      console.log('time budget reached; rest will be done next run');
      break;
    }
    const res = fsRequest_(
      'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID +
        '/databases/(default)/documents:runQuery',
      'POST',
      {
        structuredQuery: {
          // allDescendants: true で、posts/{鍵} と courses/{授業ID}/posts/{投稿ID} の両方を探す
          from: [{ collectionId: 'posts', allDescendants: true }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'expireAt' },
              op: 'LESS_THAN',
              value: { timestampValue: nowIso },
            },
          },
          limit: CLEANUP_BATCH_SIZE,
        },
      }
    );
    if (res.getResponseCode() !== 200) {
      console.error('cleanup query failed: ' + res.getResponseCode() + ' ' + res.getContentText());
      break;
    }
    const names = JSON.parse(res.getContentText())
      .filter(function (row) { return row.document; })
      .map(function (row) { return row.document.name; });
    if (names.length === 0) break;

    let deletedThisRound = 0;
    names.forEach(function (name) {
      // name は "projects/.../documents/posts/{鍵}" の形。fsDocUrl_ と同じ基準の URL にする
      const del = fsRequest_('https://firestore.googleapis.com/v1/' + name, 'DELETE');
      if (del.getResponseCode() === 200) deletedThisRound++;
      else console.error('delete failed: ' + name + ' ' + del.getResponseCode());
    });
    deletedTotal += deletedThisRound;
    if (deletedThisRound === 0) break;   // 1件も消せなかったら、同じものを繰り返さない
  }
  console.log('expired posts deleted: ' + deletedTotal);
}

// 毎日 3 時の時間トリガーを作る。何度実行しても、トリガーは1つだけになる。
function setupCleanupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'cleanupExpiredPosts') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('cleanupExpiredPosts').timeBased().everyDays(1).atHour(3).create();
}
