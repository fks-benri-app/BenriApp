// ==================================================
// 授業の中での通知の共有  ※ Code.gs の末尾に貼り付ける(組み込む場所は別紙の「組み込み手順」)
//
// これまで: 全員の GAS が、同じ投稿を別々に見つけて、別々に OneSignal へ送っていた。
// これから: 最初に見つけた1人が、その授業の全員分をまとめて送る。ほかの人は、送られたことを確認して、送らない。
//
// 流れ
//  1. 投稿のリンク(.../c/授業ID/p/投稿ID)から、全員で同じになる鍵 postKey を作る。
//  2. Firestore に posts/{postKey} を「新規作成」する。すでにあれば 409 になる → 1人だけが先に取れる。
//  3. 先に取った人: 授業のメンバー全員の users/{ID}/announcements/{postKey} を書き、全員の pushKey 宛てに1回だけ送る。
//  4. 取れなかった人: 送信が終わっていて、自分が送り先に入っていれば、何もしない。
//     ・自分が入っていない / 2分たっても終わらない / 失敗した → 自分で送る(通知を取りこぼさない)
//  メンバーは、その授業の投稿を自分のメールで見つけた人(courses/{授業ID}/members/{ID})。
//
// 注意: 先生が一部の生徒だけに出した投稿も、その授業の全員に届く(「授業の全員に同期する」を選んだため)。
// Firestore の TTL ポリシーで、コレクション posts のフィールド expireAt を設定すると、古い記録が自動で消える。
// ==================================================
const SHARE_CLAIM_STALE_MS = 2 * 60 * 1000;     // 送る役が、この時間たっても終わらなければ、自分で送る
const SHARE_PENDING_MAX_MS = 10 * 60 * 1000;    // 待つのは、最大でこの時間まで
const SHARE_PENDING_DROP_MS = 30 * 60 * 1000;   // これより古い待ち分は、あきらめる
const SHARE_RECORD_TTL_DAYS = 14;

function fsDocUrl_(path) {
  return 'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID +
    '/databases/(default)/documents' + path;
}

function fsRequest_(url, method, bodyObj) {
  const opts = {
    method: method,
    headers: { Authorization: 'Bearer ' + getFirestoreToken_() },
    muteHttpExceptions: true,
  };
  if (bodyObj) {
    opts.contentType = 'application/json';
    opts.payload = JSON.stringify(bodyObj);
  }
  return UrlFetchApp.fetch(url, opts);
}

