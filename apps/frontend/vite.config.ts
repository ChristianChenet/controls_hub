import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(new Date().toISOString())
  },
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // Em desenvolvimento local o frontend roda no Vite, mas a API fica no backend.
      // Em producao/publicacao o Nginx faz esse mesmo papel com /api.
      '/api': {
        target: 'http://127.0.0.1:3334',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
