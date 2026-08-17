import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { defaultResponseInterceptor } from './interceptors';
import { RequestClient } from './request-client';

describe('requestClient', () => {
  let mock: MockAdapter;
  let requestClient: RequestClient;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    requestClient = new RequestClient();
  });

  afterEach(() => {
    mock.reset();
  });

  it('should expose the configured Axios instance and base URL', () => {
    const client = new RequestClient({
      baseURL: 'https://api.example.com/v1',
    });

    expect(client.instance.defaults.baseURL).toBe('https://api.example.com/v1');
    expect(client.getBaseUrl()).toBe('https://api.example.com/v1');
  });

  it('should successfully make a GET request', async () => {
    mock.onGet('test/url').reply(200, { data: 'response' });

    const response = await requestClient.get('test/url');

    expect(response.data).toEqual({ data: 'response' });
  });

  it('should successfully make a POST request', async () => {
    const postData = { key: 'value' };
    const mockData = { data: 'response' };
    mock.onPost('/test/post', postData).reply(200, mockData);

    const response = await requestClient.post('/test/post', postData);

    expect(response.data).toEqual(mockData);
  });

  it('should successfully make a PUT request', async () => {
    const putData = { key: 'updatedValue' };
    const mockData = { data: 'updated response' };
    mock.onPut('/test/put', putData).reply(200, mockData);

    const response = await requestClient.put('/test/put', putData);

    expect(response.data).toEqual(mockData);
  });

  it('should successfully make a PATCH request', async () => {
    const patchData = { key: 'patchedValue' };
    const mockData = { data: 'patched response' };
    mock.onPatch('/test/patch', patchData).reply(200, mockData);

    const response = await requestClient.patch('/test/patch', patchData);

    expect(response.data).toEqual(mockData);
  });

  it('should upload fields and a file as FormData', async () => {
    const file = new Blob(['file contents'], { type: 'text/plain' });
    mock.onPost('/test/upload').reply((config) => {
      const formData = config.data;
      const uploadedFile = formData instanceof FormData
        ? formData.get('file')
        : undefined;
      return formData instanceof FormData
        && uploadedFile instanceof Blob
        && uploadedFile.size === file.size
        && uploadedFile.type === file.type
        && formData.get('name') === 'report'
        ? [200, { data: 'file uploaded' }]
        : [400, { message: 'invalid form data' }];
    });

    const response = await requestClient.upload('/test/upload', {
      file,
      name: 'report',
    });

    expect(response.data).toEqual({ data: 'file uploaded' });
  });

  it('should index array upload fields and omit undefined values', async () => {
    const file = new Blob(['file contents'], { type: 'text/plain' });
    mock.onPost('/test/upload-array').reply((config) => {
      const formData = config.data as FormData;
      return formData instanceof FormData
        && formData.get('tags[0]') === 'first'
        && !formData.has('tags[1]')
        && formData.get('tags[2]') === 'third'
        && !formData.has('description')
        ? [200, { data: 'array uploaded' }]
        : [400, { message: 'invalid form data' }];
    });

    const response = await requestClient.upload('/test/upload-array', {
      file,
      tags: ['first', undefined, 'third'],
      description: undefined,
    });

    expect(response.data).toEqual({ data: 'array uploaded' });
  });

  it('should download a response as a Blob', async () => {
    const file = new Blob(['file contents'], { type: 'text/plain' });
    mock.onGet('/test/download').reply(config =>
      config.responseType === 'blob'
        ? [200, file]
        : [400, { message: 'expected blob response' }],
    );

    const response = await requestClient.download<any>('/test/download');

    expect(response.data).toBe(file);
  });

  it('should successfully make a DELETE request', async () => {
    const mockData = { data: 'delete response' };
    mock.onDelete('/test/delete').reply(200, mockData);

    const response = await requestClient.delete('/test/delete');

    expect(response.data).toEqual(mockData);
  });

  it('should handle network errors', async () => {
    mock.onGet('/test/error').networkError();

    await expect(requestClient.get('/test/error')).rejects.toMatchObject({
      isAxiosError: true,
      message: 'Network Error',
    });
  });

  it('should handle timeout', async () => {
    mock.onGet('/test/timeout').timeout();

    await expect(requestClient.get('/test/timeout')).rejects.toMatchObject({
      code: 'ECONNABORTED',
      isAxiosError: true,
    });
  });

  it('should return raw response when responseReturn is raw', async () => {
    requestClient.addResponseInterceptor(defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }));
    mock.onGet('/test/raw').reply(200, { code: 0, data: 'raw response' });

    const response = await requestClient.get('/test/raw', {
      responseReturn: 'raw',
    });

    expect(response.data).toEqual({ code: 0, data: 'raw response' });
  });

  it('should return response body when responseReturn is body', async () => {
    requestClient.addResponseInterceptor(defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }));
    const mockData = { code: 0, data: 'body response' };
    mock.onGet('/test/body').reply(200, mockData);

    const response = await requestClient.get('/test/body', {
      responseReturn: 'body',
    });

    expect(response).toEqual(mockData);
  });

  it('should return data field when responseReturn is data', async () => {
    requestClient.addResponseInterceptor(defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }));
    mock.onGet('/test/data').reply(200, { code: 0, data: 'data response' });

    const response = await requestClient.get('/test/data', {
      responseReturn: 'data',
    });

    expect(response).toBe('data response');
  });

  it('should support custom success and data fields', async () => {
    requestClient.addResponseInterceptor(defaultResponseInterceptor({
      codeField: 'statusCode',
      dataField: 'result',
      successCode: 'ok',
    }));
    mock.onGet('/test/custom-fields').reply(200, {
      result: 'custom response',
      statusCode: 'ok',
    });

    const response = await requestClient.get('/test/custom-fields', {
      responseReturn: 'data',
    });

    expect(response).toBe('custom response');
  });

  it('should support function successCode and dataField', async () => {
    requestClient.addResponseInterceptor(defaultResponseInterceptor({
      codeField: 'code',
      dataField: response => response.payload.value,
      successCode: response => response.ok === true,
    }));
    mock.onGet('/test/custom-functions').reply(200, {
      ok: true,
      payload: { value: 'function response' },
    });

    const response = await requestClient.get('/test/custom-functions', {
      responseReturn: 'data',
    });

    expect(response).toBe('function response');
  });

  it('should reject response body when success code does not match', async () => {
    requestClient.addResponseInterceptor(defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }));
    const mockData = { code: 500, data: null, message: 'failed' };
    mock.onGet('/test/business-error').reply(200, mockData);

    await expect(requestClient.get('/test/business-error', {
      responseReturn: 'data',
    })).rejects.toEqual(mockData);
  });
});
