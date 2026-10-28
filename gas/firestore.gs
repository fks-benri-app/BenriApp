// ==================================================
// Firestore 保存(Code.gs の末尾に貼り付ける)
// 事前準備:
//   ・FIRESTORE_PROJECT_ID を自分のプロジェクトIDにする
//   ・スクリプトプロパティ FIREBASE_SERVICE_ACCOUNT に、サービスアカウントのJSONを丸ごと入れる
//     (このJSONは絶対にGitHubへ置かない)
// ==================================================
const FIRESTORE_PROJECT_ID = 'fks-benri-application';

function getFirestoreToken_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('FS_TOKEN');
  if (cached) return cached;

  const sa = JSON.parse(
    PropertiesService.getScriptProperties().getProperty('FIREBASE_SERVICE_ACCOUNT')
  );
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => Utilities.base64EncodeWebSafe(JSON.stringify(o)).replace(/=+$/, '');
  const unsigned =
    enc({ alg: 'RS256', typ: 'JWT' }) +
    '.' +
    enc({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    });
  const signature = Utilities.base64EncodeWebSafe(
    Utilities.computeRsaSha256Signature(unsigned, sa.private_key)
  ).replace(/=+$/, '');

  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: unsigned + '.' + signature,
    },
    muteHttpExceptions: true,
  });
  const json = JSON.parse(res.getContentText());
  if (!json.access_token) throw new Error('Firestoreトークン取得失敗: ' + res.getContentText());
  cache.put('FS_TOKEN', json.access_token, 3000); // 有効期限3600秒より短く
  return json.access_token;
}

// 差出人「先生の名前 (Google Classroom) <no-reply@...>」から先生の名前を取り出す(要実機確認)
function parseSenderName_(from) {
  return String(from || '')
    .replace(/<.*>/, '')
    .replace(/\(Google Classroom\)/i, '')
    .replace(/"/g, '')
    .trim();
}

// users/{studentId}/announcements/{docId} に保存。同じdocIdなら上書きになるので重複しない
function saveAnnouncement_(studentId, docId, rec) {
  const url =
    'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID +
    '/databases/(default)/documents/users/' + encodeURIComponent(studentId) +
    '/announcements/' + encodeURIComponent(docId);
  const str = (v) => ({ stringValue: v || '' });
  const body = {
    fields: {
      category: str(rec.category),
      courseName: str(rec.courseName),
      title: str(rec.title),
      description: str(rec.description),
      dueDate: str(rec.dueDate),
      link: str(rec.link),
      teacher: str(rec.teacher),
      receivedAt: { timestampValue: rec.receivedAt.toISOString() },
      body: str(rec.body),
      attachments: str(JSON.stringify(rec.attachments || [])),
      rawBody: str(rec.rawBody),
      postTitle: str(rec.postTitle),
      deleted: { booleanValue: !!rec.deleted },
    },
  };
  const res = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + getFirestoreToken_() },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) {
    throw new Error('Firestore保存失敗: ' + res.getContentText());
  }
}

// GASエディタから手動実行して、保存の経路だけを確認する用(Classroomのメール不要)
function testSaveAnnouncement() {
  const studentId = PropertiesService.getUserProperties().getProperty('studentId');
  saveAnnouncement_(studentId, 'test-' + Date.now(), {
    category: '新しい課題',
    courseName: 'テスト教科',
    title: '保存テスト',
    description: 'Firestoreに保存できています',
    dueDate: '',
    link: '',
    teacher: 'テスト先生',
    receivedAt: new Date(),
  });
  
}

// 本文から URL と、アカウント選択などの案内行を取り除く
function stripUrls_(text) {
  return String(text || '')
    .split('\n')
    .map(l => l
      .replace(/<?https?:\/\/[^\s<>【】]+>?/g, '')  // URL(<...> で囲まれた形も含む)
      .replace(/[【】<>]/g, '')                     // 囲みの記号の残り
      .trim())
    .filter(l => l && !/AccountChooser|accounts\.google\.com|@g\.nagano-c\.ed\.jp|さん（Classroom）|^日時:/.test(l))
    .join('\n');
}
// 学校のアドレスを users/{studentId} の schoolEmail に保存(他の項目は消さない)
function saveSchoolEmail_(studentId, email) {
  const url =
    'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID +
    '/databases/(default)/documents/users/' + encodeURIComponent(studentId) +
    '?updateMask.fieldPaths=schoolEmail';
  const body = { fields: { schoolEmail: { stringValue: email } } };
  const res = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + getFirestoreToken_() },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) {
    throw new Error('Firestore保存失敗(schoolEmail): ' + res.getContentText());
  }
}

