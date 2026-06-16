import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(new Date().toISOString())
  },
  plugins: [react()],
  server: {
    port: 5174
  }
});
