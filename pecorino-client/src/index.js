// eslint-disable-next-line prefer-destructuring
let fetch = global.fetch;
if (typeof fetch !== 'function') {
  if (
    typeof process === 'object' &&
    typeof process.versions === 'object' &&
    typeof process.versions.node !== 'undefined'
  ) {
    try {
      // eslint-disable-next-line global-require
      fetch = require('node-fetch');
    } catch (err) {
      throw new Error('Package "node-fetch@^2.3.0" is required, please ensure it is included by package.json');
    }
  } else {
    try {
      // eslint-disable-next-line global-require
      fetch = require('whatwg-fetch');
    } catch (err) {
      throw new Error('Package "whatwg-fetch@^3.0.0" is required, please ensure it is included by package.json');
    }
  }
}

let settings = null;
const waiters = [];

export async function start(pecorinoAddr) {
  console.log(`[pecorino] Start to get configuration from ${pecorinoAddr} ...`);
  return fetch(`${pecorinoAddr}/configuration`, {
    method: 'GET',
  }).then(res => {
    if (!res.ok) {
      console.error(`[pecorino] Get configuration from ${pecorinoAddr} failed with failed response ${res.status}: ${res.statusText}`);
    } else {
      return res.json();
    }
  }).then(result => {
    if (result) {
      if (!result.success) {
        console.error(`[pecorino] Get configuration from ${pecorinoAddr} with an error message: ${result.error}.`);
      } else {
        console.log('[pecorino] Got the configuration -----------------');
        console.log(`[pecorino] ${JSON.stringify(result.services, null, '  ').replace(/[\r\n]+/g, '\n[pecorino] ')}`);
        settings = result.services;
        if (waiters.length) {
          const currentWaiters = [...waiters];
          waiters.splice(0, waiters.length);

          currentWaiters.forEach(w => w());
        }
      }
    }
  }).catch(err => {
    console.error(`[pecorino] Get configuration from ${pecorinoAddr} failed with error: ${err.stack}`);
    throw err;
  });
}

export async function get(service, propName) {
  return new Promise((resolve) => {
    if (settings) {
      resolve(settings[service][propName]);
    } else {
      console.log('[pecorino] Get configuration before it is ready, add callback to watcher list.');
      waiters.push(() => resolve(settings[service][propName]));
    }
  });
}
