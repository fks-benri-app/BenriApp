// ==================================================
// 1. グローバル変数・設定
// ==================================================
const ONESIGNAL_APP_ID = "726063a2-acd8-4d5d-9ff0-98902924cfe1";
const LABEL_NAME = 'ClassroomNotified';
const APP_URL = 'https://fks-benri-app.github.io/BenriApp/';
const EMAIL_PATTERN = /^fks(\d{3})(\d)(\d{2})@g\.nagano-c\.ed\.jp$/;

const QUIET_START_HOUR = 23;       // 通知停止時間
const QUIET_END_HOUR = 6;          // 通知開始時間
const OVERLAP_MS = 5 * 60 * 1000;  // 取りこぼし防止に前回より5分前から探す
const MAX_THREADS = 20;
const BATCH_THRESHOLD = 5;         // 新着がこの件数以上なら1通にまとめる
const INCLUDE_LEGACY_ID = true;    // 移行中は古い方式(生徒ID)の端末にも送る


// ==================================================
// 2. Webアプリ・初期設定・認証
// ==================================================

// Webアプリ表示
function doGet(e) {
  const props = PropertiesService.getUserProperties();
  const isAlreadySet = props.getProperty('isSetup') === 'true';
  const studentId = props.getProperty('studentId') || '';
  const schoolEmail = Session.getEffectiveUser().getEmail();

  const template = HtmlService.createTemplateFromFile('index');
  template.isAlreadySet = isAlreadySet;
  template.studentId = studentId;
  template.schoolEmail = schoolEmail;
  return template.evaluate()
    .setTitle('Classroom通知連携')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// 初回セットアップ
function setupClassroomNotification() {
  const email = getVerifiedEmail_();
  const studentInfo = parseStudentId_(email);
  if (!studentInfo) {
    throw new Error('メールアドレスの形式が想定と異なります: ' + email);
  }

  const anyClassroomEmail = GmailApp.search('from:(classroom.google.com)', 0, 1);
  if (anyClassroomEmail.length === 0) {
    throw new Error(
      'Classroomのメール通知がオフの可能性があります。' +
      'Classroomの設定で通知をオンにしてから、もう一度お試しください。'
    );
  }

  let label = GmailApp.getUserLabelByName(LABEL_NAME);
  if (!label) label = GmailApp.createLabel(LABEL_NAME);

  const existingThreads = GmailApp.search('from:(classroom.google.com) newer_than:1d', 0, 50);
  if (existingThreads.length > 0) addLabelInBatches_(label, existingThreads);

  const props = PropertiesService.getUserProperties();
  saveSchoolEmail_(studentInfo.studentId, email);
  props.setProperty('studentId', studentInfo.studentId);
  props.setProperty('isSetup', 'true');

  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'checkNewAssignments') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('checkNewAssignments').timeBased().everyMinutes(1).create();

  return { message: '連携が完了しました!', studentId: studentInfo.studentId };
}

// 連携解除
function unlinkClassroomNotification() {
  const props = PropertiesService.getUserProperties();
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'checkNewAssignments') ScriptApp.deleteTrigger(t);
  });
  ['studentId', 'isSetup', 'schoolEmailSaved', 'pushKeySaved', 'lastCheckedMs'].forEach(k => props.deleteProperty(k));
  return { message: '連携を解除しました' };
}

// 実行ユーザーのメールアドレス検証
function getVerifiedEmail_() {
  const active = Session.getActiveUser().getEmail();
  const effective = Session.getEffectiveUser().getEmail();
  if (!active || active !== effective) {
    throw new Error('この画面は、アクセスしているユーザーとして実行する設定でのみ使えます');
  }
  return effective;
}

// メールアドレスからstudentIdを導出（旧機能）
function parseStudentId_(email) {
  const match = email.match(EMAIL_PATTERN);
  if (!match) return null;
  const [, gradeCode, classNumber, seatNumber] = match;
  return {
    gradeCode,
    classNumber: Number(classNumber),
    seatNumber: Number(seatNumber),
    studentId: `${gradeCode}${classNumber}${String(seatNumber).padStart(2, '0')}`
  };
}

