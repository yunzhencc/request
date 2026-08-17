import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RequestClient } from '../request-client';
import { authenticateResponseInterceptor } from './authenticateResponse';

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('authenticateResponseInterceptor', () => {
  let mock: MockAdapter;
  let requestClient: RequestClient;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    requestClient = new RequestClient();
  });

  afterEach(() => mock.reset());

  it('rejects 401s arriving while reauthentication is pending after a refresh failure', async () => {
    mock.onGet('/a').reply(401, { message: 'expired' });
    mock.onGet('/b').reply(401, { message: 'expired' });
    mock.onGet('/c').reply(401, { message: 'expired' });

    let rejectRefresh!: (error: Error) => void;
    const refresh = new Promise<never>((_, reject) => {
      rejectRefresh = reject;
    });
    let resolveReauthenticate!: () => void;
    const reauthenticate = new Promise<void>((resolve) => {
      resolveReauthenticate = resolve;
    });

    requestClient.addResponseInterceptor(authenticateResponseInterceptor({
      client: requestClient,
      enableRefreshToken: true,
      doRefreshToken: () => refresh,
      doReAuthenticate: () => reauthenticate,
      formatToken: token => `Bearer ${token}`,
    }));

    void requestClient.get('/a').catch(() => {});
    await tick();
    void requestClient.get('/b').catch(() => {});
    await tick();
    rejectRefresh(new Error('refresh failed'));
    await tick();

    const lateRequest = requestClient.get('/c').then(
      () => 'resolved',
      () => 'rejected',
    );

    try {
      await expect(Promise.race([
        lateRequest,
        new Promise<string>(resolve => setTimeout(resolve, 50, 'PENDING')),
      ])).resolves.toBe('rejected');
    }
    finally {
      resolveReauthenticate();
    }
  });
});
