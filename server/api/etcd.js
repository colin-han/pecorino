// @flow
import Etcd from 'node-etcd-promise';
import config from 'config';
import _ from 'lodash';
import P2mLogger from 'p2m-common-logger';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';

import { notifyServiceChange, notifyAllChange } from './socketio';

const logger = new P2mLogger('etcd');

const { production, version, env, etcd: { cluster } } = config;
const rootPath = `/${production}/${version}/${env}`;

const cl = cluster.split(/\s*,\s*/);
logger.info(`Starting to connect to ETCD cluster ${JSON.stringify(cl)}.`);
const etcd = new Etcd(cl);

function ignoreErrorIfExist(e) {
  if (!e) { return; }
  if (e.errorCode === 105 /* Key is already existed */) {
    logger.log(`ETCD key "${e.error.cause}" already existed`);
    return;
  }
  throw e;
}

async function initFolders() {
  logger.log('Starting to initialize folders for production.');
  await etcd.mkdir(`${rootPath}/services`, { prevExist: false })
    .catch(ignoreErrorIfExist);
  await etcd.mkdir(`${rootPath}/props`, { prevExist: false })
    .catch(ignoreErrorIfExist);
  await etcd.mkdir(`${rootPath}/privs`, { prevExist: false })
    .catch(ignoreErrorIfExist);

  // Init default setting folder if not existed.
  await etcd.mkdir('/props', { prevExist: false })
    .catch(ignoreErrorIfExist);
  await etcd.mkdir('/privs', { prevExist: false })
    .catch(ignoreErrorIfExist);
}

async function initForOneService(initFile, servicePath) {
  const content = await fs.readFile(initFile);
  const vars = _.template(content)(process.env);
  const props = dotenv.parse(vars);

  await etcd.mkdir(`${servicePath}/props`, { prevExist: false })
    .catch(ignoreErrorIfExist);
  await etcd.mkdir(`${servicePath}/privs`, { prevExist: false })
    .catch(ignoreErrorIfExist);

  await _.reduce(props, async (p2, value, name) => {
    await p2;
    if (name[0] === '_') {
      // private settings
      const privPath = `${servicePath}/privs/${name.substring(1)}`;
      await etcd.set(privPath, value, { prevExist: false })
        .then(() => logger.log(`Write init variable to "${privPath}", value is "${value}"`))
        .catch(ignoreErrorIfExist);
    } else {
      const propPath = `${servicePath}/props/${name}`;
      await etcd.set(propPath, value, { prevExist: false })
        .then(() => logger.log(`Write init variable to "${propPath}", value is "${value}"`))
        .catch(ignoreErrorIfExist);
    }
  }, Promise.resolve());
}

async function init() {
  logger.log('Starting to initialize properties for production.');
  const initFolder = path.resolve(__dirname, '../init');
  const stat = await fs.lstat(initFolder);
  if (await stat.isDirectory()) {
    const files = await fs.readdir(initFolder);
    if (files) {
      await _.reduce(files, async (p, file) => {
        await p;
        const match = /^(.*\/)?([a-z\-_.]+).env$/.exec(file);
        if (!match) {
          logger.warn(`Unknown script "${file}" found in init folder.`);
          return;
        }
        logger.log(`Found an init script file "${file}" in init folder.`);
        const service = match[2];
        const initFile = path.resolve(initFolder, file);
        const servicePath = service === 'base' ?
          rootPath :
          `${rootPath}/services/${service}`;
        await initForOneService(initFile, servicePath);
      }, Promise.resolve());
    }
  } else {
    logger.log('Cannot find "init" folder, skip init default props.');
  }
}

function watch() {
  const bindNotifyAllChange = _.debounce(notifyAllChange, 5000);

  function onBaseChange(e) {
    logger.info(`Found a changed in base's props: ${JSON.stringify(e)}`);
    bindNotifyAllChange();
  }

  const basePropWatcher = etcd.watcher(`${rootPath}/props`, null, { recursive: true });
  basePropWatcher.on('change', onBaseChange);

  const basePrivWatcher = etcd.watcher(`${rootPath}/privs`, null, { recursive: true });
  basePrivWatcher.on('change', onBaseChange);

  const watchers = {};

  function watchAllService() {
    const servicesPath = `${rootPath}/services`;
    etcd.get(servicesPath).then(result => {
      if (result && result.body && result.body.node && result.body.node.nodes) {
        result.body.node.nodes.forEach(node => {
          const serviceName = node.key.replace(`${servicesPath}/`, '');
          const bindNotifyServiceChange = _.debounce(
            notifyServiceChange.bind(null, serviceName),
            5000
          );

          function onServiceChange(e) {
            logger.info(`Found a changed in ${serviceName}'s props: ${JSON.stringify(e)}`);
            bindNotifyServiceChange();
          }

          if (!watchers[node.key]) {
            watchers[node.key] = bindNotifyServiceChange;

            const propWatcher = etcd.watcher(`${node.key}/props`, null, { recursive: true });
            propWatcher.on('change', onServiceChange);

            const privWatcher = etcd.watcher(`${node.key}/privs`, null, { recursive: true });
            privWatcher.on('change', onServiceChange);

            logger.info(`Watched ${serviceName}'s changed on "${node.key}"`);
          }
        });
      }
    }).catch(err => {
      logger.error(`Get services from ETCD failed with error: ${err.stack}`);
    });
  }

  watchAllService();

  const serviceWatcher = etcd.watcher(`${rootPath}/services`);
  serviceWatcher.on('change', _.debounce(watchAllService, 5000));
}

(async function start() {
  await initFolders()
    .catch(e => logger.error(`InitFolder failed with error: ${e.stack}`));
  await init()
    .catch(e => logger.error(`Init failed with error: ${e.stack}`));
  watch();
}());
export default etcd;
