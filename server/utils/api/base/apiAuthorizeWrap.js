// @flow
import _ from 'lodash';
import type {
  ApiContext,
  NormalizedApiOptions,
  CloneArgs,
  ParameterOperatorProvider,
  Role
} from './types';
import validAndFilter from './validAndFilter';

export class AuthError extends Error {
}

export default async function wrap<TArgs: $ReadOnlyArray<any>>(
  context: ApiContext,
  options: NormalizedApiOptions<TArgs>,
  args: TArgs,
  cloneArgs: CloneArgs<TArgs>,
  parameterOperatorProvider: ParameterOperatorProvider<TArgs>,
): Promise<any> {
  if (options.auth) {
    if (!context.user || !context.user.isAuthenticated) {
      throw new AuthError('Current user is not authenticated.');
    }

    if (options.role) {
      const { role } = options;
      if (!context.user.roles) {
        throw new AuthError(`Request role "${role}" is not existed on current user.`);
      }

      const roles = (context.user.roles: Array<Role>);
      const rs = _.filter(roles, { name: options.role });
      if (!rs || !rs.length) {
        throw new AuthError(`Request role "${role}" is not existed on current user.`);
      }

      const newArgs = await validAndFilter(
        args,
        rs,
        options.params,
        options.valid,
        cloneArgs,
        parameterOperatorProvider
      );
      if (newArgs) {
        return options.func(...newArgs);
      }

      throw new AuthError('You have no permission to the resource.');
    }
  }
  return options.func(...args);
}
