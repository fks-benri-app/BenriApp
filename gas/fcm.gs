// ==================================================
// FCM(Firebase Cloud Messaging)の送信と、トピック購読(段階2)
//
// 方針(docs/notification-spec.md の「通知(FCM)」)
//  ・全員宛ては、授業ごとのトピック(course_授業ID)へ1回だけ送る。
//  ・個人宛ては、対象の登録トークンへ直接送る。
//  ・購読は、FCM v1 の topicSubscriptions を、登録トークン1件ずつ呼ぶ。
//  ・認証は、既存の FIREBASE_SERVICE_ACCOUNT で OAuth2 のアクセストークンを作る(スコープは firebase.messaging)。
//
// 注意
//  ・USE_FCM が false の間は、どこからも呼ばれない。既存の OneSignal の送信はそのまま動く。
//  ・テストは、GAS エディタから testFcmSubscribe / testFcmSend を実行して行う。
//    そのためにスクリプトプロパティ TEST_FCM_TOKEN に、テスト端末の登録トークンを入れておく。
//  ・登録トークンは、ログや画面に全文を出さない(末尾だけ出す)。
// ==================================================
const USE_FCM = false; // 実機で送受信が確認できるまで false のまま。切り替えは別のPRで行う
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

// 授業のトピック名(例: course_123456)。授業IDは数字なので、そのまま使える
function topicForCourse_(courseId) {
  return 'course_' + String(courseId).replace(/[^a-zA-Z0-9_.~%-]/g, '_');
}

// FCM を呼ぶためのアクセストークン(サービスアカウントの JWT から取る。キャッシュは50分)
function getFcmAccessToken_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('FCM_TOKEN');
  if (cached) return cached;

  const sa = JSON.parse(PropertiesService.getScriptProperties().getProperty('FIREBASE_SERVICE_ACCOUNT'));
  const now = Math.floor(Date.now() / 1000);
  const jwt = signJwt_({
    iss: sa.client_email,
    scope: FCM_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }, sa.private_key);

  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt },
    muteHttpExceptions: true,
  });
  const json = JSON.parse(res.getContentText());
  if (!json.access_token) throw new Error('FCMトークン取得失敗: ' + res.getContentText());
  cache.put('FCM_TOKEN', json.access_token, 3000); // 有効期限3600秒より短く
  return json.access_token;
}

// FCM v1 の API を呼ぶ共通処理(プロジェクトは Firestore と同じ)
function fcmRequest_(path, method, bodyObj) {
  const opts = {
    method: method,
    headers: { Authorization: 'Bearer ' + getFcmAccessToken_() },
    muteHttpExceptions: true,
  };
  if (bodyObj) {
    opts.contentType = 'application/json';
    opts.payload = JSON.stringify(bodyObj);
  }
  return UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID + path, opts);
}

// 通知を1件送る。target は { topic: 'course_…' } か { token: '…' }。
// data の値は、FCM の仕様で文字列にそろえる。戻り値は { ok, code, detail }。
function fcmSend_(target, title, body, url, data) {
  const dataStr = {};
  Object.keys(data || {}).forEach(function (k) {
    dataStr[k] = data[k] == null ? '' : String(data[k]);
  });
  const message = Object.assign({}, target, {
    notification: { title: String(title || ''), body: String(body || '') },
    data: dataStr,
    webpush: { fcm_options: { link: url || APP_URL } },
  });
  const res = fcmRequest_('/messages:send', 'post', { message: message });
  const code = res.getResponseCode();
  if (code === 200) return { ok: true, code: code, detail: res.getContentText() };
  // 404(UNREGISTERED など)は、登録トークンが無効。掃除の対象にする
  return { ok: false, code: code, detail: res.getContentText() };
}

// 登録トークンを、トピックに購読させる。戻り値は { code, body }(呼び出し側で判断する)
function fcmSubscribeTopicCode_(token, topic) {
  const res = fcmRequest_(
    '/registrations/' + token + '/topicSubscriptions?topic_name=' + encodeURIComponent(topic),
    'post',
    {}
  );
  const code = res.getResponseCode();
  if (code !== 200 && code !== 409) console.error('トピック購読に失敗(' + code + '): ' + res.getContentText());
  return { code: code, body: res.getContentText() };
}

