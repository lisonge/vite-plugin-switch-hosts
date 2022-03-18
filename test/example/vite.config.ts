import { defineConfig } from 'vite';
import switchHostsPlugin from '../../src/index';
import ViteRestart from 'vite-plugin-restart';

export default defineConfig({
  plugins: [
    switchHostsPlugin({
      dns: {
        'dev.songe.li': 'cn-hongkong-fc-hk-mongkok.fc.aliyuncs.com',
        'p9-passport.byteacctimg.com': '125.39.164.114',
      },
    }),
    ViteRestart({
      restart: ['../../src/index.ts', '../../src/inject_template.ts'],
    }),
  ],
  server: {
    host: '127.0.0.1',
  },
});
