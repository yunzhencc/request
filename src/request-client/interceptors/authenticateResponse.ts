import type { RefreshTokenQueueItem, RequestClient } from '../request-client';
import type { ResponseInterceptorConfig } from '../types';

/**
 * 取出并处理刷新期间排队的请求。
 *
 * 处理过程中若有新请求进入队列（isRefreshing 仍为 true 时到达的 401），
 * 会一并取出处理，避免队列残留导致请求永久悬挂。
 */
function drainQueue(
  client: RequestClient,
  handle: (item: RefreshTokenQueueItem) => void,
): void {
  let queued = client.refreshTokenQueue;
  client.refreshTokenQueue = [];
  while (queued.length > 0) {
    for (const item of queued) {
      handle(item);
    }
    queued = client.refreshTokenQueue;
    client.refreshTokenQueue = [];
  }
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
  return {
    rejected: async (error) => {
      const { config, response } = error;
      // 如果不是 401 错误，直接抛出异常
      if (response?.status !== 401) {
        throw error;
      }
      // 判断是否启用了 refreshToken 功能
      // 如果没有启用或者已经是重试请求了，直接跳转到重新登录
      if (!enableRefreshToken || config.__isRetryRequest) {
        await doReAuthenticate();
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

        // 用新 token 重放所有排队请求（含处理过程中新进入的请求）
        drainQueue(client, (item) => {
          try {
            item.config.headers.Authorization = formatToken(newToken);
            // 重放请求标记为重试，避免再次 401 时重复排队/无限循环
            item.config.__isRetryRequest = true;
            item.resolve(client.request(item.config.url!, { ...item.config }));
          }
          catch (err) {
            // 单个请求处理失败（如 formatToken 抛错）只影响它自己，不中断队列
            item.reject(err);
          }
        });

        return client.request(error.config.url, { ...error.config });
      }
      catch (refreshError) {
        // 刷新失败：直接拒绝所有排队请求，
        // 避免用无效 token 重放造成二次 401 或在队列中永久悬挂
        drainQueue(client, item => item.reject(refreshError));
        console.error('Refresh token failed, please login again.');
        await doReAuthenticate();

        throw refreshError;
      }
      finally {
        client.isRefreshing = false;
      }
    },
  };
}
