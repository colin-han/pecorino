// @flow
import Etcd from 'node-etcd-promise';
import config from 'config';
import _ from 'lodash';
import P2mLogger from 'p2m-common-logger';

import { notifyServiceChange, notifyAllChange } from './socketio';

const logger = new P2mLogger('etcd');

const { production, version, env, etcd: { cluster } } = config;
const bindNotifyAllChange = _.debounce(notifyAllChange, 5000);

function onBaseChange(e) {
  logger.info(`Found a changed in base's props: ${JSON.stringify(e)}`);
  bindNotifyAllChange();
}

const etcd = new Etcd(cluster);
logger.info(`Starting to connect to etcd cluster ${JSON.stringify(cluster)}.`);

const rootPath = `/${production}/${version}/${env}`;
const basePropWatcher = etcd.watcher(`${rootPath}/props`, null, { recursive: true });
basePropWatcher.on('change', onBaseChange);

const basePrivWatcher = etcd.watcher(`${rootPath}/privs`, null, { recursive: true });
basePrivWatcher.on('change', onBaseChange);

const watchers = {};
function watchAllService() {
  const path = `${rootPath}/services`;
  etcd.get(path).then(result => {
    if (result && result.body && result.body.node && result.body.node.nodes) {
      result.body.node.nodes.forEach(node => {
        const serviceName = node.key.replace(`${path}/`, '');
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

export default etcd;
