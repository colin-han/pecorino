// @flow
import Etcd from 'node-etcd-promise';
import config from 'config';
import _ from 'lodash';
import P2mLogger from 'p2m-common-logger';
import fs from 'fs-extra';
import path from 'path';

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

async function initForOneService(filename, servicePath, defaults) {
  await etcd.mkdir(`${servicePath}/props`, { prevExist: false })
    .catch(ignoreErrorIfExist);
  await etcd.mkdir(`${servicePath}/privs`, { prevExist: false })
    .catch(ignoreErrorIfExist);

  const content = await fs.readFile(filename, 'utf8');
  const lines = content.split(/\s*[\r\n]+\s*/);

  await _.reduce(lines, async (pms, line, ln) => {
    await pms;

    if (!line || line[0] === '#') {
      return;
    }

    const s = /^(_?)([A-Za-z0-9_\-.]+)=(.*)$/.exec(line);
    if (!s) {
      const errorInfo = `Format error, file: "${filename}", Ln: ${ln}.`;
      logger.error(errorInfo);
      throw new Error(`Init env failed with error: ${errorInfo}`);
    }

    const [, priv, key, value] = s;

    const currentEnv = priv ? defaults.privs : defaults.props;
    const formattedValue = _.template(value)({ env: currentEnv });

    const keyPath = `${servicePath}/${priv ? 'privs' : 'props'}/${key}`;
    await etcd.set(keyPath, formattedValue, { prevExist: false })
      .then(() => logger.log(`Write init variable to "${keyPath}", value is "${formattedValue}"`))
      .catch(ignoreErrorIfExist);
  }, Promise.resolve());
}

async function getDefaultSetting() {
  let props = {};
  let privs = {};
  const r1 = await etcd.get('/props');
  if (!r1 || !r1.body || !r1.body.node || !r1.body.node.nodes) {
    logger.warn('Cannot find "/props" folder.');
  } else {
    props = _.mapValues(
      _.keyBy(r1.body.node.nodes, n => n.key.replace('/props/', '')),
      n => n.value
    );
  }
  const r2 = await etcd.get('/privs');
  if (!r2 || !r2.body || !r2.body.node || !r2.body.node.nodes) {
    logger.warn('Cannot find "/privs" folder.');
  } else {
    privs = _.mapValues(
      _.keyBy(r2.body.node.nodes, n => n.key.replace('/privs/', '')),
      n => n.value
    );
  }
  return {
    props,
    privs: _.assign({}, props, privs)
  };
}

function getRootFolder(service) {
  switch (service) {
    case '_':
      return '';
    case 'base':
      return rootPath;
    default:
      return `${rootPath}/services/${service}`;
  }
}

async function init() {
  logger.log('Starting to initialize properties for production.');
  const initFolder = path.resolve(__dirname, '../init');
  const stat = await fs.lstat(initFolder);
  if (await stat.isDirectory()) {
    const files = await fs.readdir(initFolder);
    if (files) {
      const systemInit = _.find(files, f => /^(.*\/)?_\.env/.test(f));
      if (systemInit) {
        await initForOneService(path.resolve(initFolder, systemInit), getRootFolder('_'), {});
      }

      const defaults = await getDefaultSetting();
      await _.reduce(files, async (p, file) => {
        await p;
        const match = /^(.*\/)?([a-z][a-z\-_.]+)\.env$/.exec(file);
        if (!match) {
          logger.warn(`Unknown script "${file}" found in init folder.`);
          return;
        }
        logger.log(`Found an init script file "${file}" in init folder.`);
        const service = match[2];
        const initFile = path.resolve(initFolder, file);
        const servicePath = getRootFolder(service);
        await initForOneService(initFile, servicePath, defaults);
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
