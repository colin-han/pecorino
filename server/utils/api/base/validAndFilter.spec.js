// @flow
import type { ApiArgs } from '../web-api/types';
import validAndFilter from './validAndFilter';
import cloneArgs from '../web-api/cloneArgs';
import parameterOperatorProvider from '../web-api/parameterOperatorProvider';

jest.mock('../policies/equalityValidPolicy', () => jest.fn((org1, org2) => {
  let r = org2;
  while (r > 0) {
    if (r === org1) {
      return true;
    }

    r = Math.floor(r / 10);
  }

  return false;
}));

test('validAndFilter with no option', () => {
  const req = {};
  const res = {};
  const args: ApiArgs = [req, res, () => {}];
  const role = { name: 'user', parameters: {} };
  expect(validAndFilter(args, [role], {}, false, cloneArgs, parameterOperatorProvider))
    .not.toBe(false);
});
test.skip('validAndFilter - request org is same with user role', async () => {
  const req = {
    user: {
      roles: [
        { name: 'admin', parameters: { organization: 1 } },
      ]
    },
    body: {
      orgId: 1
    }
  };
  const res = {};
  const args: ApiArgs = [req, res, () => {}];
  const role = { name: 'admin', parameters: { organization: 1 } };
  const r = await validAndFilter(
    args,
    [role],
    { organization: 'body.orgId' },
    false,
    cloneArgs,
    parameterOperatorProvider
  );
  expect(r && r[0])
    .toMatchObject({
      body: {
        orgId: [1]
      }
    });
});
test.skip('validAndFilter - request 1 but user only have 10', async () => {
  const req = {
    user: {
      roles: [
        { name: 'admin', parameters: { organization: 10 } },
      ]
    },
    body: {
      orgId: 1
    }
  };
  const res = {};
  const args: ApiArgs = [req, res, () => {}];
  const role = { name: 'admin', parameters: { organization: 10 } };
  const r = await validAndFilter(
    args,
    [role],
    { organization: 'body.orgId' },
    false,
    cloneArgs,
    parameterOperatorProvider
  );
  expect(r && r[0])
    .toMatchObject({
      body: {
        orgId: [10]
      }
    });
});
test.skip('validAndFilter - request 10 and user have 1', async () => {
  const req = {
    user: {
      roles: [
        { name: 'admin', parameters: { organization: 1 } },
      ]
    },
    body: {
      orgId: 10
    }
  };
  const res = {};
  const args: ApiArgs = [req, res, () => {}];
  const role = { name: 'admin', parameters: { organization: 1 } };
  const r = await validAndFilter(
    args,
    [role],
    { organization: 'body.orgId' },
    false,
    cloneArgs,
    parameterOperatorProvider
  );
  expect(r && r[0])
    .toMatchObject({
      body: {
        orgId: [10]
      }
    });
});
test('validAndFilter - request 2 but user only have 1', async () => {
  const req = {
    user: {
      roles: [
        { name: 'admin', parameters: { organization: 1 } },
      ]
    },
    body: {
      orgId: 2 // orgId
    }
  };
  const res = {};
  const args: ApiArgs = [req, res, () => {}];
  const role = { name: 'admin', parameters: { organization: 1 } };
  const r = await validAndFilter(
    args,
    [role],
    { organization: 'body.orgId' },
    false,
    cloneArgs,
    parameterOperatorProvider
  );
  expect(r && r[0])
    .toBe(false);
});
test.skip('validAndFilter - request 1 but user only have 11 and 12', async () => {
  const req = {
    user: {
      roles: [
        { name: 'admin', parameters: { organization: 11 } },
        { name: 'admin', parameters: { organization: 12 } },
      ]
    },
    body: {
      orgId: 1 // orgId
    }
  };
  const res = {};
  const args: ApiArgs = [req, res, () => {}];
  const role1 = { name: 'admin', parameters: { organization: 11 } };
  const role2 = { name: 'admin', parameters: { organization: 12 } };
  const r = await validAndFilter(
    args,
    [role1, role2],
    { organization: 'body.orgId' },
    false,
    cloneArgs,
    parameterOperatorProvider
  );
  expect(r && r[0])
    .toMatchObject({
      body: {
        orgId: [11, 12]
      }
    });
});
test('validAndFilter - role with no parameters', async () => {
  const req = {
    user: {
      roles: [
        { name: 'user' },
      ]
    },
    body: {
      orgId: 1 // orgId
    }
  };
  const res = {};
  const args: ApiArgs = [req, res, () => {}];
  const role1 = { name: 'user' };
  const r = await validAndFilter(
    args,
    [role1],
    {},
    false,
    cloneArgs,
    parameterOperatorProvider
  );
  expect(r && r[0])
    .toMatchObject({
      body: {
        orgId: 1
      }
    });
});
test('validAndFilter - role with no parameters 2', async () => {
  const req = {
    user: {
      roles: [
        { name: 'user' },
      ]
    },
    body: {
      orgId: 1 // orgId
    }
  };
  const res = {};
  const args: ApiArgs = [req, res, () => {}];
  const role1 = { name: 'user' };
  const role2 = { name: 'admin', parameters: { organization: 1 } };
  const r = await validAndFilter(
    args,
    [role1, role2],
    {},
    false,
    cloneArgs,
    parameterOperatorProvider
  );
  expect(r && r[0])
    .toMatchObject({
      body: {
        orgId: 1
      }
    });
});
