// @flow
import _ from 'lodash';
import type { ParameterOperator, ParameterValue } from '../base/types';
import type { ApiArgs } from './types';

export default function parseParamSpec(spec: string): ParameterOperator<ApiArgs> {
  return {
    get: (args: ApiArgs) => (_.get(args[0], spec): ParameterValue | Array<ParameterValue>),
    set: (args: ApiArgs, value?: ParameterValue | Array<ParameterValue>) => {
      _.set(args[0], spec, value);
    }
  };
}
