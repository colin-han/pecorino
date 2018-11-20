// @flow
import type { ApiArgs } from './types';

export default function cloneArgs(args: ApiArgs): ApiArgs {
  return [
    {
      ...args[0],
      body: { ...args[0].body },
      params: { ...args[0].params },
      query: { ...args[0].query },
    },
    args[1],
    args[2]
  ];
}
