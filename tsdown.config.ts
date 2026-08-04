import { defineConfig } from 'tsdown';
import { StaleGuardRecorder } from 'tsdown-stale-guard';

export default defineConfig({
  entry: [
    'src/index.ts',
  ],
  dts: true,
  unbundle: true,
  exports: true,
  publint: true,
  plugins: [
    StaleGuardRecorder(),
  ],
});
