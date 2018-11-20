// @flow
import type { Method } from './types';

export default function parseDescription(description: string): { method: Method, path: string } {
  const tempStr = description.concat().trim();
  const targetMethod = tempStr.split('/')[0].trim();
  const judgeMethod = targetMethod.indexOf(' ');
  const targetPath = tempStr.substring(tempStr.indexOf('/'));
  const judgePath = targetPath.indexOf(' ');
  if (judgeMethod > 0) {
    throw new Error('Path should starts with \'/\'');
  }
  if (judgePath > 0) {
    throw new Error('Path should be a valid url path.');
  }
  if (targetMethod === 'GET') {
    return {
      method: 'get',
      path: targetPath,
    };
  }
  if (targetMethod === 'POST') {
    return {
      method: 'post',
      path: targetPath,
    };
  }
  if (targetMethod === 'DELETE') {
    return {
      method: 'delete',
      path: targetPath,
    };
  }
  if (targetMethod === '') {
    return {
      method: 'all',
      path: targetPath,
    };
  }

  throw new Error('Method should be upper case.');
}
