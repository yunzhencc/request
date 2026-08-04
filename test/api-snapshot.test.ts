import { fileURLToPath } from 'node:url';
import { snapshotApiPerEntry } from 'tsnapi/vitest';
import { describe } from 'vitest';

const dir = fileURLToPath(new URL('..', import.meta.url));

describe('api snapshot', async () => {
  await snapshotApiPerEntry(dir);
});
