import * as pecorinoLog from './log';

// eslint-disable-next-line prefer-destructuring
let fetch = global.fetch;
if (typeof fetch !== 'function') {
  // eslint-disable-next-line no-undef,global-require
  fetch = require('whatwg-fetch');
}

let settings = null;
const waiters = [];
export async function start(master) {
  pecorinoLog.info(`Start to get configuration from ${master} ...`);
  return fetch(`${master}/configuration`, {
    method: 'GET',
  }).then(res => {
    if (!res.ok) {
      pecorinoLog.error(`Get configuration from ${master} failed with failed response ${res.status}: ${res.statusText}`);
    } else {
      return res.json();
    }
  }).then(result => {
    if (result) {
      if (!result.success) {
        pecorinoLog.error(`Get configuration from ${master} with an error message: ${result.error}.`);
      } else {
        pecorinoLog.info('Got the configuration -----------------');
        pecorinoLog.info(JSON.stringify(result.services, null, '  '));
        settings = result.services;
        if (waiters.length) {
          const currentWaiters = [...waiters];
          waiters.splice(0, waiters.length);

          currentWaiters.forEach(w => w());
        }
      }
    }
  }).catch(err => {
    pecorinoLog.error(`Get configuration from ${master} failed with error: ${err.stack}`);
    throw err;
  });
}

export async function get(service, propName) {
  return new Promise((resolve) => {
    if (settings) {
      resolve(settings[service][propName]);
    } else {
      pecorinoLog.info('Get configuration before it is ready, add callback to watcher list.');
      waiters.push(() => resolve(settings[service][propName]));
    }
  });
}
