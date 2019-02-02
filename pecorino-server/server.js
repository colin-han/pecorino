// @flow
import path from 'path';
import http from 'http';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import PrettyError from 'pretty-error';
import config from 'config';
import fs from 'fs';
import cors from 'cors';

import api from './api';
import { setup as webApiSetup } from './utils/api/web-api';
import socketIoSetup from './api/socketio';

process.on('SIGTERM', () => {
  setTimeout(() => {
    process.exit();
  }, 1000);
});

const app = express();
const server = (http: any).Server(app);
//
// Tell any CSS tooling (such as Material UI) to use all vendor prefixes if the
// user agent is not known.
// -----------------------------------------------------------------------------
global.navigator = global.navigator || {};
global.navigator.userAgent = global.navigator.userAgent || 'all';
//
const logDirectory = path.join(__dirname, 'systemLog');
// eslint-disable-next-line no-unused-expressions
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
//
// Register Node.js middleware
// -----------------------------------------------------------------------------
app.use(morgan('combined'));
app.use('/healthcheck', require('express-healthcheck')());

if (config.cors && config.cors.allowOrigin) {
  const origins = config.cors.allowOrigin.split(/\s*;\s*/);
  app.use(cors({ origin: origins, credentials: true }));
}

app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
express.static.mime.define({ 'application/octet-stream': ['log'] });
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '150kb' }));

app.set('view engine', 'ejs');
app.use('/public', express.static(path.resolve(__dirname, 'public')));

api(app);
webApiSetup(app);
socketIoSetup(server);

app.get('/', (req, res) => {
  res.render('pages/home', {
    production: config.production,
    version: config.version,
    env: config.env,
  });
});


//
// Error handling
// -----------------------------------------------------------------------------
const pe = new PrettyError();
pe.skipNodeFiles();
pe.skipPackage('express');

server.listen(config.port, '0.0.0.0', () => {
  console.log(`The server is running at http://localhost:${config.port}/`);
});
