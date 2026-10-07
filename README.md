# Classroom通知(React + Vite / GitHub Pages)

GAS(Gmail監視・OneSignal送信)と組み合わせて、Classroomの新着課題をプッシュ通知するアプリ。

## 動作の流れ

```
[GitHub Pages]  #/            連携を開始する ボタン
      ↓ AccountChooser 経由
[GAS]           アカウント選択 → ログイン → 「確認されていません」警告を承諾 → 連携開始ボタン
      ↓ returnToApp(): ?studentId=XXXXXX 付きで戻る
[GitHub Pages]  #/            通知を有効にする ボタン(OneSignal購読)
      ↓
[GitHub Pages]  #/home        普段使うページ(既存のReactコードを載せる)
```

## フォルダ構成

```
public/            そのまま配信されるファイル(manifest・Service Worker・アイコン)
src/config.js      GAS_URL / OneSignal App ID など設定値
src/auth/identity.jsx   「誰が使っているか」の窓口(将来のログイン導入はここだけ差し替え)
src/lib/onesignal.js    OneSignal の初期化・購読
src/lib/storage.js      localStorage のラッパー
src/pages/LinkPage.jsx  連携 → 通知許可の画面
src/pages/HomePage.jsx  ★既存のページコードを載せる場所
```

## 将来ログインを入れるとき

アプリの他の部分は `useIdentity()` しか使っていません。`src/auth/identity.jsx` の中身を
Firebase Auth などに差し替え、`identity.id` に認証済みのユーザーIDを入れれば、
`subscribeAs(identity.id)` や HomePage はそのまま動きます。

## 将来PWA化するとき

Service Worker は1スコープに1つしか置けず、いまは OneSignal のワーカーがそれです。
`vite-plugin-pwa` を入れる場合は `injectManifest` を使い、自前の sw.js の先頭で
`importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js")` を読み込んでください。
(両方を別々に登録すると、後から登録した方が前のものを置き換えて通知が届かなくなります)
