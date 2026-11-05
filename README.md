# BenriApp(Classroom 通知)

Google Classroom のお知らせ・課題を、スマホのプッシュ通知で受け取り、アプリ内で一覧できる PWA です。
画面は GitHub Pages で配信する React アプリです。新着の検知と通知の送信は、Google Apps Script(GAS)が行います。

> **現在の状態**
> 通知の送信は、まだ OneSignal を使っています。FCM への移行と、お知らせの授業単位での保存は進行中です。
> 計画の詳細は [通知の仕様(改訂版)](docs/notification-spec.md) を見てください。

## 目次

- [概要](#概要)
- [主な機能](#主な機能)
- [利用する(生徒)](#利用する生徒)
- [開発する](#開発する)
- [リポジトリの構成](#リポジトリの構成)
- [ガジェットを追加する](#ガジェットを追加する)
- [GAS 側の設定](#gas-側の設定)
- [時間割読み取り(テスト機能)](#時間割読み取りテスト機能)
- [よくある操作](#よくある操作)
- [今後の予定](#今後の予定)
- [ライセンス](#ライセンス)

## 概要

学校の Google アカウントで連携すると、Classroom に新しい投稿があったときに、端末へ通知が届きます。通知を押すと、アプリ内でそのお知らせの詳細を開けます。

| 役割 | 使っているもの |
| --- | --- |
| 画面(PWA) | React + Vite、GitHub Pages で配信 |
| 新着の検知・通知の送信 | Google Apps Script(Gmail の監視、OneSignal の REST API) |
| プッシュ通知 | OneSignal(Web Push)。FCM へ移行中 |
| ログイン・データ保存 | Firebase Authentication、Firestore |

### ログインから通知までの流れ

```
[アプリ]  ログイン画面     「Googleでログイン」を押す
   ↓ AccountChooser 経由
[GAS]     学校のアカウントで認証 → ログイン用のトークンを発行
   ↓ #token=… を付けてアプリへ戻る
[アプリ]  Firebase にログイン → 「通知を許可」のダイアログ
   ↓ OneSignal の購読を作成し、External ID に通知用キー(pushKey)をひもづける
[アプリ]  お知らせ画面(/class)
```

GAS は新着を検知すると、`pushKey` を宛先にして OneSignal へ送信します。`pushKey` は、秘密の文字列と生徒 ID から GAS が作る、推測できない値です。Firestore の `users/{生徒ID}.pushKey` に保存されます。生徒 ID そのものを宛先にしないのは、他人の ID を指定するだけで、他人の通知を受け取れてしまうのを防ぐためです。

## 主な機能

- Google でログイン: 学校の Google アカウントで連携します。パスワードの入力はありません。
- プッシュ通知: Classroom の新着を、アプリを閉じていても受け取れます。
- お知らせの一覧: 未読・既読、テスト関連などで絞り込めます。授業や形式でも絞れ、まとめて既読にもできます。
- ホーム画面(ガジェット): お知らせなどを「ガジェット」として並べられます。長押しで編集モードに入り、ドラッグで移動、角のハンドルで大きさを変えられます。配置は端末ごとに保存されます。
- 授業ごとの通知設定: 授業ごとに通知のオン・オフを切り替えられます。全体のオン・オフは、この端末の購読で決まります。
- オフライン表示: 前回読んだお知らせは端末に保存し、オフラインでも表示します。
- 検索: 教科・先生・本文で検索できます。
- PWA 対応: iPhone・Android では、ホーム画面に追加する手順を案内します。iPhone では、ホーム画面から開かないと通知が届きません。
- 通知の修復: 通知が届いていない可能性があるときは、お知らせ画面に「通知を直す」を表示します。修復ページで端末側の古い記録を消し、登録し直せます。
- 推測できない通知キー: 通知の宛先は `pushKey` です(HMAC-SHA256 で生成した 32 文字)。
- 本人だけが読める: Firestore のルールで、`users/{生徒ID}` は本人だけが読めます。書き込みは GAS だけが行います。

## 利用する(生徒)

1. アプリの URL を開きます。
2. iPhone・Android では、案内に従ってホーム画面に追加し、そのアイコンから開き直します。
3. 「Googleでログイン」を押し、学校のアカウントを選びます。「このアプリは確認されていません」と出たら、「詳細」→「(安全ではないページ)に移動」を選びます。
4. アプリに戻ったら、ダイアログの「通知を有効にする」を押して、通知を許可します。

## 開発する

必要なもの: Node.js 22(デプロイで使っているバージョン)

```bash
npm ci          # 依存パッケージのインストール
npm run dev     # 開発サーバーの起動
npm run build   # 本番用ビルド(dist/ に出力)
npm run preview # ビルド結果の確認
```

- `main` に push すると、GitHub Actions(`.github/workflows/deploy.yml`)がビルドして、GitHub Pages に公開します。
- `vite.config.js` の `base` は、リポジトリ名(`/BenriApp/`)に合わせてあります。変えると、JS・CSS が読み込めず、画面が真っ白になります。
- ライブラリは、チャンクに分けて配信します(`vite.config.js` の `manualChunks`)。`vendor-react` と `vendor-firebase` は起動時に読み、`vendor-firestore` は必要になったときに読みます。
- Firestore は直接 import しないでください。`src/lib/firestoreLazy.js` から使います。購読は `subscribe`、保存は `updateUserDoc` を使います。
- 設定値(GAS の URL、OneSignal の App ID)は `src/config.js` にあります。

## リポジトリの構成

```
public/                       そのまま配信されるファイル(manifest、OneSignal の Service Worker、修復ページ repair.html)
src/config.js                 GAS_URL、OneSignal App ID、Firebase の設定
src/auth/identity.jsx         ログイン状態の窓口(GAS のトークンで Firebase にログイン)
src/lib/firebase.js           Firebase App と Auth(Firestore は含まない)
src/lib/firestoreLazy.js      Firestore を必要になったときに読み込む
src/lib/onesignal.js          OneSignal の初期化・購読・購読状態の確認
src/lib/pushStatus.js         pushKey の取得、「通知を直す」の表示の判定
src/lib/notifyPrefs.js        授業ごとの通知設定(users/{生徒ID}.notifyPrefs)
src/lib/announcements.js      お知らせの取得・既読の管理・端末へのキャッシュ
src/lib/account.js            アカウント名の取得(端末に保存して、次回すぐ表示)
src/lib/homeLayout.js         ホームのマス目、ガジェットの配置(重なりの解消・保存)
src/lib/bootOpen.js           通知から開いたときの画面の判定
src/lib/storage.js            localStorage のラッパー
src/lib/timetable*.js         時間割読み取り(テスト機能)。OCR・表の組み立て・授業名との照合
src/gadgets/gadgets.json      ホームに置けるガジェットの設定
src/gadgets/index.js          gadgets.json を読み込み、形式を確かめる
src/gadgets/components.js     gadgets.json の type と、中身の部品の対応表
src/gadgets/ClassNoticesGadget.jsx  「お知らせ」ガジェットの中身
src/pages/Home.jsx            ホーム画面(ガジェットを並べる・編集する)
src/pages/Class.jsx           お知らせの一覧と詳細
src/pages/Settings.jsx        設定画面
src/pages/NotifySettings.jsx  通知の詳細設定(授業ごとのオン・オフ)
src/pages/LinkPage.jsx        ログイン画面と、通知許可・再連携のダイアログ
src/components/               ログイン画面の部品、PWA の追加案内
gas/                          GAS のソース(「GAS 側の設定」を参照)
docs/notification-spec.md     通知の仕様(改訂版)
firestore.rules               Firestore のセキュリティルール
```

## ガジェットを追加する

ホームに置く部品は、`src/gadgets/gadgets.json` に項目を書いて増やします。

```json
{
  "id": "classNotices",
  "type": "classNotices",
  "title": "お知らせ",
  "path": "/class",
  "initial": true,
  "addable": true,
  "defaultPos": { "x": 0, "y": 0, "w": 5, "h": 5 },
  "min": { "w": 3, "h": 3 },
  "max": { "w": 40, "h": 14 }
}
```

| 項目 | 意味 |
| --- | --- |
| `id` | 保存に使う名前。他と重ならないものにし、後から変えない |
| `type` | 中身の部品の名前(`src/gadgets/components.js` にあるもの) |
| `title` | 枠の見出し |
| `path` | タップしたときに開く画面。省略すると、タップしても何も起きない |
| `initial` | `true` なら、初めて開いたときから置く |
| `addable` | `true` なら、ガジェットの追加画面から追加できる(省略時は `true`) |
| `defaultPos` | 初めて置くときの位置と大きさ(マスの数) |
| `min` / `max` | 大きさの範囲(マスの数)。実際の上限は、画面の列数で決まる |

- 大きさと位置は、マスの数で書きます。画面が広くても、マス 1 つの大きさは変わりません。
- マス目の列数は画面の幅から決まり、3〜30 列の範囲です。1 マスの目安は約 68px です。
- 形式がおかしい項目(`id` の重複、未対応の `type`、範囲の誤りなど)は読み飛ばし、理由をコンソールに出します。画面は壊れません。
- 中身を新しく作るときだけ、部品を `src/gadgets/` に作り、`components.js` に 1 行足します。
- 配置は端末ごとに保存されます。初めての端末では、`initial: true` のガジェットだけを置きます。保存済みの端末に後から追加したガジェットは、追加画面ができるまで自動では出ません。

## GAS 側の設定

GAS のコードは `gas/` にあります。ただし、GAS のプロジェクト本体は Google 側にあります。このリポジトリを push しても、自動では反映されません。反映するには、GAS エディタにコピーするか、clasp などを使います。

- スクリプトプロパティ: `PUSH_KEY_SECRET`(通知キーの元になる秘密の値)、`FIREBASE_SERVICE_ACCOUNT`、OneSignal の REST API キー
- **`PUSH_KEY_SECRET` は、一度設定したら再生成しないでください。** 変えると、全員の通知キーが変わり、通知が止まります。
- `INCLUDE_LEGACY_ID`: 生徒 ID を宛先にしている旧方式の端末に送るための設定です。旧方式の端末が残っている間は `true` にします。現在の `main` では `false` になっています。反映する前に、OneSignal で生徒 ID の購読が残っていないかを確認してください(仕様書の移行 2 番)。
- リマインド: `gas/assignment-reminder.gs` にあります。`setupDueReminderTrigger` を 1 回実行して、毎時の trigger を設定してください。
  - 課題の期限: 生徒が設定した「何日前」(1〜3 日)に、JST の 18 時以降に知らせます。
  - 未読のお知らせ: 受け取ってから、設定した時間(12 時間・1 日・3 日)がたった未読を、1 回だけ知らせます。
- 既読は、アプリで読むと、Firestore の `read` / `readAt` にも書きます。サーバーが未読を判断するためです。
- 次の 2 つは、Firebase の設定が必要です。
  - `firestore.rules` を公開し直してください。本人が書けるのは、お知らせの `read` / `readAt` だけです。
  - 検索用の複合インデックス(`announcements` の `read` と `receivedAt`)が要ります。初回の実行でエラーが出たら、ログのリンクから作成してください。
- この機能を入れる前に保存されたお知らせには、`dueAt` や `read` がありません。そのため、リマインドの対象になりません。

## 時間割読み取り(テスト機能)

写真から授業の時間割を読み取る機能です。現在はテスト画面だけで、通知やお知らせとは連携していません。

- 文字の読み取りには、PaddleOCR(PP-OCRv5)を使います。ブラウザの中で実行され、写真は端末の外に出ません。
- 初回だけ、モデル(約 20MB)と実行用の部品(約 28MB)を読み込みます。読み込みは CDN から行っています。
- 読み取った文字は、見出しの位置をもとに「曜日 × 時限」の表に組み立てます。候補と合わないマスは、手で選び直せます。
- 処理には、端末によって数十秒かかります。実機での計測は、まだ確認していません。

## よくある操作

### 通知が届かなくなったとき

1. お知らせ画面に「この端末に通知が届いていない可能性があります。」と出たら、「通知を直す」を押します。
2. 「完了しました」と表示され、通知の設定画面に移ります。
3. 「通知を有効にする」を押して、もう一度許可します。

※ 直した直後の 6 時間は、カードを表示しません。それでも届いていないと GAS が判断していれば、再び表示されます。

### 連携をやり直す

1. お知らせ画面の右上のベルのアイコンを押します。
2. 「連携済みです」のダイアログで「再連携する」を押し、ログインし直します。
3. 戻ったら、「通知を有効にする」を押します。

iPhone で、再連携の画面から戻れないときは、左下の「←」の代わりに、右上の「×」を押してください。

### お知らせを探す

- 上のタグで「未読」「テスト関連」などに絞ります。
- 「すべての授業」「すべての形式」から、授業や形式で絞ります。
- 右上の虫眼鏡のアイコンで、教科・先生・本文を検索します。
- 右の「✓✓」のアイコンで、表示中の未読をすべて既読にします。

## 今後の予定

以下は構想段階で、まだ実装していません。実装の順番や内容は変わることがあります。

### 機能の追加

| 機能 | 内容 |
| --- | --- |
| 授業お知らせ機能 | 授業ごとにお知らせをまとめて表示します |
| リンク共有機能 | 授業の資料やリンクを、クラスの中で共有します |
| 指定した駅の運行情報 | 登録した駅の遅延・運休情報を表示します |
| 天気予報から服装・傘の予報 | 天気から、服装や傘が要るかを案内します |
| AI アシスタント機能 | 質問に答えたり、予定や課題をまとめたりします |
| データエクスポート機能 | AI アシスタントの会話などのデータを書き出せるようにします。AI アシスタント機能の一部として計画しています |

### ガジェット方式

各機能を、独立した「ガジェット」(カード状の部品)として扱います。

- デフォルトで置くガジェット: 次の授業(授業カード)、お知らせ(クラスルーム)、AI アシスタント
- ガジェットルーム: ガジェットを追加・並べ替え・削除する場所を作ります。デフォルト以外のガジェットは、ここから追加します。

### 画面構成(タブ)

| タブ | 役割 |
| --- | --- |
| ホーム | 置いたガジェットを並べて表示します(実装済み) |
| 予定表 | 授業や課題の予定を、カレンダーで表示します |
| ガジェット | ガジェットを追加・管理します。追加画面は未実装で、現状は `gadgets.json` で定義しています |
| 設定 | 通知や、アカウントに関する設定をまとめます(実装済み) |

### 通知の仕組みの改善

通知の移行(OneSignal から FCM へ、授業単位の保存へ)は、[通知の仕様(改訂版)](docs/notification-spec.md)にまとめています。

将来は、通知までの遅れ(ラグ)を減らすことも考えています。

- 確認の間隔を 30 秒にする: GAS が Classroom の新着を 30 秒ごとに確認します。
- ユーザーごとに時刻をずらす: 同じ 30 秒間隔でも、ユーザーごとに確認の時刻をずらし、確認の回数を平均化します。
- 同じ授業のカードを共有する: 同じ授業の新着は、一度取得したカードを、その授業を受けている人の間で使い回します。

※ Google 側の利用制限(GAS の実行時間やトリガーの上限)を超えないかは、実装前に確認します。

### 将来の拡張メモ

- Service Worker: 1 つのスコープに置けるのは 1 つだけです。いまは OneSignal のワーカーがそれです。`vite-plugin-pwa` を導入するときは `injectManifest` を使い、自前の `sw.js` の先頭で `importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js")` を読み込んでください。別々に登録すると、後から登録した方が前のものを置き換え、通知が届かなくなります。
- FCM への移行に入ったら、OneSignal の Service Worker と FCM の Service Worker のどちらを使うかを、先に決めてください。

## ライセンス

このリポジトリには、ライセンスのファイル(`LICENSE`)がまだありません。そのため、現時点ではライセンスは未設定です。公開・再利用・改変の条件は決まっていません。

利用条件を定めるときは、リポジトリの管理者がライセンスを選び、`LICENSE` ファイルを追加してください。決めたら、この節も更新します。

### 利用しているもの

- [React](https://react.dev/)、[Vite](https://vitejs.dev/)、[React Router](https://reactrouter.com/)
- [Firebase](https://firebase.google.com/)(Authentication、Firestore)
- [OneSignal](https://onesignal.com/)(Web Push)
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)(PP-OCRv5、時間割読み取り)、[ONNX Runtime Web](https://onnxruntime.ai/)
- ログイン画面のイラスト: [unDraw](https://undraw.co/)(`src/assets/images/other_svgs/login.svg`)
