import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: ['src/main.tsx'],
  project: ['src/**/*.{ts,tsx}'],
  ignoreDependencies: ['@vitejs/plugin-react'],
  ignore: ['src/**/*.d.ts'],
}

export default config
