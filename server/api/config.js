// @flow
import config from 'config';
import type { $Response } from 'express';
import _ from 'lodash';

import { define } from '../utils/api/web-api';

import etcd from './etcd';

const { production, version, env } = config;

async function getProps(res: $Response, type: 'prop' | 'priv', service: string, prop: string) {
  const propName = prop.toUpperCase();
  const rootPath = `/${production}/${version}/${env}`;

  const propPath = `${rootPath}/${service}/${type}s/${propName}`;
  const r = await etcd.get(propPath);
  if (r && r.node && r.node.value) {
    res.json({ success: true, isNull: false, value: r.node.value });
    return;
  }

  const basePath = `${rootPath}/${type}s/${propName}`;
  const r2 = await etcd.get(basePath);
  if (r2 && r.node && r.node.value) {
    res.json({ success: true, isNull: false, value: r.node.value });
    return;
  }

  res.json({ success: true, isNull: true });
}

async function getOriginProps(basePropPath, results) {
  const baseProps = await etcd.get(basePropPath).catch(() => undefined);
  if (
    baseProps &&
    baseProps.body &&
    baseProps.body.node &&
    baseProps.body.node.nodes
  ) {
    _.forEach(baseProps.body.node.nodes, node => {
      results[node.key.replace(basePropPath, '')] = node.value;
    });
  }
}

async function getAllProps(res: $Response, service: string, includePriv: boolean) {
  const rootPath = `/${production}/${version}/${env}`;
  const results = {};

  await getOriginProps(`${rootPath}/props/`, results);

  if (includePriv) {
    await getOriginProps(`${rootPath}/privs/`, results);
  }

  await getOriginProps(`${rootPath}/services/${service}/props/`, results);

  if (includePriv) {
    await getOriginProps(`${rootPath}/services/${service}/privs/`, results);
  }

  res.json({ success: true, results });
}

// 获取服务的参数 （不包含保密属性）
//   该接口**可以**被前端调用
// Input:
//   params.service [string]: 服务id
// Output:
//   success [bool]: 操作成功标记
//   error [string]: 错误信息
//   result [object]: 服务相关参数
define(
  'GET /prop/:service',
  { auth: true, device: true },
  async (req, res) => {
    const {
      params: { service },
    } = (req: any);

    await getAllProps(res, service, false);
  }
);

// 获取服务的配置 （包含保密属性）
//   该接口**不可以**被前端调用
// Input:
//   params.service [string]: 服务id
// Output:
//   success [bool]: 操作成功标记
//   error [string]: 错误信息
//   result [object]: 服务相关参数
define(
  'GET /conf/:service',
  { device: true },
  async (req, res) => {
    const {
      params: { service },
    } = (req: any);

    await getAllProps(res, service, true);
  }
);

// 获取配置项的值
// Input
//   params.service [string]: 所属服务id
//   params.prop [string]: 参数名
// Output
//   success [bool]: 操作成功标记
//   error [string?]: 错误信息
//   isNull [bool?]: 配置项不存在或值为null
//   value [any]: 配置项的值
define(
  'GET /prop/:service/:prop',
  { auth: true, device: true },
  async (req, res) => {
    const {
      params: { prop, service },
    } = (req: any);

    await getProps(res, 'prop', service, prop);
  }
);

// 获取安全配置项的值
// Input
//   params.prop [string]: 参数名
// Output
//   success [bool]: 操作成功标记
//   error [string?]: 错误信息
//   null [bool?]: 配置项不存在或值为null
//   value [any]: 配置项的值
define(
  'GET /priv/:service/:prop',
  { device: true },
  async (req, res) => {
    const {
      params: { prop, service },
    } = (req: any);

    await getProps(res, 'priv', service, prop);
  }
);

// 获取服务列表
// Input
//   params.production [string]: 产品名
//   params.version [string]: 版本
//   params.env [string]: 部署环境
//   params.serviceName [string]: 服务名称
// Output
//   success [bool]: 操作成功标记
//   error [string?]: 错误信息
//   ends[].addr [string]: 服务提供者地址
//   ends[].port [int]: 服务提供者端口
define(
  'GET /service/:serviceName',
  { auth: true },
  async (req, res) => {
    const {
      params: { serviceName },
    } = (req: any);

    res.json({ success: true, production, version, env, serviceName });
  }
);

// 注册服务
// Input
//   params.production [string]: 产品名
//   params.version [string]: 版本
//   params.env [string]: 部署环境
//   params.serviceName [string]: 服务名称
//   body.addr [string]: 服务地址
//   body.port [int]: 服务端口
// Output
//   success [bool]: 操作成功标记
//   error [string?]: 错误信息
define(
  'POST /service/:serviceName',
  { auth: true },
  async (req, res) => {
    const {
      params: { serviceName },
    } = (req: any);

    res.json({ success: true, production, version, env, serviceName });
  }
);
