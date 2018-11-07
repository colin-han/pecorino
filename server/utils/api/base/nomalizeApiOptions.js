// @flow
import type {
  ApiCallback,
  ApiOptions,
  NormalizedApiOptions
} from './types';

export default function normalizeApiArgs<T: $ReadOnlyArray<any>>(
  options: ApiOptions | ApiCallback<T>,
  func?: ApiCallback<T>,
): NormalizedApiOptions<T> {
  if (typeof options === 'function') {
    return {
      func: options,
      params: {},
      valid: false,
      auth: false
    };
  }
  if (typeof func === 'function') {
    return {
      func,
      role: options.role,
      params: options.params || {},
      valid: !!options.valid,
      auth: typeof options.auth !== 'boolean' ? !!options.role : options.auth
    };
  }
  throw new Error('Parameter "func" is required.');
}
