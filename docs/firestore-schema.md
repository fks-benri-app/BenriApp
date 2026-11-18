# Firestore の項目の約束(いまの実装)

GAS(サービスアカウント)とアプリが、同じ Firestore を読み書きする。ここは、**いまコードに入っている構造**を書いたもの。
目標の構造(授業ごとの保存など)は `notification-spec.md` を見る。項目を足す・変えるときは、このファイルと `firestore.rules` を一緒に直す。

## 基本の約束

- アプリ(ブラウザ)が読めるのは、**本人の領域だけ**(`request.auth.uid == 生徒ID`)。
- アプリが書けるのは、下の「アプリが書ける項目」だけ。それ以外の書き込みは、すべてルールで拒否される。
- GAS はサービスアカウントなのでルールを通らない。GAS が書く項目は、このファイルが唯一の一覧になる。
- ここに無いパスは、すべて拒否される(`firestore.rules` の既定)。

## コレクションと項目

### `users/{生徒ID}`

| 項目 | 型 | 書く人 | 読む人(アプリ) | 意味 |
| --- | --- | --- | --- | --- |
| `schoolEmail` | 文字列 | GAS | `Class.jsx`(`liveStore` 経由) | 学校のメールアドレス |
| `name` | 文字列 | GAS | `account.js` | Google アカウントの表示名(先頭の6桁の数字は画面で外す) |
| `pushKey` | 文字列 | GAS | `pushStatus.js`(`usePushKey`) | OneSignal の External ID。推測できない値(生徒IDそのものは使わない) |
| `pushBroken` | 真偽 | GAS | `pushStatus.js`(`usePushBroken`) | 通知が届かない状態の印 |
| `pushSubs` | 配列 `{id, enabled}` | GAS(30分に1回まで確認) | `pushStatus.js`(`usePushSubs`) | OneSignal 側の購読の一覧 |
| `pushSubsCheckedAt` | 時刻 | GAS | なし | `pushSubs` を最後に確認した時刻 |
| `notifyPrefs` | マップ | **アプリ** | `notifyPrefs.js` | 通知の設定(下記) |

`notifyPrefs`
- `offCourses`: オフにした授業のID(配列)
- `remindAssignment`: `{ on, daysBefore }` 課題の期限の知らせ。`daysBefore` は 1・2・3
- `remindUnread`: `{ on, afterHours }` 未読の再通知。`afterHours` は 12・24・72

既定値は `NOTIFY_PREFS_DEFAULT`(GAS)と `DEFAULT_PREFS`(`notifyPrefs.js`)にある。**2つは同じ値に保つ**。

### `users/{生徒ID}/announcements/{投稿ID}`(個人ごとのお知らせ。いまの本体)

| 項目 | 型 | 書く人 | 意味 |
| --- | --- | --- | --- |
| `category` / `courseName` / `title` / `description` / `link` / `teacher` / `postTitle` | 文字列 | GAS | 表示用の内容 |
| `body` / `rawBody` | 文字列 | GAS | 詳細画面用の全文 / Classroom の原文 |
| `dueDate` | 文字列 | GAS | 期限(表示用の文字) |
| `dueAt` | 時刻 | GAS | 期限(期限の知らせの検索用。解析できた課題だけ) |
| `attachments` | 文字列(JSON) | GAS | `[{type,title,url,thumb?}]` |
| `receivedAt` | 時刻 | GAS | 受け取った時刻(並び順に使う) |
| `deleted` | 真偽 | GAS | 先生が削除した投稿(画面では出さない) |
| `read` / `readAt` | 真偽 / 時刻 | GAS が `read:false` で作る。**アプリが既読にする** | 既読 |
| `reminded` / `unreadNotified` | 真偽 | GAS | 期限の知らせ / 未読の再通知を送った印 |

- 同じ `投稿ID` に保存すると上書きになるので、重複しない。
- アプリが書けるのは `read` と `readAt` だけ。

### `users/{生徒ID}/fcmTokens/{ハッシュ}`(端末の登録トークン。1端末1件)

- 文書ID: トークンの SHA-256 を URL で使える Base64 にしたもの(アプリと GAS で同じ計算)。
- `token`(文字列・512文字以下)、`updatedAt`(サーバーの時刻)。**アプリが書く**(これ以外の項目は書けない)。
- 通知をオフにした端末は、アプリがこの文書を消す。GAS は、送れなかったトークンや60日以上古いトークンを消す。

### `users/{生徒ID}/courses/{授業ID}`

- `joinedAt`(時刻)。所属授業。GAS が書く(メンバー登録と同時)。アプリは読めない。
- GAS の購読の同期(`fcmSyncStudent_`)が、授業のトピック購読に使う。

### `courses/{授業ID}/members/{生徒ID}` / `courses/{授業ID}/posts/{投稿ID}`

- `members.joinedAt`: 授業のメンバー。GAS が書く。アプリは読めない。
- `posts`: 授業ごとの保存(`USE_COURSE_STORE` が true のときだけ使う。いまは false)。

### `posts/{投稿鍵}`(送信の排他ロック。目標では `claims` に改名する)

- `claimedBy` / `claimedAtMs`(送る役)、`sentAtMs` / `notified`(送った記録)、`expireAt`(古い記録の削除用)。
- GAS だけが読み書きする。アプリには出てこない。

## アプリが書ける項目(まとめ)

| 書く場所 | 項目 | 呼び出し元 |
| --- | --- | --- |
| `users/{id}` | `notifyPrefs` だけ | `updateUserDoc`(`firestoreLazy.js`) |
| `users/{id}/announcements/{id}` | `read`・`readAt` だけ | `markAnnouncementReadRemote` |
| `users/{id}/fcmTokens/{ハッシュ}` | `token`・`updatedAt`(作成・更新・削除) | `saveFcmTokenRemote` / `deleteFcmTokenRemote` |

## GAS 側にだけある状態(Firestore の外)

- ユーザープロパティ: `fcmSyncAt`(購読の同期を最後に行った時刻)、授業ごとのメンバー登録の印(`memberCourse_{授業ID}`)など。
- スクリプトプロパティ: `FIREBASE_SERVICE_ACCOUNT`(サービスアカウントの JSON。**GitHub には置かない**)。

## 変更のときの手順

1. 項目を足す・変えるときは、**このファイル → `firestore.rules` → GAS → アプリ**の順に直す。
2. アプリが新しく書く項目を作るときは、必ず `firestore.rules` で「書ける項目」を絞る(`hasOnly`)。
3. 読み取りは、`liveStore.js` の `watchUser` / `watchLive` を通す(購読を端末で1つにまとめるため)。