// トリガー間隔の設定（現時点では1分ごと）
function setCheckInterval1Min() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'checkNewAssignments') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('checkNewAssignments').timeBased().everyMinutes(1).create();
}


// ==================================================
// 3. Gmail・Classroom連携（データ解析・取得・定期監視）
// ==================================================

// 定期監視(トリガーから呼ばれるメイン処理)
function checkNewAssignments() {
  if (isQuietHour_()) return;

  const props = PropertiesService.getUserProperties();
  const studentId = props.getProperty('studentId');
  if (!studentId) return;

  // 学校のアドレスを一度だけ保存
  if (props.getProperty('schoolEmailSaved') !== 'true') {
    try {
      saveSchoolEmail_(studentId, Session.getEffectiveUser().getEmail());
      props.setProperty('schoolEmailSaved', 'true');
    } catch (e) {
      console.error(e);
    }
  }

  // 通知用のキーを一度だけ保存
  if (props.getProperty('pushKeySaved') !== 'true') {
    try {
      savePushKey_(studentId);
      props.setProperty('pushKeySaved', 'true');
    } catch (e) {
      console.error(e);
    }
  }

  // 他の人が送信中だった投稿を、もう一度確認する(送られていなければ、自分で送る)
  try { flushPendingShared_(studentId); } catch (e) { console.error(e); }

  const startedAt = Date.now();
  const label = GmailApp.getUserLabelByName(LABEL_NAME) || GmailApp.createLabel(LABEL_NAME);

  const lastChecked = Number(props.getProperty('lastCheckedMs') || 0);
  const timeQuery = lastChecked
    ? `after:${Math.floor((lastChecked - OVERLAP_MS) / 1000)}`
    : 'newer_than:1d';
  const query = `from:(classroom.google.com) -label:${LABEL_NAME} ${timeQuery}`;
  const threads = GmailApp.search(query, 0, MAX_THREADS);

  const fresh = [];
  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      const info = parseClassroomEmail_(message);
      // 授業の中で共有できる投稿は、全員で同じ鍵(postKey)を保存先のIDにする。共有できなければ、これまでどおりメールのID
      const ref = parsePostLink_(info.link);
      const docId = ref ? ref.postKey : message.getId();
      const rec = Object.assign({}, info, {
        teacher: info.teacher || parseSenderName_(message.getFrom()),
        receivedAt: message.getDate(),
      });
      try {
        saveAnnouncement_(studentId, docId, rec);
      } catch (e) { console.error(e); }
      if (ref) {
        try { ensureMember_(studentId, ref.courseId); } catch (e) { console.error(e); }
      }
      if (!info.deleted) fresh.push({ info, docId, rec });
    });
  });

  if (threads.length > 0) addLabelInBatches_(label, threads);
  if (threads.length < MAX_THREADS) props.setProperty('lastCheckedMs', String(startedAt));

  try {
    notifyFresh_(studentId, fresh);
  } catch (e) {
    console.error('通知の送信に失敗: ' + e);
  }

  Logger.log(`確認: ${Date.now() - startedAt}ms / 新着${fresh.length}件 / 対象スレッド${threads.length}件`);
}

// 過去の通知を一括インポート
function importPastAnnouncements(limit, days) {
  limit = limit || 100;
  days = days || 90;

  const studentId = PropertiesService.getUserProperties().getProperty('studentId');
  if (!studentId) throw new Error('先に連携(setupClassroomNotification)を完了してください');

  const threads = GmailApp.search('from:(classroom.google.com) newer_than:' + days + 'd', 0, 100);
  const messages = [];
  threads.forEach((t) => t.getMessages().forEach((m) => messages.push(m)));
  messages.sort((a, b) => b.getDate() - a.getDate());

  const started = Date.now();
  let saved = 0;
  let failed = 0;
  const targets = messages.slice(0, limit);

  for (let i = 0; i < targets.length; i++) {
    if (Date.now() - started > 5 * 60 * 1000) break;
    const m = targets[i];
    try {
      const info = parseClassroomEmail_(m);
      saveAnnouncement_(
        studentId,
        m.getId(),
        Object.assign({}, info, {
          teacher: parseSenderName_(m.getFrom()),
          receivedAt: m.getDate(),
        })
      );
      saved++;
    } catch (e) {
      failed++;
      console.error('取り込み失敗: ' + m.getSubject() + ' / ' + e);
    }
  }

  const result = { found: messages.length, tried: Math.min(targets.length, saved + failed), saved: saved, failed: failed };
  Logger.log(JSON.stringify(result));
  return result;
}

