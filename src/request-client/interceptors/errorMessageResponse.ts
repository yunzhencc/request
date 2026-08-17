import type {
  RequestErrorCode,
  RequestErrorHandler,
  ResponseInterceptorConfig,
} from '../types';

import axios from 'axios';

function getRequestErrorCode(error: any): RequestErrorCode {
  const errorText = error?.toString?.() ?? '';
  if (errorText.includes('Network Error')) {
    return 'network';
  }
  if (error?.message?.includes?.('timeout')) {
    return 'timeout';
  }

  switch (error?.response?.status) {
    case 400:
      return 'badRequest';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 408:
      return 'timeout';
    default:
      return 'serverError';
  }
}

export function errorMessageResponseInterceptor(
  onError?: RequestErrorHandler,
): ResponseInterceptorConfig {
  return {
    rejected: (error: any) => {
      if (!axios.isCancel(error)) {
        onError?.(getRequestErrorCode(error), error);
      }
      return Promise.reject(error);
    },
  };
}
