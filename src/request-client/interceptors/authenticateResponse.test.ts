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

  afterEach(() => {
    mock.reset();
  });

  it('刷新失败时，排队的请求应被拒绝而不是永久悬挂', async () => {
    mock.onGet('/a').reply(401, { message: 'expired' });
    mock.onGet('/b').reply(401, { message: 'expired' });

    let rejectRefresh!: (e: Error) => void;
    const refreshPromise = new Promise<never>((_, reject) => {
      rejectRefresh = reject;
    });
    // 重新登录流程挂起，拉大 isRefreshing 保持 true 的窗口
    let resolveReAuth!: () => void;
    const reAuthPromise = new Promise<void>((resolve) => {
      resolveReAuth = resolve;
    });

    requestClient.addResponseInterceptor(authenticateResponseInterceptor({
      client: requestClient,
      enableRefreshToken: true,
      doReAuthenticate: () => reAuthPromise,
      doRefreshToken: () => refreshPromise,
      formatToken: token => (token ? `Bearer ${token}` : null),
    }));

    // 请求 A 先进入刷新分支
    const promiseA = requestClient.get('/a');
    await tick();
    // 请求 B 在刷新期间到达，进入排队
    const promiseB = requestClient.get('/b');
    await tick();

    // 提前注册处理函数，避免排队请求被拒绝时产生 unhandled rejection
    const promiseBResult = promiseB.then(
      () => 'resolved',
      () => 'rejected',
    );

    // 模拟刷新失败
    rejectRefresh(new Error('refresh failed'));

    // 等待排队请求的拒绝处理完成
    await new Promise(resolve => setTimeout(resolve, 50));

    // 排队者 B 应被拒绝，而不是永久 pending
    const result = await Promise.race([
      promiseBResult,
      new Promise<string>(resolve => setTimeout(resolve, 200, 'PENDING')),
    ]);
    expect(result).toBe('rejected');

    // 释放重新登录，让刷新者 A 完成
    resolveReAuth();
    await expect(promiseA).rejects.toThrow('refresh failed');
  });
});