// Classroom通知メールの解析
function parseClassroomEmail_(message) {
  const htmlBody = message.getBody();
  const lines = message.getPlainBody()
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/https?:\/\//.test(l) && !/さん（Classroom）|^日時:/.test(l));

  const categoryIndex = lines.findIndex(l => /^(新しい課題|新しい資料|新しいお知らせ)$/.test(l));
  const category = categoryIndex >= 0 ? lines[categoryIndex] : '通知';
  const courseName = categoryIndex > 0 ? lines[categoryIndex - 1] : '';
  const title = (categoryIndex >= 0 && lines[categoryIndex + 1]) ? lines[categoryIndex + 1] : message.getSubject();

  const detailIndex = lines.findIndex(l => l === '詳細を表示');
  const descStart = categoryIndex + 2;
  const descEnd = detailIndex >= 0 ? detailIndex : lines.length;
  const descLines = lines.slice(descStart, descEnd);

  let dueDate = null;
  const bodyLines = descLines.filter(l => {
    const m = l.match(/^期限\s*(.+)$/);
    if (m) { dueDate = m[1].trim(); return false; }
    return true;
  });
  const description = bodyLines.join(' ');
  const truncatedDescription = description.length > 120
    ? description.slice(0, 120) + '…'
    : description;

  const link = extractClassroomLink_(htmlBody, message.getPlainBody());
  const teacherMatch = message.getPlainBody().match(/】\s*(.+?)\s*さん/);
  const teacher = teacherMatch ? teacherMatch[1].trim() : '';
  const post = fetchPost_(link);
  return { 
    category, courseName, title, description: truncatedDescription,
    body: description.slice(0, 3000), dueDate, link,
    attachments: post.attachments, rawBody: post.rawBody, postTitle: post.postTitle, deleted: post.deleted 
  };
}

