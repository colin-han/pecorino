// @flow
import type {
  $Application
} from 'express';
import expressJwt from 'express-jwt';
import P2mLogger from 'p2m-common-logger';

// Imports api module define here.
// import './-template';
import { getProps } from './config';

const logger = new P2mLogger('JWT');

export default function (app: $Application) {
  let slot = null;
  logger.log('Starting to get ENCRYPT_SALT from pecorino');
  const pms = getProps('priv', 'pecorino', 'ENCRYPT_SALT')
    .then(salt => {
      if (!salt) {
        return (req, res) => {
          logger.error('Get ENCRYPT_SALT failed, server cannot start.');
          res.error(500);
        };
      }
      logger.info(`Got ENCRYPT_SALT: ${salt}`);

      const jwt1 = expressJwt({
        secret: salt,
        credentialsRequired: false,
        getToken(req) {
          if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
            return req.headers.authorization.split(' ')[1];
          }
          if (req.query && req.query.id_token) {
            return req.query.id_token;
          }
          if (req.cookies && req.cookies.id_token) {
            return req.cookies.id_token;
          }
          return null;
        }
      });
      const jwt2 = expressJwt({
        secret: salt,
        credentialsRequired: false,
        requestProperty: 'device',
        getToken(req) {
          if (req.query && req.query.device_token) {
            return req.query.device_token;
          }
          if (req.cookies && req.cookies.device_token) {
            return req.cookies.device_token;
          }
          return null;
        }
      });

      return (req, res, next) => jwt1(req, res, () => jwt2(req, res, next));
    })
    .catch((err) => (req, res) => {
      logger.log(`Get ENCRYPT_SALT with error: ${err}`);
      res.error(500);
    })
    // eslint-disable-next-line no-return-assign
    .then(f => slot = f);

  app.use((req, res, next) => {
    if (slot) {
      slot(req, res, next);
    } else {
      // eslint-disable-next-line promise/catch-or-return
      pms.then(f => f(req, res, next));
    }
  });
}
