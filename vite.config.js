import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages のプロジェクトサイトは https://<user>.github.io/<リポジトリ名>/ で配信される。
// base をリポジトリ名に合わせないと、JS/CSS が 404 になり真っ白な画面になる。
export default defineConfig({
  base: '/classroom-notify/',
  plugins: [react()],
});
