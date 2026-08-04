<h1 align="center">
  @yunzhen/request
</h1>

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

## 🏗 安装

```bash
# npm install
npm install @yunzhen/request --save

# yarn install
yarn add @yunzhen/request

# pnpm install
pnpm i @yunzhen/request
```

## 🔨 使用

```tsx
import { defaultResponseInterceptor, RequestClient } from '@yunzhen/request';

const request = new RequestClient();

// 处理返回的响应数据格式
request.addResponseInterceptor(
  defaultResponseInterceptor({
    codeField: 'code',
    dataField: 'data',
    successCode: 0,
  }),
);
```

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@yunzhen/request?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmx.dev/package/@yunzhen/request
[npm-downloads-src]: https://img.shields.io/npm/dm/@yunzhen/request?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmx.dev/package/@yunzhen/request
[bundle-src]: https://img.shields.io/bundlephobia/minzip/@yunzhen/request?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=@yunzhen/request
[license-src]: https://img.shields.io/github/license/yunzhen/request.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/yunzhencc/request/blob/main/LICENSE
