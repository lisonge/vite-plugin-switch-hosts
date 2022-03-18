import { defineConfig } from 'vite';
import switchHostsPlugin from 'vite-plugin-switch-hosts';

export default defineConfig({
  plugins: [
    switchHostsPlugin({
      dns: {
        'dev.songe.li': 'cn-hongkong-fc-hk-mongkok.fc.aliyuncs.com',
        'p9-passport.byteacctimg.com': '125.39.164.114',
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
  },
});
