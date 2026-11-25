// 資料ファイル(Drive)の取得。アプリが JSONP で 1 件ずつ呼ぶ(端末に保存して、オフラインでも開けるようにする)。
// 実行者は生徒本人(「自分として実行」)。本人以外が呼んだら拒否する。

const MATERIAL_MAX_BYTES = 4 * 1024 * 1024; // shortcut: 4MB まで(base64 で約 5.4MB を JSONP で返す), 大きい資料は Classroom で開く

function materialResponse_(p) {
  const callback = /^[A-Za-z_$][\w$]*$/.test(p.callback || '') ? p.callback : '';
  let res;
  try {
    res = fetchMaterial_(String(p.fileId || ''));
  } catch (e) {
    res = { error: String(e.message || e) };
  }
  const body = JSON.stringify(res);
  return ContentService.createTextOutput(callback ? callback + '(' + body + ')' : body)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function fetchMaterial_(fileId) {
  if (!/^[\w-]{10,}$/.test(fileId)) throw new Error('fileId が不正です');
  const me = Session.getActiveUser().getEmail();
  if (!me || me !== Session.getEffectiveUser().getEmail()) throw new Error('この端末からは取得できません');
  const file = DriveApp.getFileById(fileId);
  // Google ドキュメント・スプレッドシート等は、PDF に書き出して保存する
  const isGoogleType = file.getMimeType().indexOf('application/vnd.google-apps.') === 0;
  const blob = isGoogleType ? file.getAs(MimeType.PDF) : file.getBlob();
  const bytes = blob.getBytes();
  if (bytes.length > MATERIAL_MAX_BYTES) throw new Error('ファイルが大きすぎます');
  return { name: file.getName(), mimeType: blob.getContentType(), base64: Utilities.base64Encode(bytes) };
}
