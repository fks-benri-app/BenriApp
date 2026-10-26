# Classroom通知(BenriApp)

Google Classroom のお知らせ・課題を、スマホのプッシュ通知で受け取り、アプリ内で一覧できる PWA です。
GitHub Pages 上の React アプリと、Google Apps Script(GAS)・OneSignal・Firebase を組み合わせて動きます。

## プロジェクト概要

学校の Google アカウントで連携すると、Classroom に新しい投稿があったときに端末へ通知が届きます。
通知を押すと、アプリ内でそのお知らせの詳細を開けます。

| 役割 | 使っているもの |
| --- | --- |
| 画面(PWA) | React + Vite、GitHub Pages で配信 |
| 新着の検知・通知の送信 | Google Apps Script(Gmail の監視、OneSignal の REST API) |
| プッシュ通知 | OneSignal(Web Push) |
| ログイン・データ保存 | Firebase Authentication、Firestore |

### 動作の流れ

```
[アプリ]  ログイン画面     「Googleでログイン」を押す
   ↓ AccountChooser 経由
[GAS]     学校のアカウントで認証 → ログイン用のトークンを発行
   ↓ #token=… を付けてアプリへ戻る
[アプリ]  Firebase にログイン → 「通知を許可」のダイアログ
   ↓ OneSignal の購読を作成し、External ID に通知用キー(pushKey)をひもづける
[アプリ]  お知らせ画面(/class)
```

GAS は新着を検知すると、`pushKey` を宛先にして OneSignal へ送信します。
`pushKey` は、秘密の文字列と生徒 ID から GAS が作る推測できない値で、Firestore の `users/{生徒ID}.pushKey` に保存されます。
生徒 ID そのものを宛先にしないのは、他人の ID を指定するだけで他人の通知を受け取れてしまうのを防ぐためです。

## 主な特徴

- **Google でログイン**:学校の Google アカウントで連携します。パスワードの入力はありません。
- **プッシュ通知**:Classroom の新着を、アプリを閉じていても受け取れます。
- **お知らせの一覧**:未読・既読、テスト関連などで絞り込み、授業や形式でも絞れます。まとめて既読にもできます。
- **検索**:教科・先生・本文で検索できます。
- **PWA 対応**:iPhone・Android では、ホーム画面に追加する手順を案内します。iPhone ではホーム画面から開かないと通知が届きません。
- **通知の自己修復**:通知が届いていない可能性があるときは、お知らせ画面に「通知を直す」を表示します。修復ページで端末側の古い記録を消して、登録し直せます。
- **推測できない通知キー**:通知の宛先は `pushKey`(HMAC-SHA256 で生成した 32 文字)です。
- **本人だけが読める**:Firestore のルールで、`users/{生徒ID}` は本人だけが読め、書き込みは GAS だけが行います。

## 使用方法

### 利用する(生徒)

1. アプリの URL を開きます。
2. iPhone・Android では、案内に従って**ホーム画面に追加**し、そのアイコンから開き直します。
3. 「Googleでログイン」を押し、学校のアカウントを選びます。「このアプリは確認されていません」と出たら、「詳細」→「(安全ではないページ)に移動」を選びます。
4. アプリに戻ったら、ダイアログの「通知を有効にする」を押して、通知を許可します。

### 開発する

必要なもの:Node.js 22(デプロイで使っているバージョン)

```bash
npm ci          # 依存パッケージのインストール
npm run dev     # 開発サーバーの起動
npm run build   # 本番用ビルド(dist/ に出力)
npm run preview # ビルド結果の確認
```

- `main` に push すると、GitHub Actions(`.github/workflows/deploy.yml`)がビルドして GitHub Pages に公開します。
- `vite.config.js` の `base` は、リポジトリ名(`/BenriApp/`)に合わせてあります。変えると、JS・CSS が読み込めず、画面が真っ白になります。
- 設定値(GAS の URL、OneSignal の App ID)は `src/config.js` にあります。

### 主なファイル

