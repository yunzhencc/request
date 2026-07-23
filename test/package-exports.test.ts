import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

describe('package exports', () => {
  it('exposes RequestClient from ESM and CJS entrypoints', async () => {
    const esm = await import('@yunzhen/request');
    const cjs = require('@yunzhen/request');

    expect(esm.RequestClient).toBeTypeOf('function');
    expect(cjs.RequestClient).toBeTypeOf('function');
  });
});
