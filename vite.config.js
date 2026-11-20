import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';

// ビルドの結果から、Service Worker が最初に端末へ入れるファイルの一覧(precache.json)を作る。
// 中身が変わると version も変わるので、古いキャッシュは新しい版が入ったときに消される。
// public/ocr(数十MBのモデル)は含めない(必要になったときだけ読む)。
function precacheManifest() {
  return {
    name: 'precache-manifest',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map')).sort();
      const hash = createHash('sha256');
      files.forEach((f) => hash.update(f + (bundle[f].code ?? bundle[f].source ?? '')));
      const extra = ['icon-192.png', 'icon-512.png', 'manifest.json'];
      const list = ['', ...files, ...extra];
      this.emitFile({
        type: 'asset',
        fileName: 'precache.json',
        source: JSON.stringify({ version: hash.digest('hex').slice(0, 12), files: list }),
      });
    },
  };
}

// GitHub Pages のプロジェクトサイトは https://<user>.github.io/<リポジトリ名>/ で配信される。
// base をリポジトリ名に合わせないと、JS/CSS が 404 になり真っ白な画面になる。
export default defineConfig({
  base: '/BenriApp/',
  plugins: [react(), precacheManifest()],
  build: {
    // 20KB以下の画像(下のアイコンなど)は別ファイルにせず、JSの中に埋め込む。
    // iPhoneのホーム画面から起動した直後に、画像の読み込みが失敗するのを防ぐ
    assetsInlineLimit: 20000,
    rollupOptions: {
      output: {
        // 大きなライブラリを別ファイルに分ける。アプリを更新しても、これらは変わらないので、
        // 端末にキャッシュされ、次回以降の読み込みが速くなる
        manualChunks(id) {
          // Firestore は必要になったときだけ読むので、起動時に読む vendor-firebase とは分ける
          if (/node_modules\/(@firebase\/firestore|firebase\/firestore|@firebase\/webchannel-wrapper|re2js)/.test(id)) return 'vendor-firestore';
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'vendor-firebase';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
});