// 購読させる。すでに購読ずみ(409)も成功とみなす
function fcmSubscribeTopic_(token, topic) {
  const code = fcmSubscribeTopicCode_(token, topic).code;
  return code === 200 || code === 409;
}

// 登録トークンを、トピックから外す。購読していない(404)も、外れている状態なので成功とみなす
function fcmUnsubscribeTopic_(token, topic) {
  const res = fcmRequest_('/registrations/' + token + '/topicSubscriptions/' + encodeURIComponent(topic), 'delete');
  const code = res.getResponseCode();
  if (code !== 200 && code !== 404) console.error('トピック購読の解除に失敗(' + code + '): ' + res.getContentText());
  return code === 200 || code === 404;
}

// ----- 購読の同期(生徒の GAS が、所属授業に合わせて端末をトピックへ入れる) -----
const FCM_SYNC_INTERVAL_MS = 60 * 60 * 1000; // 同期は1時間に1回まで(確認は1分ごとに走るため)
const FCM_TOKEN_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60日、アプリが開かれていない端末は消す

// Firestore のコレクションの文書を、すべて取る(ページを分けて読む)
function fsListDocs_(path) {
  const docs = [];
  let pageToken = '';
  for (let i = 0; i < 10; i++) {
    const res = fsRequest_(
      fsDocUrl_(path) + '?pageSize=300' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''),
      'get'
    );
    if (res.getResponseCode() !== 200) throw new Error('一覧の取得失敗(' + path + '): ' + res.getContentText());
    const json = JSON.parse(res.getContentText());
    (json.documents || []).forEach(function (d) { docs.push(d); });
    pageToken = json.nextPageToken || '';
    if (!pageToken) break;
  }
  return docs;
}

// 生徒の登録トークン(端末)を、所属授業のトピックすべてに購読させる。
// 購読は冪等(すでにあれば 409 で成功扱い)なので、毎回全部を呼んでよい。
// 所属授業のうち、通知オフ(notifyPrefs.offCourses)のものは購読を外す。
// 無効になった端末(UNREGISTERED)は、users/{生徒ID}/fcmTokens から消す。
function fcmSyncStudent_(studentId) {
  if (!USE_FCM) return;
  const props = PropertiesService.getUserProperties();
  const last = Number(props.getProperty('fcmSyncAt') || 0);
  if (Date.now() - last < FCM_SYNC_INTERVAL_MS) return;

  const base = '/users/' + encodeURIComponent(studentId);
  const userRes = fsRequest_(fsDocUrl_(base), 'get');
  if (userRes.getResponseCode() !== 200) throw new Error('生徒の情報の取得失敗: ' + userRes.getContentText());
  const offCourses = notifyPrefsFrom_(JSON.parse(userRes.getContentText()).fields).offCourses;

  const courses = fsListDocs_(base + '/courses').map(function (d) {
    return decodeURIComponent(d.name.split('/').pop());
  });
  const tokens = fsListDocs_(base + '/fcmTokens')
    .map(function (d) {
      const f = d.fields || {};
      return {
        docId: d.name.split('/').pop(),
        token: f.token ? f.token.stringValue : '',
        updatedAt: f.updatedAt ? f.updatedAt.timestampValue : '',
      };
    })
    .filter(function (t) { return !!t.token; });

  const stats = { on: 0, off: 0, ng: 0, removed: 0 };
  tokens.forEach(function (t) {
    let dead = false;
    // アプリは起動のたびに updatedAt を新しくする。長く開かれていない端末は、もう使われていないとみなして消す
    if (t.updatedAt && Date.now() - Date.parse(t.updatedAt) > FCM_TOKEN_MAX_AGE_MS) {
      const old = fsRequest_(fsDocUrl_(base + '/fcmTokens/' + t.docId), 'delete');
      if (old.getResponseCode() < 300) stats.removed++;
      else console.error('古い端末の削除に失敗: ' + old.getContentText());
      return;
    }
    courses.forEach(function (courseId) {
      if (dead) return;
      const topic = topicForCourse_(courseId);
      if (offCourses.indexOf(courseId) >= 0) {
        if (fcmUnsubscribeTopic_(t.token, topic)) stats.off++;
        else stats.ng++;
        return;
      }
      const r = fcmSubscribeTopicCode_(t.token, topic);
      if (r.code === 200 || r.code === 409) {
        stats.on++;
      } else if (r.code === 404 && r.body.indexOf('UNREGISTERED') >= 0) {
        // 端末がアプリを消した、または登録が無効。この端末はもう使えないので消す
        dead = true;
        const del = fsRequest_(fsDocUrl_(base + '/fcmTokens/' + t.docId), 'delete');
        if (del.getResponseCode() < 300) stats.removed++;
        else console.error('無効な端末の削除に失敗: ' + del.getContentText());
      } else {
        stats.ng++;
      }
    });
  });
  props.setProperty('fcmSyncAt', String(Date.now()));
  console.log('FCM購読の同期: 授業' + courses.length + '件 × 端末' + tokens.length + '件 / 購読' + stats.on +
    ' 解除' + stats.off + ' 削除' + stats.removed + ' 失敗' + stats.ng);
}

