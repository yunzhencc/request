<h1 align="center">
  @yunzhen/request
</h1>

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