// ClassroomのAPIから投稿詳細を取得
function fetchPost_(link) {
  const empty = { attachments: [], rawBody: '', postTitle: '', deleted: false };
  try {
    const m = String(link || '').match(/\/c\/([^/?#]+)\/(a|p|m)\/([^/?#]+)/);
    if (!m) return empty;
    const courseId = decodeClassroomId_(m[1]);
    const postId = decodeClassroomId_(m[3]);
    let post, text, title = '';
    if (m[2] === 'a') { post = Classroom.Courses.CourseWork.get(courseId, postId); text = post.description; title = post.title; }
    else if (m[2] === 'p') { post = Classroom.Courses.Announcements.get(courseId, postId); text = post.text; }
    else { post = Classroom.Courses.CourseWorkMaterials.get(courseId, postId); text = post.description; title = post.title; }
    
    const attachments = (post.materials || []).map(function (x) {
      if (x.driveFile) { const f = x.driveFile.driveFile || {}; return { type: 'drive', title: f.title, url: f.alternateLink, thumb: f.thumbnailUrl || '' }; }
      if (x.link) return { type: 'link', title: x.link.title || x.link.url, url: x.link.url, thumb: x.link.thumbnailUrl || '' };
      if (x.youtubeVideo) return { type: 'youtube', title: x.youtubeVideo.title, url: x.youtubeVideo.alternateLink, thumb: x.youtubeVideo.thumbnailUrl || '' };
      if (x.form) return { type: 'form', title: x.form.title, url: x.form.formUrl, thumb: x.form.thumbnailUrl || '' };
      return null;
    }).filter(function (a) { return a && a.url; });
    return { attachments: attachments, rawBody: String(text || ''), postTitle: String(title || ''), deleted: false };
  } catch (e) {
    const gone = /not found|404/i.test(String(e.message));
    console.warn('投稿取得失敗(' + (gone ? '削除済み' : 'その他') + '): ' + e.message + ' / link=' + link);
    return { attachments: [], rawBody: '', postTitle: '', deleted: gone };
  }
}

// Gmailラベル付け
function addLabelInBatches_(label, threads) {
  const BATCH_SIZE = 100;
  for (let i = 0; i < threads.length; i += BATCH_SIZE) {
    label.addToThreads(threads.slice(i, i + BATCH_SIZE));
  }
}

// 通知停止期間判定
function isQuietHour_() {
  const h = Number(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'H'));
  return h >= QUIET_START_HOUR || h < QUIET_END_HOUR;
}

// Classroomのリンク抽出
function extractClassroomLink_(html, plain) {
  const candidates = [];
  const reHref = /href=["']([^"']+)["']/g;
  let m;
  while ((m = reHref.exec(String(html || '')))) candidates.push(m[1]);
  const reUrl = /https?:\/\/[^\s<>"'【】]+/g;
  while ((m = reUrl.exec(String(plain || '')))) candidates.push(m[0]);

  const urls = [];
  candidates.forEach((raw) => {
    let u = raw.replace(/&amp;/g, '&');
    for (let i = 0; i < 3; i++) {
      const g =
        u.match(/^https:\/\/(?:www\.)?google\.com\/url\?(?:[^#]*&)?(?:q|url)=([^&]+)/) ||
        u.match(/^https:\/\/accounts\.google\.com\/[^?]*\?(?:[^#]*&)?continue=([^&]+)/);
      if (!g) break;
      try { u = decodeURIComponent(g[1]); } catch (e) { u = g[1]; }
    }
    if (/^https:\/\/classroom\.google\.com\//.test(u)) urls.push(u.split(/[?#]/)[0]);
  });
  return urls.find((u) => /\/c\/[^/]+\/(?:p|a|m|sa)\//.test(u)) || urls[0] || null;
}

// ClassroomIDのデコード
function decodeClassroomId_(s) {
  let b = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4) b += '=';
  return Utilities.newBlob(Utilities.base64Decode(b)).getDataAsString();
}


// ==================================================
// 4. OneSignal プッシュ通知機能
// ==================================================

// 新着通知の送信制御
function notifyFresh_(studentId, fresh) {
  if (fresh.length === 0) return;
  if (fresh.length < BATCH_THRESHOLD) {
    fresh.forEach(function (item) {
      // 授業の中で共有できる投稿は、最初に見つけた1人が全員分をまとめて送る。済んでいれば、自分では送らない
      try {
        if (notifyShared_(studentId, item)) return;
      } catch (e) {
        console.error('共有通知に失敗(自分に送ります): ' + e);
      }
      const info = item.info;
      const docId = item.docId;
      try {
        const heading = info.category + (info.courseName ? ': ' + info.courseName : '');
        const body = info.dueDate ? info.title + '(期限: ' + info.dueDate + ')' : info.title;
        const res = sendDirectNotification_(
          pushTargets_(studentId), heading, body,
          APP_URL + '?open=' + encodeURIComponent(docId),
          {
            docId: docId,
            category: info.category,
            courseName: info.courseName,
            title: info.title,
            dueDate: info.dueDate || '',
            body: String(info.body || '').slice(0, 300)
          }
        );
        recordPushResult_(studentId, res);
      } catch (e) {
        console.error('通知の送信に失敗(' + docId + '): ' + e);
      }
    });
    return;
  }
  // 件数が多いときも、共有通知を先に試し、共有できなかった投稿だけをまとめる
  const fallback = [];
  fresh.forEach(function (item) {
    try {
      if (notifyShared_(studentId, item)) return;
    } catch (e) {
      console.error('共有通知に失敗(一括通知に含めます): ' + e);
    }
    fallback.push(item);
  });

  if (fallback.length === 0) return;

  const titles = fallback.slice(0, 3).map(function (x) { return x.info.title; }).join(' / ');
  const more = fallback.length > 3 ? ' ほか' + (fallback.length - 3) + '件' : '';
  const res = sendDirectNotification_(
    pushTargets_(studentId),
    '新しいお知らせが' + fallback.length + '件あります',
    titles + more,
    APP_URL
  );
  recordPushResult_(studentId, res);
}

// OneSignalAPIへリクエスト送信
function sendDirectNotification_(externalUserId, title, body, url, data) {
  const payload = {
    "app_id": ONESIGNAL_APP_ID,
    "include_aliases": { "external_id": [].concat(externalUserId) },
    "target_channel": "push",
    "headings": { "en": title, "ja": title },
    "contents": { "en": body, "ja": body }
  };
  if (url) payload.url = url;
  if (data) payload.data = data;
  return executeOneSignalApi_(payload);
}

// OneSignalの通知APIへUrlFetchAppを送信
function executeOneSignalApi_(payload) {
  console.log("送信ペイロード: " + JSON.stringify(payload));
  const url = "https://onesignal.com/api/v1/notifications";
  const options = {
    "method": "post",
    "contentType": "application/json; charset=utf-8",
    "headers": { "Authorization": "Key " + getRestApiKey_() },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  const response = UrlFetchApp.fetch(url, options);
  Logger.log("HTTP Response Code: " + response.getResponseCode());
  Logger.log("Response Body: " + response.getContentText());
  return JSON.parse(response.getContentText());
}

// スクリプトプロパティからOneSignalのREST APIキーを取得します。
function getRestApiKey_() {
  return PropertiesService.getScriptProperties().getProperty('ONESIGNAL_REST_API_KEY');
}

// 生徒IDからプッシュ通知の送信先を生成
function pushTargets_(studentId) {
  const t = [derivePushKey_(studentId)];
  if (INCLUDE_LEGACY_ID) t.push(studentId);
  return t;
}


// ==================================================
// 5. Firestore データ保存・連携・トークン生成
// ==================================================

// Firebase認証用のカスタムJWTログイントークンを生成
function getLoginToken() {
  const email = getVerifiedEmail_();
  const info = parseStudentId_(email);
  if (!info) throw new Error('メールアドレスの形式が想定と異なります');

  const sa = JSON.parse(
    PropertiesService.getScriptProperties().getProperty('FIREBASE_SERVICE_ACCOUNT')
  );
  const now = Math.floor(Date.now() / 1000);
  try { savePushKey_(info.studentId); } catch (e) { console.error(e); }
  return signJwt_({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now,
    exp: now + 300,
    uid: info.studentId,
  }, sa.private_key);
}

// 秘密鍵と生徒IDを基に、HMAC-SHA256を使ってプッシュキーを導出
function derivePushKey_(studentId) {
  const secret = PropertiesService.getScriptProperties().getProperty('PUSH_KEY_SECRET');
  if (!secret) throw new Error('PUSH_KEY_SECRET が設定されていません');
  const bytes = Utilities.computeHmacSha256Signature('push:' + studentId, secret);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); })
    .join('').slice(0, 32);
}

// Firestoreにユーザーのプッシュキーを保存します。
function savePushKey_(studentId) {
  const url =
    'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID +
    '/databases/(default)/documents/users/' + encodeURIComponent(studentId) +
    '?updateMask.fieldPaths=pushKey';
  const res = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + getFirestoreToken_() },
    payload: JSON.stringify({ fields: { pushKey: { stringValue: derivePushKey_(studentId) } } }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) throw new Error('pushKey保存失敗: ' + res.getContentText());
}

// Firestoreにプッシュ通知のpushBrokenを保存
function markPushStatus_(studentId, broken) {
  const url =
    'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID +
    '/databases/(default)/documents/users/' + encodeURIComponent(studentId) +
    '?updateMask.fieldPaths=pushBroken';
  const res = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + getFirestoreToken_() },
    payload: JSON.stringify({ fields: { pushBroken: { booleanValue: !!broken } } }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) throw new Error('pushBroken保存失敗: ' + res.getContentText());
}

// プッシュ通知の送信結果を判定し、状態に変化があった場合のみFirestoreの状態を更新
function recordPushResult_(studentId, res) {
  const broken = !res || !res.id;
  const props = PropertiesService.getUserProperties();
  if (broken === (props.getProperty('pushBroken') === '1')) return;
  try {
    markPushStatus_(studentId, broken);
    props.setProperty('pushBroken', broken ? '1' : '0');
  } catch (e) {
    console.error(e);
  }
}

// RSA-SHA256の生成
function signJwt_(payload, privateKey) {
  const enc = (o) => Utilities.base64EncodeWebSafe(JSON.stringify(o)).replace(/=+$/, '');
  const unsigned = enc({ alg: 'RS256', typ: 'JWT' }) + '.' + enc(payload);
  const signature = Utilities.base64EncodeWebSafe(
    Utilities.computeRsaSha256Signature(unsigned, privateKey)
  ).replace(/=+$/, '');
  return unsigned + '.' + signature;
}


// ==================================================
// 6. 開発・テスト用関数
// ==================================================

function resetSetupState() {
  PropertiesService.getUserProperties().deleteAllProperties();
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'checkNewAssignments') ScriptApp.deleteTrigger(t);
  });
  Logger.log('リセット完了');
}

function devImportPast() {
  importPastAnnouncements(100, 90);
}

function testPush() {
  const studentId = PropertiesService.getUserProperties().getProperty('studentId');
  const res = sendDirectNotification_(studentId, 'テスト通知', 'これが届けば通知は正常です', null);
  Logger.log('studentId=' + studentId + ' / ' + JSON.stringify(res));
}

function testPushWithData() {
  const studentId = PropertiesService.getUserProperties().getProperty('studentId');
  sendDirectNotification_(
    studentId,
    'テスト通知(data付き)',
    'data付きのテストです',
    APP_URL + '?open=test123',
    {
      docId: 'test123',
      category: '新しい課題',
      courseName: 'テスト授業',
      title: 'テスト課題',
      dueDate: '明日',
      body: 'これはテストの本文です。'
    }
  );
}

function testSend() {
  const info = parseStudentId_(Session.getEffectiveUser().getEmail());
  const res = sendDirectNotification_(info.studentId, "テスト通知", "GASからのテスト送信です");
  console.log(JSON.stringify(res));
}

function testPushBySubscription() {
  const res = executeOneSignalApi_({
    app_id: ONESIGNAL_APP_ID,
    include_subscription_ids: ['bd0ab353-7960-4e0a-89ed-e441a0ab1c2d'],
    headings: { en: 'テスト(購読ID指定)', ja: 'テスト(購読ID指定)' },
    contents: { en: '購読IDに直接送るテストです', ja: '購読IDに直接送るテストです' }
  });
  Logger.log(JSON.stringify(res));
}

function debugOneSignalUser() {
  const url = 'https://api.onesignal.com/apps/' + ONESIGNAL_APP_ID + '/users/by/external_id/250710';
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'Authorization': 'Key ' + getRestApiKey_() },
    muteHttpExceptions: true
  });
  Logger.log(res.getResponseCode() + ' ' + res.getContentText());
}

function transferSubscriptionTo250710(subscriptionId) {
  const url = 'https://api.onesignal.com/apps/' + ONESIGNAL_APP_ID + '/subscriptions/' + subscriptionId + '/owner';
  const res = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: { 'Authorization': 'Key ' + getRestApiKey_() },
    payload: JSON.stringify({ identity: { external_id: '250710' } }),
    muteHttpExceptions: true
  });
  Logger.log(res.getResponseCode() + ' ' + res.getContentText());
}

function makePushKeySecret() {
  PropertiesService.getScriptProperties()
    .setProperty('PUSH_KEY_SECRET', Utilities.getUuid() + Utilities.getUuid());
}