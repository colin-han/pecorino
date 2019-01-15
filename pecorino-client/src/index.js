import fetch from 'node-fetch';
import loadConfig from './config';
import * as log from './log';

export async function initEnv(configOrFilePath) {
  let settings;
  if (typeof configOrFilePath === 'object') {
    settings = configOrFilePath;
  } else {
    settings = await loadConfig(configOrFilePath || 'pecorino.yaml', {});
  }

  const res = await fetch(`${settings.master}/conf/${settings.service}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Assess failed with ${res.status}: ${res.statusText}`);
  }
  const conf = await res.json();
  log.info(`Got the configurations from comfit. then starting the service "${settings.service}"...`);
  log.info('Config is: -------------------------------------');
  log.info(JSON.stringify(conf.results, null, ' '));
  log.info('------------------------------------------------');

  process.env = { ...conf.results, ...process.env };
}

export async function register(configOrFilePath) {
  let settings;
  if (typeof configOrFilePath === 'object') {
    settings = configOrFilePath;
  } else {
    settings = await loadConfig(configOrFilePath || 'pecorino.yaml', {});
  }

  const res = await fetch(`${settings.master}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      service: settings.service,
      end: `${settings.ip}:${settings.port}`,
    })
  });

  if (!res.ok) {
    throw new Error(`Register failed with ${res.status}: ${res.statusText}`);
  }
  const r = await res.json();
  if (r.success) {
    log.info('Register success.');
  } else {
    log.error(`Register service failed with error: ${r.error}`);
  }
}

export { loadConfig, log as pecorinoLog };
