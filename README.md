<h1 align="center">
  @yunzhen/request
</h1>

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

基于 Axios 的轻量请求客户端：支持统一响应解包、请求/响应拦截器、401 Token 刷新队列、上传和下载。

## 安装

```bash
# npm install
npm install @yunzhen/request --save

# yarn install
yarn add @yunzhen/request

# pnpm install
pnpm i @yunzhen/request
```

## 快速开始

```ts
import { defaultResponseInterceptor, RequestClient } from '@yunzhen/request';

interface User {
  id: string;
  name: string;
}

const request = new RequestClient({
  baseURL: '/api',
  timeout: 10_000,
});

request.addResponseInterceptor(
  defaultResponseInterceptor({
    codeField: 'code',
    dataField: 'data',
    successCode: 0,
  }),
);

const user = await request.get<User>('/users/me', {
  responseReturn: 'data',
});
```

上例假定接口响应为 `{ code: 0, data: User }`。`responseReturn: 'data'` 会在 `code` 等于 `successCode` 时返回 `data` 字段；业务失败会拒绝请求。

## 创建客户端

`RequestClient` 接受 Axios 创建配置，并默认设置 `timeout: 10_000`、`Content-Type: application/json;charset=utf-8` 和 `responseReturn: 'raw'`。

```ts
const request = new RequestClient({
  baseURL: 'https://api.example.com/v1',
  headers: {
    Authorization: 'Bearer token',
  },
  paramsSerializer: 'repeat',
});
```

`instance` 是公开的 Axios 实例，可用于不在本库封装范围内的 Axios 能力：

```ts
request.instance.defaults.headers.common['X-App-Version'] = '1.0.0';
```

客户端方法在构造时已绑定，可以安全解构后使用：

```ts
const { get, getBaseUrl } = request;

await get('/health');
console.log(getBaseUrl());
```

## 请求方法

| 方法 | 说明 |
| --- | --- |
| `get(url, config?)` | GET 请求 |
| `delete(url, config?)` | DELETE 请求 |
| `post(url, data?, config?)` | POST 请求 |
| `put(url, data?, config?)` | PUT 请求 |
| `patch(url, data?, config?)` | PATCH 请求 |
| `request(url, config)` | 发送任意 Axios 请求 |
| `upload(url, data, config?)` | FormData 文件上传 |
| `download(url, config?)` | Blob 文件下载 |

除 `request` 外，常规方法会补充对应的 HTTP method。方法的泛型表示最终返回值类型：

```ts
const users = await request.get<User[]>('/users', {
  params: { page: 1 },
  responseReturn: 'data',
});

await request.request('/users/1', {
  method: 'PATCH',
  data: { name: 'Ada' },
  responseReturn: 'data',
});
```

### 查询参数序列化

`paramsSerializer` 可直接传 Axios 的序列化器，也可使用预置格式：

| 值 | `ids: [1, 2]` 的结果 |
| --- | --- |
| `brackets` | `ids[]=1&ids[]=2` |
| `comma` | `ids=1,2` |
| `indices` | `ids[0]=1&ids[1]=2` |
| `repeat` | `ids=1&ids=2` |

该选项既可设在客户端创建时，也可按单次请求覆盖。

## 响应处理

`responseReturn` 仅在添加 `defaultResponseInterceptor` 后生效：

| 值 | 返回值 |
| --- | --- |
| `raw`（默认） | 原始 `AxiosResponse` |
| `body` | 响应体 `response.data`，不校验业务 `code` |
| `data` | 响应体的业务数据字段，并校验成功码 |

```ts
request.addResponseInterceptor(
  defaultResponseInterceptor({
    codeField: 'code',
    dataField: 'data',
    successCode: 0,
  }),
);
```

`dataField` 可写为字段名或提取函数；`successCode` 可写为值或判断函数：

```ts
request.addResponseInterceptor(
  defaultResponseInterceptor({
    codeField: 'status',
    dataField: response => response.payload.items,
    successCode: status => status === 'ok',
  }),
);
```

当 `responseReturn: 'data'` 时，空响应体或不符合成功码的业务包络都会拒绝请求；使用 `body` 读取无包络或空响应。

## 拦截器与错误提示

```ts
request.addRequestInterceptor({
  fulfilled(config) {
    config.headers.Authorization = 'Bearer token';
    return config;
  },
});

request.addResponseInterceptor(
  errorMessageResponseInterceptor((code, error) => {
    // 在应用层决定如何显示文案；本库不依赖任何 UI 或 i18n 库
    console.error(code, error);
  }),
);
```

错误回调的 `code` 取值为 `network`、`timeout`、`badRequest`、`unauthorized`、`forbidden`、`notFound` 或 `serverError`。取消的 Axios 请求不会触发该回调，且错误仍会向调用方拒绝。

## 401 Token 刷新

将认证拦截器添加在响应拦截器中即可。首个 401 发起刷新；刷新期间的其他 401 请求进入队列，成功后带新 Token 重试，刷新失败时队列请求会一并拒绝并调用重新认证逻辑。

```ts
request.addResponseInterceptor(
  authenticateResponseInterceptor({
    client: request,
    enableRefreshToken: true,
    doRefreshToken: async () => {
      const response = await fetch('/api/auth/refresh', { method: 'POST' });
      const { accessToken } = await response.json();
      return accessToken;
    },
    doReAuthenticate: async () => {
      window.location.assign('/login');
    },
    formatToken: token => `Bearer ${token}`,
  }),
);
```

## 上传与下载

`upload` 自动创建 `FormData`，数组字段会编码为 `field[0]`、`field[1]`，并设置 `multipart/form-data`：

```ts
const file = document.querySelector<HTMLInputElement>('#file')!.files![0];

await request.upload('/files', {
  file,
  category: 'avatar',
  tags: ['profile', 'public'],
});
```

`download` 默认请求 Blob，并以 `body` 模式返回：

```ts
const blob = await request.download<Blob>('/reports/monthly');

const url = URL.createObjectURL(blob);
window.open(url);
```

如需响应头等元信息，可指定 `responseReturn: 'raw'`，并将泛型声明为 `AxiosResponse<Blob>`。

## 类型导出

除 Axios 的全部导出外，包还导出：

```ts
import type {
  HttpResponse,
  RequestClientConfig,
  RequestClientOptions,
  RequestContentType,
  RequestErrorCode,
  RequestErrorHandler,
  RequestResponse,
} from '@yunzhen/request';
```

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@yunzhen/request?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmx.dev/package/@yunzhen/request
[npm-downloads-src]: https://img.shields.io/npm/dm/@yunzhen/request?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmx.dev/package/@yunzhen/request
[bundle-src]: https://img.shields.io/bundlephobia/minzip/@yunzhen/request?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=@yunzhen/request
[license-src]: https://img.shields.io/github/license/yunzhencc/request.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/yunzhencc/request/blob/main/LICENSE
