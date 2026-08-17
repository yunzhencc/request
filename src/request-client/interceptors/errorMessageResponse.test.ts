import type { RequestErrorCode } from '../types';

import axios from 'axios';
import { describe, expect, it } from 'vitest';

import { errorMessageResponseInterceptor } from './index';

describe('errorMessageResponseInterceptor', () => {
  it.each([
    [new Error('Network Error'), 'network'],
    [new Error('timeout of 10000ms exceeded'), 'timeout'],
    [{ response: { status: 400 } }, 'badRequest'],
    [{ response: { status: 401 } }, 'unauthorized'],
    [{ response: { status: 403 } }, 'forbidden'],
    [{ response: { status: 404 } }, 'notFound'],
    [{ response: { status: 408 } }, 'timeout'],
    [{ response: { status: 500 } }, 'serverError'],
  ] as const)('reports %s as %s', async (error, code) => {
    let reported: RequestErrorCode | undefined;
    const interceptor = errorMessageResponseInterceptor((errorCode) => {
      reported = errorCode;
    });

    await expect(interceptor.rejected!(error)).rejects.toBe(error);

    expect(reported).toBe(code);
  });

  it('does not report canceled requests', async () => {
    const error = new axios.CanceledError('canceled');
    let reported = false;
    const interceptor = errorMessageResponseInterceptor(() => {
      reported = true;
    });

    await expect(interceptor.rejected!(error)).rejects.toBe(error);

    expect(reported).toBe(false);
  });
});
