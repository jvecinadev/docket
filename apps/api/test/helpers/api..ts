import request from 'supertest';
import { createApp } from '../../src/app';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export function client(token?: string) {
  const base = request(createApp);
  const withAuth = <T extends request.Test>(t: T): T =>
    token ? (t.set('Authorization', `Bearer ${token}`) as T) : t;

  const wrap =
    (method: Method) =>
    (url: string) =>
      withAuth(base[method](url));

  return {
    get: wrap('get'),
    post: wrap('post'),
    put: wrap('put'),
    patch: wrap('patch'),
    delete: wrap('delete'),
    raw: base,
  };
}

export const anonymous = () => client();