// ==================================================
// 通知の送信(ここだけを通す)
// ・登録トークンがある生徒には FCM で送る(主)。
// ・FCM が1件も送れなかった生徒(トークンが無い、古い)だけ、OneSignal で送る(予備)。
// OneSignal をやめるときは、USE_ONESIGNAL を false にする。そのあと、OneSignal の関数(コード.gs)を消す。
// 呼び出し側(新着・まとめ通知・共有通知・リマインダー)は、OneSignal と FCM を直接呼ばない。
// ==================================================
const USE_ONESIGNAL = true;

/**
 * 1人に送る。
 * @returns {{ ok: boolean, via: 'fcm'|'onesignal'|'none' }} ok は、どこかへ送れたかどうか
 */
function sendPushToStudent_(studentId, title, body, url, data) {
  if (fcmSendToStudent_(studentId, title, body, url, data) > 0) return { ok: true, via: 'fcm' };
  if (!USE_ONESIGNAL) return { ok: false, via: 'none' };
  const res = sendDirectNotification_(pushTargets_(studentId), title, body, url, data);
  recordPushResult_(studentId, res);
  return { ok: !!(res && res.id), via: 'onesignal' };
}

/**
 * 複数人に送る(授業の共有通知)。FCM で送れなかった生徒だけ、OneSignal へまとめて送る。
 * @param statusStudentId OneSignal の結果を記録する生徒(送る役の本人)
 * @returns {{ ok: boolean }} OneSignal へ送る必要があって失敗したときだけ false(呼び出し側がやり直せる)
 */
function sendPushToStudents_(studentIds, title, body, url, data, statusStudentId) {
  const rest = studentIds.filter(function (id) {
    return fcmSendToStudent_(id, title, body, url, data) === 0;
  });
  if (rest.length === 0) return { ok: true };
  if (!USE_ONESIGNAL) {
    console.error('FCM のトークンがなく、送れなかった生徒: ' + rest.length + '人');
    return { ok: true };
  }
  const targets = [];
  rest.forEach(function (id) {
    targets.push(derivePushKey_(id));
    if (INCLUDE_LEGACY_ID) targets.push(id);
  });
  const res = sendDirectNotification_(targets, title, body, url, data);
  recordPushResult_(statusStudentId, res);
  return { ok: !!(res && res.id) };
}
