import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages のプロジェクトサイトは https://<user>.github.io/<リポジトリ名>/ で配信される。
// base をリポジトリ名に合わせないと、JS/CSS が 404 になり真っ白な画面になる。
export default defineConfig({
  base: '/BenriApp/',
  plugins: [react()],
  build: {
    // 20KB以下の画像(下のアイコンなど)は別ファイルにせず、JSの中に埋め込む。
    // iPhoneのホーム画面から起動した直後に、画像の読み込みが失敗するのを防ぐ
    assetsInlineLimit: 20000,
    rollupOptions: {
      output: {
        // 大きなライブラリを別ファイルに分ける。アプリを更新しても、これらは変わらないので、
        // 端末にキャッシュされ、次回以降の読み込みが速くなる
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'vendor-firebase';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
});