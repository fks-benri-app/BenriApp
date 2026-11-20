# CLAUDE.md(新しいチャットの引き継ぎ用)

このファイルは README と一緒に、新しいチャットの最初に読むこと。README に書いていない、このプロジェクトで大事な方針・状態・注意をまとめている。会話のたびに更新する(古くなった項目は消す)。

最終更新: 2026-11-20(main は PR #108 のマージ後の 51ca545)

## 話し方・作業の進め方(利用者の方針)

- 返答は日本語。
- 関数や箇所を話す前に、grep で場所を確かめてから話す。トークン量を最小限にする。
- 作業の終わりは、結果と次の一手を短く伝える。作業の過程は長く書かない。
- 「何ができるか」を聞かれたら、先に確認せず、できる範囲で実際に動いて答える。

## git / PR の決まり

- 作業は、タスクごとに origin/main から新しいブランチを切る(例: `refactor/xxx`)。
- PR は `gh pr create` ではなく、REST で作る: `gh api -X POST repos/fks-benri-app/BenriApp/pulls -f title=... -f head=... -f base=main -f body=...`(GraphQL が使えないため)。
- コミットと push は、依頼されたときに行う。作業ツリーに未コミットの変更があるときは、ブランチを切り替える前に `git stash` する。
- stop hook が「未 push のコミットがある」と言ってきたときは、push しない。先に `git ls-remote --heads origin <branch>` と `gh api repos/.../pulls/N` で確かめる。実際に一致していれば、その旨を答えるだけでよい(これまで何度も誤検知だった)。
- コミットメッセージと PR 本文の末尾には、システムリマインダーで指定された Co-Authored-By と Claude-Session の行を入れる。モデル名はその時の指定に合わせる。
- 変更後は必ず `node_modules/.bin/vite build` を通す。

## 検証の方法

- ビルドだけでは、未定義の変数を見つけられない。Babel のスコープ解析(`@babel/parser` と `@babel/traverse`)で、参照されているのに定義のない識別子を確かめる。このスクリプトは `/tmp/claude-0/` にあるが、一時的なもの。必要なら repo の `scripts/` に入れる。
- ログイン後の画面(ホーム・お知らせ・設定)は、Firebase 認証が必要なので、自動では確かめられない。実機で確認する。ログイン前の画面は Playwright で確かめられる(`vite preview` を使う)。

## プロジェクトの方針(設計の決まり)

- 通知の送信は FCM が主。OneSignal は `gas/push.gs` と `src/lib/push/onesignal.js` に隔離しており、移行が終わったら消す。
- 購読とキャッシュの入口は `src/lib/data/liveStore.js` だけ。画面ごとに独自のキャッシュを持たない。
- 通知の設定(授業ごと・端末のオン/オフ)は `src/lib/push/notifications.js` が窓口。
- Firestore の項目の約束は `docs/firestore-schema.md`。項目を変えるときは、この順に直す: 文書 → `firestore.rules` → GAS → アプリ。
- 画面の文章は `src/data/text.json` に置き、`t('key')` で取り出す。アイコンは `src/data/icons.json` と `Icon` 部品。色は `themes.json` と `courseThemes.json`。ホームの動きの数値は `homeConfig.json`。直書きしない。
- 各ファイルの先頭に、何をするファイルかの1行説明のコメントを書く。
- 飾りのコメント(`=====`、`★`)や、`/* */` のブロックコメントは使わない。ふつうの `//` にする。
- フォルダ: `src/lib/` は data / announce / push / ui / timetable に分ける。`src/pages/class/` は お知らせ画面の部品、`src/pages/home/` はホームの部品、`src/pages/dev/` は開発用の試験画面。

## 現在の状態

- main は PR #103〜#108 がすべてマージ済み。統合 PR は #108。
- **GAS(`gas/push.gs` を含む)は再デプロイが必要。** 新しいファイルを追加したため、まだ反映されていない可能性がある。
- 通知の移行は段階2まで。段階3(OneSignal の撤去)は、全員分の FCM トークンが揃っているかの確認が済んでから行う。
- 未確認・未回答の事項:
  - Firestore の読み取り量。800人で Spark の上限(50k/日)を超えるかは未計測。ホームやお知らせを開くたびの読み取り回数を測る必要がある。
  - GAS の Gmail 定期確認(30秒間隔)のトリガー数と割り当て。
  - 通知の二重送信のリスク: FCM で一部だけ成功し、その後 OneSignal が失敗すると、同じ通知が二重に届くことがある。
- タブレット対応は未着手。

## 利用者の環境・周辺

- 作業リポジトリ: `/home/claude/benriapp`(remote は `https://github.com/fks-benri-app/BenriApp`)。
- 外部のスキル集: `/home/claude/aaaaqwq/claude-code-skills/skills/`(868個。第三者のもの。使う前に中身を確かめる)。
- スキルの zip(`skills.zip`)を利用者がアップロードすると失敗した。原因は未確定(1つのスキルの zip ではなく、868個の束だったため)。利用者のエラー文を聞けていない。1スキルずつの zip に分けるか、保存カードで出す案を提示済み。

## このファイルの更新ルール

- 会話のたびに、新しく決まったこと・終わったこと・利用者が求めたことを反映する。
- 古くなった項目(マージ済みの PR の状態など)は消す。
- 利用者のメモリや README と重複する内容は書かない。このファイルは、README にない「今の状態」と「決まり」を書く。
