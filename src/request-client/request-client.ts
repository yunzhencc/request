import type { AxiosInstance, AxiosResponse } from 'axios';
import type {
  RequestClientConfig,
  RequestClientOptions,
  RequestInterceptorConfig,
  ResponseInterceptorConfig,
} from './types';

import axios from 'axios';
import { merge } from 'es-toolkit/object';
import { getParamsSerializer } from './utils';

const defaultRequestInterceptorConfig: RequestInterceptorConfig = {
  fulfilled: response => response,
  rejected: error => Promise.reject(error),
};

const defaultResponseInterceptorConfig: ResponseInterceptorConfig = {
  fulfilled: (response: AxiosResponse) => response,
  rejected: error => Promise.reject(error),
};

export class RequestClient {
  // 是否正在刷新token
  public isRefreshing = false;
  // 刷新token队列
  public refreshTokenQueue: ((token: string) => void)[] = [];
  private readonly instance: AxiosInstance;

  constructor(options: RequestClientOptions = {}) {
    // 合并默认配置和传入的配置
    const defaultConfig: RequestClientOptions = {
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
      responseReturn: 'raw',
      // 默认超时时间
      timeout: 10_000,
    };

    const { ...axiosConfig } = options;
    const requestConfig = merge(defaultConfig, axiosConfig);
    requestConfig.paramsSerializer = getParamsSerializer(
      requestConfig.paramsSerializer,
    );
    this.instance = axios.create(requestConfig);
  }

  addRequestInterceptor({
    fulfilled,
    rejected,
  }: RequestInterceptorConfig = defaultRequestInterceptorConfig) {
    this.instance.interceptors.request.use(fulfilled, rejected);
  }

  addResponseInterceptor<T = any>({
    fulfilled,
    rejected,
  }: ResponseInterceptorConfig<T> = defaultResponseInterceptorConfig) {
    this.instance.interceptors.response.use(fulfilled, rejected);
  }

  /**
   * GET请求方法
   */
  public get<T = any>(url: string, config?: RequestClientConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  /**
   * DELETE请求方法
   */
  public delete<T = any>(
    url: string,
    config?: RequestClientConfig,
  ): Promise<T> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  /**
   * POST请求方法
   */
  public post<T = any>(
    url: string,
    data?: any,
    config?: RequestClientConfig,
  ): Promise<T> {
    return this.request<T>(url, { ...config, data, method: 'POST' });
  }

  /**
   * PUT请求方法
   */
  public put<T = any>(
    url: string,
    data?: any,
    config?: RequestClientConfig,
  ): Promise<T> {
    return this.request<T>(url, { ...config, data, method: 'PUT' });
  }

  /**
   * 通用的请求方法
   */
  public async request<T>(
    url: string,
    config: RequestClientConfig,
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.instance({
        url,
        ...config,
        ...(config.paramsSerializer
          ? { paramsSerializer: getParamsSerializer(config.paramsSerializer) }
          : {}),
      });
      return response as T;
    }
    catch (error: any) {
      throw error.response ? error.response.data : error;
    }
  }
}