```
public/                  そのまま配信されるファイル(manifest、Service Worker、修復ページ repair.html)
src/config.js            GAS_URL、OneSignal App ID、Firebase の設定
src/auth/identity.jsx    ログイン状態の窓口(GAS のトークンで Firebase にログイン)
src/lib/onesignal.js     OneSignal の初期化・購読・購読状態の確認
src/lib/pushStatus.js    pushKey の取得、「通知を直す」の表示の判定
src/lib/announcements.js お知らせの取得・既読の管理
src/lib/storage.js       localStorage のラッパー
src/pages/LinkPage.jsx   ログイン画面と、通知許可・再連携のダイアログ
src/pages/Class.jsx      お知らせの一覧と詳細
src/components/          ログイン画面の部品、PWA の追加案内
firestore.rules          Firestore のセキュリティルール
```

### 連携する側(GAS)について

GAS のコードはこのリポジトリには含まれません。GAS 側には、次の設定が必要です。

- スクリプトプロパティ:`PUSH_KEY_SECRET`(通知キーの元になる秘密の値)、`FIREBASE_SERVICE_ACCOUNT`、OneSignal の REST API キー
- `PUSH_KEY_SECRET` は**一度設定したら再生成しないでください**。変えると、全員の通知キーが変わり、通知が止まります。
- 旧方式(生徒 ID を宛先にする端末)が残っている間は、GAS の `INCLUDE_LEGACY_ID = true` を維持します。

## 使い方の例

### 例1:初めてログインして、通知を受け取る

1. アプリを開き、「Googleでログイン」を押します。
2. 学校のアカウントを選んで認証し、アプリに戻ります。
3. 「連携が完了しました」のダイアログで「通知を有効にする」を押し、端末の許可画面で「許可」を選びます。
4. お知らせ画面が開きます。以後、Classroom に新着が投稿されると、通知が届きます。

### 例2:通知が届かなくなったとき

1. お知らせ画面に「この端末に通知が届いていない可能性があります。」と出たら、「通知を直す」を押します。
2. 「完了しました」と表示され、通知の設定画面に移ります。
3. 「通知を有効にする」を押して、もう一度許可します。

※ 直した直後の 6 時間は、カードを表示しません。それでも届いていないと GAS が判断していれば、再び表示されます。

### 例3:連携をやり直す

1. お知らせ画面の右上のベルのアイコンを押します。
2. 「連携済みです」のダイアログで「再連携する」を押し、ログインし直します。
3. 戻ったら、「通知を有効にする」を押します。

iPhone で、再連携の画面から戻れないときは、左下の「←」の代わりに、右上の「×」を押してください。

### 例4:お知らせを探す

- 上のタグで「未読」「テスト関連」などに絞ります。
- 「すべての授業」「すべての形式」から、授業や形式で絞ります。
- 右上の虫眼鏡のアイコンで、教科・先生・本文を検索します。
- 右の「✓✓」のアイコンで、表示中の未読をすべて既読にします。

## 将来の拡張メモ

- **Service Worker**:1 つのスコープに 1 つしか置けず、いまは OneSignal のワーカーがそれです。`vite-plugin-pwa` を導入するときは `injectManifest` を使い、自前の `sw.js` の先頭で `importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js")` を読み込んでください。別々に登録すると、後から登録した方が前のものを置き換え、通知が届かなくなります。

## ライセンス情報

このリポジトリには、ライセンスのファイル(`LICENSE`)がまだありません。
そのため、現時点ではライセンスは**未設定**です。公開・再利用・改変の条件は決まっていません。

利用条件を定めるときは、リポジトリの管理者がライセンスを選び、`LICENSE` ファイルを追加してください。決めたあと、この節も更新します。

### 利用しているもの

- [React](https://react.dev/)、[Vite](https://vitejs.dev/)、[React Router](https://reactrouter.com/)
- [Firebase](https://firebase.google.com/)(Authentication、Firestore)
- [OneSignal](https://onesignal.com/)(Web Push)
- ログイン画面のイラスト:[unDraw](https://undraw.co/)(`src/assets/images/other_svgs/login.svg`)
