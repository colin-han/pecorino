// @flow
import type {
  $Application
} from 'express';
import expressJwt from 'express-jwt';
import config from 'config';

// Imports api module define here.
// import './-template';
import './config';

const modules = [
  // register native modules here
];

export default function (app: $Application) {
  app.use(expressJwt({
    secret: config.security.key,
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
  }));

  modules.forEach((module: *) => {
    if (typeof module === 'function') {
      module(app);
    } else {
      const path = module.path || '/';
      app.use(path, module.router);
    }
  });
}
