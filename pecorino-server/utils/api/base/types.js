// @flow
export type Map = {[string]: string};
export type ApiOptions = {
  auth?: boolean,
  role?: string,
  params?: Map,
  valid?: boolean,
}
export type ApiContext = { +user?: any };
export type ApiCallback<T: $ReadOnlyArray<any>> = (...T) => ?Promise<any>;

export type ParameterValue = string | number | {};
export type ParameterValueSet = { [string]: ParameterValue };
export type ParameterPolicyResult = ParameterValue | false;
export type ParameterPolicy = (
  user: ParameterValue,
  request?: ParameterValue
) => ParameterPolicyResult;

export type Role = {
  +name: string,
  +parameters?: ParameterValueSet,
}

export type NormalizedApiOptions<T> = {
  +func: ApiCallback<T>,
  +params: Map,
  +role?: string,
  +valid: boolean,
  +auth: boolean
};
export type ParameterOperator<TArgs> = {
  get: (TArgs) => ?(ParameterValue | Array<ParameterValue>),
  set: (TArgs, value?: ParameterValue | Array<ParameterValue>) => void,
};
export type ParameterOperatorProvider<TArgs> = (string)=>ParameterOperator<TArgs>;
export type CloneArgs<TArgs> = (TArgs) => TArgs;
