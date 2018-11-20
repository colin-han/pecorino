// @flow

import parseParamSpec from './parameterOperatorProvider';

test('parameterOperator can access parameters from body', () => {
  const param = parseParamSpec('body.orgId');

  const req = {
    body: {
      orgId: 1,
    },
    params: {
      orgId: 2,
    },
    query: {
      orgId: 3,
    },
  };

  expect(param.get([req, {}, () => {}])).toBe(1);
  param.set([req, {}, () => {}], 10);
  expect(req.body.orgId).toBe(10);
  expect(req.params.orgId).toBe(2);
  expect(req.query.orgId).toBe(3);
});

test('parameterOperator can access parameters from params', () => {
  const param = parseParamSpec('params.orgId');
  const req = {
    body: {
      orgId: 1,
    },
    params: {
      orgId: 2,
    },
    query: {
      orgId: 3,
    },
  };

  expect(param.get([req, {}, () => {}])).toBe(2);
  param.set([req, {}, () => {}], 10);
  expect(req.params.orgId).toBe(10);
  expect(req.body.orgId).toBe(1);
  expect(req.query.orgId).toBe(3);
});

test('parameterOperator can access parameters from query', () => {
  const param = parseParamSpec('query.orgId');
  const req = {
    body: {
      orgId: 1,
    },
    params: {
      orgId: 2,
    },
    query: {
      orgId: 3,
    },
  };

  expect(param.get([req, {}, () => {}])).toBe(3);
  param.set([req, {}, () => {}], 10);
  expect(req.query.orgId).toBe(10);
  expect(req.body.orgId).toBe(1);
  expect(req.params.orgId).toBe(2);
});

test('parameterOperator return undefined if property not exist', () => {
  const param = parseParamSpec('query.orgId');
  const req = {
    body: {
      orgId: 1,
    },
    params: {
      orgId: 2,
    },
    query: {
    },
  };

  expect(param.get([req, {}, () => {}])).toBeUndefined();
});