// ----- 登録トークンの保存(アプリから呼ばれる) -----
// アプリは GET で次を送る: ?action=registerFcm&studentId=…&pushKey=…&token=…
// pushKey は、ログイン時に users/{生徒ID}.pushKey へ入っている値と同じものを使う(GAS が導出値と照合する)。
// 保存先: users/{生徒ID}/fcmTokens/{トークンのハッシュ}(トークンの全文は、ドキュメントIDに使わない)
function saveFcmToken_(studentId, token) {
  const docId = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)
  ).replace(/=+$/, '');
  const res = fsRequest_(
    fsDocUrl_('/users/' + encodeURIComponent(studentId) + '/fcmTokens/' + docId),
    'patch',
    { fields: {
      token: { stringValue: token },
      updatedAt: { timestampValue: new Date().toISOString() },
    } }
  );
  if (res.getResponseCode() >= 300) {
    throw new Error('トークンの保存に失敗(' + res.getResponseCode() + '): ' + res.getContentText());
  }
}

function fcmRegisterHandler_(p) {
  const out = function (obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  };
  try {
    const studentId = String(p.studentId || '');
    const pushKey = String(p.pushKey || '');
    const token = String(p.token || '');
    if (!/^\d{6}$/.test(studentId) || !token || token.length > 512) return out({ ok: false, error: 'bad request' });
    if (pushKey !== derivePushKey_(studentId)) return out({ ok: false, error: 'unauthorized' });
    saveFcmToken_(studentId, token);
    return out({ ok: true });
  } catch (err) {
    console.error('トークン登録に失敗: ' + err);
    return out({ ok: false, error: 'server error' });
  }
}

// ----- テスト用(GAS エディタから手動で実行する) -----
function getTestFcmToken_() {
  const token = PropertiesService.getScriptProperties().getProperty('TEST_FCM_TOKEN');
  if (!token) throw new Error('スクリプトプロパティ TEST_FCM_TOKEN に、テスト端末の登録トークンを入れてください');
  return token;
}

// テスト端末を、テスト用のトピック(course_test)に購読させる
function testFcmSubscribe() {
  const token = getTestFcmToken_();
  const ok = fcmSubscribeTopic_(token, topicForCourse_('test'));
  Logger.log('購読: ' + (ok ? '成功' : '失敗') + ' (末尾 ' + token.slice(-6) + ')');
}

// テスト端末に、1件だけ直接送る
function testFcmSend() {
  const token = getTestFcmToken_();
  const r = fcmSend_({ token: token }, 'テスト授業', 'FCM の送信テスト', APP_URL, { docId: 'test', kind: 'test' });
  Logger.log('送信: ' + JSON.stringify(r));
}

// テスト用のトピックに送る。testFcmSubscribe で購読した端末に届く
function testFcmSendTopic() {
  const r = fcmSend_({ topic: topicForCourse_('test') }, 'テスト授業', 'トピックへの送信テスト', APP_URL, { docId: 'test', kind: 'test' });
  Logger.log('トピック送信: ' + JSON.stringify(r));
}
