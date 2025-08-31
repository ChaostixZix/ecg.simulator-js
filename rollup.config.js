import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/index.mjs',
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
    external: ['react']
  },
  {
    input: 'src/react.tsx',
    output: [
      {
        file: 'dist/react.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/react.mjs',
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
    external: ['react']
  },
  {
    input: 'dist/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  },
  {
    input: 'dist/react.d.ts',
    output: {
      file: 'dist/react.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
];