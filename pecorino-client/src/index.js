import { fetch } from 'whatwg-fetch';

let settings = null;
const waiters = [];

export async function start(pecorinoAddr) {
  console.log(`[pecorino] Start to get configuration from ${pecorinoAddr} ...`);
  return fetch(`${pecorinoAddr}/configurtion`, {
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
  });
}

export async function get(service, propName) {
  return new Promise((resolve) => {
    if (settings) {
      resolve(settings[service][propName]);
    } else {
      waiters.push(() => resolve(settings[service][propName]));
    }
  });
}
