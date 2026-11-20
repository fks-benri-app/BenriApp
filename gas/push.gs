// 通知の送信(ここだけを通す)。登録トークンがある生徒へ、FCM で送る。
// 呼び出し側(新着・まとめ通知・共有通知・リマインダー)は FCM を直接呼ばない。

/**
 * 1人に送る。
 * @returns {{ ok: boolean, via: 'fcm'|'none' }} ok は、どこかの端末へ送れたかどうか
 */
function sendPushToStudent_(studentId, title, body, url, data) {
  const sent = fcmSendToStudent_(studentId, title, body, url, data);
  recordPushResult_(studentId, sent > 0);
  return { ok: sent > 0, via: sent > 0 ? 'fcm' : 'none' };
}

/**
 * 複数人に送る(授業の共有通知)。登録トークンの無い生徒には届かない。
 * @returns {{ ok: boolean }} 常に true(送れなかった生徒は、ここではやり直さない)
 */
function sendPushToStudents_(studentIds, title, body, url, data) {
  let none = 0;
  studentIds.forEach(function (id) {
    if (fcmSendToStudent_(id, title, body, url, data) === 0) none++;
  });
  if (none > 0) console.error('FCM のトークンがなく、送れなかった生徒: ' + none + '人');
  return { ok: true };
}
