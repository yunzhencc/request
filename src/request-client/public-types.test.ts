import type { AxiosResponse } from 'axios';
import type {
  RequestContentType,
  RequestErrorCode,
  RequestErrorHandler,
  RequestResponse,
} from '../index';
import { expectTypeOf, it } from 'vitest';

it('exports request response and content type contracts', () => {
  expectTypeOf<RequestResponse<{ id: string }>>().toMatchTypeOf<
    AxiosResponse<{ id: string }>
  >();
  expectTypeOf<RequestContentType>().toEqualTypeOf<
    | 'application/json;charset=utf-8'
    | 'application/octet-stream;charset=utf-8'
    | 'application/x-www-form-urlencoded;charset=utf-8'
    | 'multipart/form-data;charset=utf-8'
  >();
  expectTypeOf<RequestErrorCode>().toEqualTypeOf<
    | 'network'
    | 'timeout'
    | 'badRequest'
    | 'unauthorized'
    | 'forbidden'
    | 'notFound'
    | 'serverError'
  >();
  expectTypeOf<RequestErrorHandler>().parameters.toEqualTypeOf<[
    RequestErrorCode,
    unknown,
  ]>();
});