// Classroom の投稿リンクから、全員で同じになる鍵を作る。作れなければ null(これまでどおりの通知にする)
function parsePostLink_(link) {
  const m = String(link || '').match(/\/c\/([^/]+)\/(p|a|m|sa)\/([^/?#]+)/);
  if (!m) return null;
  return { courseId: m[1], postKey: m[1] + '.' + m[2] + '.' + m[3] };
}

// この授業のメンバーとして、自分を登録(初回だけ。登録ずみなら何もしない)
function ensureMember_(studentId, courseId) {
  const props = PropertiesService.getUserProperties();
  const flag = 'member_' + courseId;
  if (props.getProperty(flag) === '1') return;
  const res = fsRequest_(
    fsDocUrl_('/courses/' + encodeURIComponent(courseId) + '/members/' + encodeURIComponent(studentId)) +
      '?updateMask.fieldPaths=joinedAt',
    'patch',
    { fields: { joinedAt: { timestampValue: new Date().toISOString() } } }
  );
  if (res.getResponseCode() < 300) props.setProperty(flag, '1');
  else console.error('メンバー登録失敗: ' + res.getContentText());
}

// 授業のメンバー(生徒ID)の一覧
function listMembers_(courseId) {
  const ids = [];
  let pageToken = '';
  for (let i = 0; i < 5; i++) {
    const res = fsRequest_(
      fsDocUrl_('/courses/' + encodeURIComponent(courseId) + '/members') +
        '?pageSize=300&mask.fieldPaths=joinedAt' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''),
      'get'
    );
    if (res.getResponseCode() !== 200) throw new Error('メンバー一覧の取得失敗: ' + res.getContentText());
    const json = JSON.parse(res.getContentText());
    (json.documents || []).forEach(function (d) { ids.push(decodeURIComponent(d.name.split('/').pop())); });
    pageToken = json.nextPageToken || '';
    if (!pageToken) break;
  }
  return ids;
}

// 投稿の「送る役」を取る。'won'(自分が取れた) / 'lost'(先に取られた) / 'error'(判断できない)
function claimPost_(postKey, studentId) {
  const expireAt = new Date(Date.now() + SHARE_RECORD_TTL_DAYS * 24 * 3600 * 1000).toISOString();
  const res = fsRequest_(
    fsDocUrl_('/posts') + '?documentId=' + encodeURIComponent(postKey),
    'post',
    {
      fields: {
        claimedBy: { stringValue: studentId },
        claimedAtMs: { integerValue: String(Date.now()) },
        expireAt: { timestampValue: expireAt },
      },
    }
  );
  const code = res.getResponseCode();
  if (code < 300) return 'won';
  if (code === 409) return 'lost'; // ALREADY_EXISTS
  console.error('送る役の取得に失敗: ' + code + ' ' + res.getContentText());
  return 'error';
}

// 送る役の記録を読む。無ければ null
function readClaim_(postKey) {
  const res = fsRequest_(fsDocUrl_('/posts/' + encodeURIComponent(postKey)), 'get');
  const code = res.getResponseCode();
  if (code === 404) return null;
  if (code !== 200) throw new Error('記録の取得失敗: ' + code + ' ' + res.getContentText());
  const f = JSON.parse(res.getContentText()).fields || {};
  const notified = ((f.notified && f.notified.arrayValue && f.notified.arrayValue.values) || [])
    .map(function (v) { return v.stringValue; });
  return {
    claimedAtMs: Number((f.claimedAtMs && f.claimedAtMs.integerValue) || 0),
    sentAtMs: f.sentAtMs ? Number(f.sentAtMs.integerValue) : 0,
    notified: notified,
  };
}

// 送り終わったことを記録(だれに送ったかも残す)
function markClaimSent_(postKey, notifiedIds) {
  const res = fsRequest_(
    fsDocUrl_('/posts/' + encodeURIComponent(postKey)) + '?updateMask.fieldPaths=sentAtMs&updateMask.fieldPaths=notified',
    'patch',
    {
      fields: {
        sentAtMs: { integerValue: String(Date.now()) },
        notified: { arrayValue: { values: notifiedIds.map(function (id) { return { stringValue: id }; }) } },
      },
    }
  );
  if (res.getResponseCode() >= 300) throw new Error('送信の記録に失敗: ' + res.getContentText());
}

// 複数の生徒の users/{ID}/announcements/{docId} にまとめて保存(saveAnnouncement_ と同じ項目)。
// 書けた生徒の ID だけを返す。
function saveAnnouncementsFor_(ids, docId, rec) {
  if (ids.length === 0) return [];
  const str = function (v) { return { stringValue: v || '' }; };
  const body = JSON.stringify({
    fields: {
      category: str(rec.category),
      courseName: str(rec.courseName),
      title: str(rec.title),
      description: str(rec.description),
      dueDate: str(rec.dueDate),
      link: str(rec.link),
      teacher: str(rec.teacher),
      receivedAt: { timestampValue: new Date(rec.receivedAt).toISOString() },
      body: str(rec.body),
      attachments: str(JSON.stringify(rec.attachments || [])),
      rawBody: str(rec.rawBody),
      postTitle: str(rec.postTitle),
      deleted: { booleanValue: !!rec.deleted },
      ...dueFields_(rec),
    },
  });
  const token = getFirestoreToken_();
  const requests = ids.map(function (id) {
    return {
      url: fsDocUrl_('/users/' + encodeURIComponent(id) + '/announcements/' + encodeURIComponent(docId)),
      method: 'patch',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: body,
      muteHttpExceptions: true,
    };
  });
  const responses = UrlFetchApp.fetchAll(requests);
  const ok = [];
  responses.forEach(function (r, i) {
    if (r.getResponseCode() < 300) ok.push(ids[i]);
    else console.error('お知らせの保存失敗(' + ids[i] + '): ' + r.getContentText());
  });
  return ok;
}

// 通知の文面(notifyFresh_ と同じ)
function buildMessage_(item) {
  const info = item.info;
  return {
    heading: info.courseName || info.category, // タイトルは授業名だけ
    body: info.dueDate ? info.title + '(期限: ' + info.dueDate + ')' : info.title,
    url: APP_URL + '?open=' + encodeURIComponent(item.docId),
    data: {
      docId: item.docId,
      category: info.category,
      courseName: info.courseName,
      title: info.title,
      dueDate: info.dueDate || '',
      body: String(info.body || '').slice(0, 300),
    },
  };
}

// 新着1件の通知を、授業の中で共有する。
// true を返したら、この投稿の通知は済んだ(自分で送らなくてよい)。false なら、これまでどおり自分に送る。
function notifyShared_(studentId, item) {
  const ref = parsePostLink_(item.info.link);
  if (!ref || item.docId !== ref.postKey || !item.rec) return false;

  const claim = claimPost_(ref.postKey, studentId);
  if (claim === 'error') return false;
  if (claim === 'won') return sendToCourse_(studentId, item, ref);

  // 先に、ほかの人が送る役を取っていた
  const c = readClaim_(ref.postKey);
  if (!c) return false;
  if (c.sentAtMs) return c.notified.indexOf(studentId) >= 0; // 自分が送り先に入っていなければ、自分で送る
  if (Date.now() - c.claimedAtMs > SHARE_CLAIM_STALE_MS) return false; // 送る役が止まっている
  addPendingShared_(item, ref.postKey); // 送信中: 少しあとで、もう一度確かめる
  return true;
}

// 授業の全員分を、1回でまとめて送る
function sendToCourse_(studentId, item, ref) {
  const members = listMembers_(ref.courseId);
  if (members.indexOf(studentId) < 0) members.push(studentId);

  // 自分の分は保存ずみ。ほかの人の分を保存し、書けた人だけを送り先にする
  const saved = saveAnnouncementsFor_(members.filter(function (m) { return m !== studentId; }), item.docId, item.rec);
  // 授業をオフにしている仲間は、保存はするが、送り先からは外す(設定は1回の通信でまとめて読む)
  const prefsById = getNotifyPrefsMany_(saved);
  const recipients = [studentId].concat(saved.filter(function (id) {
    return notifyAllowed_(prefsById[id] || NOTIFY_PREFS_DEFAULT, ref.courseId);
  }));

  const targets = [];
  recipients.forEach(function (id) {
    targets.push(derivePushKey_(id));
    if (INCLUDE_LEGACY_ID) targets.push(id);
  });
  const msg = buildMessage_(item);
  const res = sendDirectNotification_(targets, msg.heading, msg.body, msg.url, msg.data);
  recordPushResult_(studentId, res);
  if (!res || !res.id) return false; // 送れなかった。自分には、これまでどおり送る(記録は未送信のまま → ほかの人は2分後に自分で送る)

  try {
    markClaimSent_(ref.postKey, recipients);
  } catch (e) {
    console.error(e); // 送信は済んでいる。記録できなかっただけなので、true を返す
  }
  return true;
}

// ----- 送信中だった投稿の再確認 -----
function addPendingShared_(item, postKey) {
  const props = PropertiesService.getUserProperties();
  let list = [];
  try { list = JSON.parse(props.getProperty('sharePending') || '[]'); } catch (e) { list = []; }
  const msg = buildMessage_(item);
  list.push({ postKey: postKey, heading: msg.heading, body: msg.body, url: msg.url, data: msg.data, since: Date.now() });
  props.setProperty('sharePending', JSON.stringify(list.slice(-30)));
}

// checkNewAssignments の最初(新着を調べる前)に呼ぶ
function flushPendingShared_(studentId) {
  const props = PropertiesService.getUserProperties();
  const raw = props.getProperty('sharePending');
  if (!raw) return;
  let list;
  try { list = JSON.parse(raw); } catch (e) { props.deleteProperty('sharePending'); return; }

  const now = Date.now();
  const keep = [];
  const prefs = getNotifyPrefs_(studentId);
  list.forEach(function (p) {
    if (now - p.since > SHARE_PENDING_DROP_MS) return;
    // 待っている間に、この授業の通知をオフにしたら、送らない
    if (!notifyAllowed_(prefs, String(p.postKey).split('.')[0])) return;
    let selfSend = false;
    try {
      const c = readClaim_(p.postKey);
      if (!c) selfSend = true;
      else if (c.sentAtMs) selfSend = c.notified.indexOf(studentId) < 0; // 自分に届いていれば、何もしない
      else if (now - c.claimedAtMs > SHARE_CLAIM_STALE_MS || now - p.since > SHARE_PENDING_MAX_MS) selfSend = true;
      else keep.push(p); // まだ送信中
    } catch (e) {
      console.error(e);
      if (now - p.since > SHARE_PENDING_MAX_MS) selfSend = true; else keep.push(p);
    }
    if (selfSend) {
      try {
        recordPushResult_(studentId, sendDirectNotification_(pushTargets_(studentId), p.heading, p.body, p.url, p.data));
      } catch (e) {
        console.error('待っていた通知の送信に失敗: ' + e);
        keep.push(p);
      }
    }
  });
  if (keep.length > 0) props.setProperty('sharePending', JSON.stringify(keep));
  else props.deleteProperty('sharePending');
}

// ----- 通知の設定(アプリの「通知設定」で、授業ごとにオフにしたもの) -----
// users/{生徒ID}.notifyPrefs.offCourses に、オフの授業IDが入る。未設定なら、すべてオン。
// 全体のオン/オフは、アプリが端末の購読で行う(GAS は見ない)。
const NOTIFY_PREFS_DEFAULT = { offCourses: [] };

// Firestore の値(fields)から設定を取り出す。読めなければ、すべてオン
function notifyPrefsFrom_(fields) {
  try {
    const m = fields && fields.notifyPrefs && fields.notifyPrefs.mapValue && fields.notifyPrefs.mapValue.fields;
    if (!m) return NOTIFY_PREFS_DEFAULT;
    const list = (m.offCourses && m.offCourses.arrayValue && m.offCourses.arrayValue.values) || [];
    return { offCourses: list.map(function (v) { return v.stringValue; }).filter(Boolean) };
  } catch (e) {
    return NOTIFY_PREFS_DEFAULT;
  }
}

// 生徒1人の設定を読む(新しい投稿が見つかったときの、本人の分)
function getNotifyPrefs_(studentId) {
  try {
    const res = fsRequest_(fsDocUrl_('/users/' + encodeURIComponent(studentId)) + '?mask.fieldPaths=notifyPrefs', 'get');
    if (res.getResponseCode() !== 200) return NOTIFY_PREFS_DEFAULT;
    return notifyPrefsFrom_(JSON.parse(res.getContentText()).fields);
  } catch (e) {
    console.error('通知設定の読み取りに失敗: ' + e);
    return NOTIFY_PREFS_DEFAULT;
  }
}

// 複数の生徒の設定を、batchGet で(最大100人ずつ)まとめて読む。生徒ID → 設定 の対応を返す。
// 読めなかった人は、対応に入らない(呼び出し側が NOTIFY_PREFS_DEFAULT として扱う)
function getNotifyPrefsMany_(ids) {
  const out = {};
  const unique = ids.filter(function (id, i) { return ids.indexOf(id) === i; });
  const base = 'projects/' + FIRESTORE_PROJECT_ID + '/databases/(default)/documents';
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    try {
      const res = fsRequest_(
        'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID + '/databases/(default)/documents:batchGet',
        'POST',
        { documents: chunk.map(function (id) { return base + '/users/' + id; }), mask: { fieldPaths: ['notifyPrefs'] } }
      );
      if (res.getResponseCode() !== 200) throw new Error('batchGet ' + res.getResponseCode());
      JSON.parse(res.getContentText()).forEach(function (row) {
        if (!row.found) return;
        const id = row.found.name.split('/').pop();
        out[id] = notifyPrefsFrom_(row.found.fields);
      });
    } catch (e) {
      console.error('通知設定のまとめ読み取りに失敗: ' + e);
    }
  }
  return out;
}

// この授業の通知を送ってよいか(この授業がオフでない)
function notifyAllowed_(prefs, courseId) {
  return !!prefs && prefs.offCourses.indexOf(courseId || '') < 0;
}

// 投稿のリンクから授業IDだけを取る。取れなければ null
function courseIdFromLink_(link) {
  const m = String(link || '').match(/\/c\/([^/?#]+)/);
  return m ? m[1] : null;
}
