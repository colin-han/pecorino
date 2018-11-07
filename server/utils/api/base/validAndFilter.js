// @flow
import _ from 'lodash';
import type {
  CloneArgs,
  ParameterValueSet,
  Role,
  Map,
  ParameterOperatorProvider
} from './types';
import { roles as roleDefinitions, parameters as parameterDefinitions } from '../roles';

export default async function validAndFilter<TArgs>(
  args: TArgs,
  userRoles: Array<Role>,
  parameterMap: Map,
  valid: boolean,
  cloneArgs: CloneArgs<TArgs>,
  parseParameterSpec: ParameterOperatorProvider<TArgs>,
): Promise<TArgs | false> {
  const parameterOperators = _.mapValues(parameterMap, parseParameterSpec);
  const roleDefinition = roleDefinitions[userRoles[0].name];
  if (!roleDefinition.parameters || !roleDefinition.parameters.length) {
    return args;
  }

  const results = await Promise.all(userRoles.map(async (userRole) => {
    const result = {};

    if (!userRole.parameters) {
      if (roleDefinition.parameters.length !== 0) {
        return false;
      }

      return result;
    }

    for (let i = 0; i < roleDefinition.parameters.length; i++) {
      const parameterName = roleDefinition.parameters[i];
      const parameterDefinition = parameterDefinitions[parameterName];
      const userParameter = userRole.parameters[parameterName] ||
        parameterDefinition.defaultValue;
      const parameterOperator = parameterOperators[parameterName];

      const reqParam = parameterOperator.get(args);
      let policy = parameterDefinition.mergePolicy;
      if (valid) {
        policy = parameterDefinition.validPolicy;
      }

      // eslint-disable-next-line no-await-in-loop
      const newParam = await policy(userParameter, reqParam);
      if (!newParam) {
        return false;
      }

      result[parameterName] = newParam;
    }

    return result;
  }));

  if (valid) {
    if (_.find(results, (result) => result === false) === false) {
      return false;
    }

    return args;
  }

  const valuableResult = ((_.filter(results):any):Array<ParameterValueSet>);
  if (!valuableResult || !valuableResult.length) {
    return false;
  }

  const newArgs = cloneArgs(args);

  roleDefinition.parameters.forEach(paramName => {
    parameterOperators[paramName].set(newArgs, valuableResult.map(result => result[paramName]));
  });

  return newArgs;
}
