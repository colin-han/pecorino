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

function info(message) {
  console.log(`[pecorino] ${message.replace(/[\r\n]+/g, '\n[pecorino] ')}`);
}

function error(message) {
  console.error(`[pecorino] ${message.replace(/[\r\n]+/g, '\n[pecorino] ')}`);
}

export async function start(pecorinoAddr) {
  info(`Start to get configuration from ${pecorinoAddr} ...`);
  return fetch(`${pecorinoAddr}/configuration`, {
    method: 'GET',
  }).then(res => {
    if (!res.ok) {
      error(`Get configuration from ${pecorinoAddr} failed with failed response ${res.status}: ${res.statusText}`);
    } else {
      return res.json();
    }
  }).then(result => {
    if (result) {
      if (!result.success) {
        error(`Get configuration from ${pecorinoAddr} with an error message: ${result.error}.`);
      } else {
        info('Got the configuration -----------------');
        info(JSON.stringify(result.services, null, '  '));
        settings = result.services;
        if (waiters.length) {
          const currentWaiters = [...waiters];
          waiters.splice(0, waiters.length);

          currentWaiters.forEach(w => w());
        }
      }
    }
  }).catch(err => {
    error(`Get configuration from ${pecorinoAddr} failed with error: ${err.stack}`);
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

export async function initEnv(pecorinoAddr, service) {
  const res = await fetch(`${pecorinoAddr}/conf/${service}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Assess failed with ${res.status}: ${res.statusText}`);
  }
  const conf = await res.json();
  info(`Got the configurations from comfit. then starting the service "${service}"...`);
  info('Config is: -------------------------------------');
  info(JSON.stringify(conf.results, null, ' '));
  info('------------------------------------------------');

  process.env = { ...conf.results, ...process.env };
}

export async function register(pecorinoAddr, service, end) {
  const res = await fetch(`${pecorinoAddr}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      service,
      end,
    })
  });

  if (!res.ok) {
    throw new Error(`Register failed with ${res.status}: ${res.statusText}`);
  }
  const r = await res.json();
  if (r.success) {
    info('Register success.');
  } else {
    error(`Register service failed with error: ${r.error}`);
  }
}
