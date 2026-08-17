import type { RequestClientOptions } from './types';
import { isString } from 'es-toolkit';
import qs from 'qs';

export function bindMethods(instance: object): void {
  const prototype = Object.getPrototypeOf(instance);

  for (const key of Object.getOwnPropertyNames(prototype)) {
    if (key === 'constructor') {
      continue;
    }

    const method = Reflect.get(instance, key);
    if (typeof method === 'function') {
      Object.defineProperty(instance, key, {
        configurable: true,
        value: method.bind(instance),
        writable: true,
      });
    }
  }
}

export function getParamsSerializer(
  paramsSerializer: RequestClientOptions['paramsSerializer'],
): RequestClientOptions['paramsSerializer'] {
  if (isString(paramsSerializer)) {
    switch (paramsSerializer) {
      case 'brackets': {
        return (params: any) =>
          qs.stringify(params, { arrayFormat: 'brackets' });
      }
      case 'comma': {
        return (params: any) => qs.stringify(params, { arrayFormat: 'comma' });
      }
      case 'indices': {
        return (params: any) =>
          qs.stringify(params, { arrayFormat: 'indices' });
      }
      case 'repeat': {
        return (params: any) => qs.stringify(params, { arrayFormat: 'repeat' });
      }
    }
  }

  return paramsSerializer;
}
