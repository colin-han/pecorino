// @flow
import type { $Application, $Request, $Response, NextFunction } from 'express';

import type { ApiCallback, ApiOptions } from '../base/types';
import { apiAuthorizeWrap, checkArgs, AuthError } from '../base';
import parseDescription from './parseDescription';
import parameterOperatorProvider from './parameterOperatorProvider';
import argsCloner from './cloneArgs';
import type { ApiCallbackArguments } from './types';

const apis = [];

export function define(
  desc: string,
  options: ApiOptions | ApiCallback<ApiCallbackArguments>,
  func?: ApiCallback<ApiCallbackArguments>
) {
  const { method, path } = parseDescription(desc);

  const o = checkArgs(options, func);

  function wrap(req: $Request, res: $Response, next: NextFunction) {
    return apiAuthorizeWrap(req, o, [req, res, next], argsCloner, parameterOperatorProvider)
      .catch((err) => {
        if (err instanceof AuthError) {
          res.status(401).send(err.message);
        } else {
          res.status(500).send(err.message);
        }
      });
  }

  function apiSetup(app: $Application) {
    switch (method) {
      case 'get':
        app.get(path, wrap);
        break;
      case 'post':
        app.post(path, wrap);
        break;
      case 'all':
        app.use(path, wrap);
        break;
      case 'delete':
        app.delete(path, wrap);
        break;
      default:
        throw new Error('Not support method.');
    }
  }

  apis.push(apiSetup);
}

export function setup(app: $Application) {
  apis.forEach(api => {
    api(app);
  });
}
