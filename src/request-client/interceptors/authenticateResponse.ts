import type { RequestClient } from '../request-client';
import type { ResponseInterceptorConfig } from '../types';

function drainQueue(
  client: RequestClient,
  handle: (item: RequestClient['refreshTokenQueue'][number]) => void,
): void {
  const queue = client.refreshTokenQueue;
  client.refreshTokenQueue = [];
  queue.forEach(handle);
}

export function authenticateResponseInterceptor({
  client,
  doReAuthenticate,
  doRefreshToken,
  enableRefreshToken,
  formatToken,
}: {
  client: RequestClient;
  doReAuthenticate: () => Promise<void>;
  doRefreshToken: () => Promise<string>;
  enableRefreshToken: boolean;
  formatToken: (token: string) => null | string;
}): ResponseInterceptorConfig {
  let isReAuthenticating = false;

  return {
    rejected: async (error) => {
      const { config, response } = error;
      // 如果不是 401 错误，直接抛出异常
      if (response?.status !== 401) {
        throw error;
      }
      // 判断是否启用了 refreshToken 功能
      // 如果没有启用或者已经是重试请求了，直接跳转到重新登录
      if (!enableRefreshToken || config.__isRetryRequest || isReAuthenticating) {
        if (!isReAuthenticating) {
          await doReAuthenticate();
        }
        throw error;
      }

      // 如果正在刷新 token，则将请求加入队列，等待刷新完成
      if (client.isRefreshing) {
        return new Promise((resolve, reject) => {
          client.refreshTokenQueue.push({ config, reject, resolve });
        });
      }

      // 标记开始刷新 token
      client.isRefreshing = true;
      // 标记当前请求为重试请求，避免无限循环
      config.__isRetryRequest = true;

      try {
        const newToken = await doRefreshToken();

        drainQueue(client, (item) => {
          try {
            item.config.headers.Authorization = formatToken(newToken);
            item.config.__isRetryRequest = true;
            item.resolve(client.request(item.config.url!, { ...item.config }));
          }
          catch (error) {
            item.reject(error);
          }
        });

        return client.request(error.config.url, { ...error.config });
      }
      catch (refreshError) {
        // 如果刷新 token 失败，处理错误（如强制登出或跳转登录页面）
        isReAuthenticating = true;
        drainQueue(client, item => item.reject(refreshError));
        console.error('Refresh token failed, please login again.');
        await doReAuthenticate();

        throw refreshError;
      }
      finally {
        client.isRefreshing = false;
        isReAuthenticating = false;
      }
    },
  };
}
