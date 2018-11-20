// @flow
import type { $Request, $Response, NextFunction } from 'express';
import type { ApiContext } from '../base/types';

export type ApiArgs = [$Request, $Response, NextFunction];

export type Method = 'get' | 'post' | 'delete' | 'all';
export type ApiCallbackArguments = [$Request & ApiContext, $Response, NextFunction];
