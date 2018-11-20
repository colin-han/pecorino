// @flow
import parseDescription from './parseDescription';

test('parseDescription', () => {
  expect(parseDescription('GET /')).toEqual({ method: 'get', path: '/' });
  expect(parseDescription('POST /')).toEqual({ method: 'post', path: '/' });
  expect(parseDescription('/')).toEqual({ method: 'all', path: '/' });
  expect(parseDescription('GET /api-v2/login')).toEqual({ method: 'get', path: '/api-v2/login' });
  expect(parseDescription('GET /api-v2/login%20aaa')).toEqual(
    { method: 'get', path: '/api-v2/login%20aaa' }
  );
  expect(() => parseDescription('GET api/test')).toThrow(); // Path should starts with '/'
  expect(() => parseDescription('get /')).toThrow(); // Method should be upper case.
  expect(() => parseDescription('GET /test aa')).toThrow(); // Path should be a valid url path.
});
