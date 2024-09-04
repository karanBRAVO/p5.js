import { defineWorkspace } from 'vitest/config';
import vitePluginString from 'vite-plugin-string';

const plugins = [
  vitePluginString({
    include: [
      'src/webgl/shaders/**/*'
    ]
  })
];

export default defineWorkspace([
  {
    plugins,
    publicDir: '../test',
    test: {
      name: 'visual',
      root: './',
      include: [
        './test/unit/visual/*'
      ],
      environment: 'node'
    }
  },
  {
    plugins,
    publicDir: '../test',
    test: {
      name: 'unit',
      root: './',
      include: [
        './test/unit/**/*.js'
      ],
      exclude: [
        './test/unit/spec.js',
        './test/unit/assets/**/*',
        './test/unit/visual/**/*'
      ],
      testTimeout: 1000,
      globals: true,
      browser: {
        enabled: true,
        name: 'chrome',
        provider: 'webdriverio',
        screenshotFailures: false
      }
    }
  }
]);