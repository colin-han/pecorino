#!/usr/bin/env node
const chalk = require('chalk');
const childProcess = require('child_process');
const _ = require('lodash');
const { promises: fs } = require('fs');
const path = require('path');
const dns = require('dns');

function info(message) {
  console.log(chalk.cyan(message));
}
function error(message) {
  console.error(chalk.red(message));
}

function startNginx(nginxCmd, filePath, pidFile, resolve, reject) {
  childProcess.exec(`"${nginxCmd}" -c "${filePath}"`, async (err2, stdout2, stderr2) => {
    if (err2) {
      error(`Reload nginx config with error: ${err2}`);
      console.error('STDOUT: ----------------------------------------------');
      console.error(stdout2);
      console.error('STDERR: ----------------------------------------------');
      console.error(stderr2);
      reject(new Error(`Reload nginx config with error: ${err2}`));
      return;
    }

    console.log('STDOUT: ----------------------------------------------');
    console.log(stdout2);
    console.log('STDERR: ----------------------------------------------');
    console.log(stderr2);
    info('Reload success.');

    try {
      const pid = await fs.readFile(pidFile);
      childProcess.exec(`tail --pid=${pid} -f /dev/null`, (err3, stdout3, stderr3) => {
        if (err3) {
          error(`Waiting for pid failed with error: ${err3}`);
          console.error('STDOUT: ----------------------------------------------');
          console.error(stdout3);
          console.error('STDERR: ----------------------------------------------');
          console.error(stderr3);
          reject(new Error(`Reload nginx config with error: ${err2}`));
        }
        info('Nginx process exited.');
        resolve();
      });
    } catch (err) {
      console.log(`Waiting for pid failed with error: ${err.stack}`);
    }
  });
}

function validAndStartNginx(nginxCmd, filePath, pidFile) {
  info('Starting to validate nginx.conf');
  return new Promise((resolve, reject) => {
    childProcess.exec(`"${nginxCmd}" -t -c ${filePath}`, (err, stdout, stderr) => {
      if (err) {
        error('Validate nginx.conf failed with errors: --------------');
        console.error(err);
        console.error('STDOUT: ----------------------------------------------');
        console.error(stdout);
        console.error('STDERR: ----------------------------------------------');
        console.error(stderr);
        reject(new Error('Validate nginx.conf failed with errors'));
        return;
      }

      info('Validate success, reload nginx ...');
      startNginx(nginxCmd, filePath, pidFile, resolve, reject);
    });
  });
}

async function getDockerHost() {
  return new Promise((resolve, reject) => {
    // Check if the docker run on mac system, if so, use 'host.docker.internal'.
    dns.lookup('host.docker.internal', (err) => {
      if (!err) {
        resolve('host.docker.internal');
      } else {
        childProcess.exec('route | awk \'/default/ { print $2 }\'', (err2, stdout, stderr) => {
          if (err) {
            reject(new Error(`Get DOCKER_HOST failed with error: ${err2}. \n stderr: \n${stderr}\n stdout: \n${stdout}`));
          } else {
            resolve(stdout);
          }
        });
      }
    });
  });
}

async function start(nginxTemplateFile) {
  const { env } = process;
  const nginxCmd = env.NGINX || 'nginx';
  const filePath = path.resolve('nginx.conf');

  if (await fs.stat(filePath).then(() => true).catch(() => false)) {
    await fs.unlink(filePath)
      .catch((err) => {
        error(`Failed to delete old config file '${filePath}'. Error: ${err.stack}`);
        process.exit(2);
      });
  }

  info('ENV:');
  info(JSON.stringify(env, null, '  '));
  const ends = await Promise.all(_.map(
    _.filter(
      _.toPairs(env),
      ([name]) => name.indexOf('PECORINO_ENDS_') === 0
    ),
    async ([name, value]) => ([
      name.substring(14),
      await Promise.all(value.split(',').map(async end => {
        const parts = end.split(':');
        return {
          ip: parts[0] === '$DOCKER_HOST' ? await getDockerHost() : parts[0],
          port: parts[1],
          role: parts[2] || 'api'
        };
      }))
    ])
  ));

  info('End-points is found as following: -----------------');
  info(JSON.stringify(ends, null, '  '));
  info('---------------------------------------------------');
  const upstreams = _.map(ends, end => (
    `
upstream ${end[0]} {
${_.map(end[1], p => `  server ${p.ip}:${p.port};`).join('\n')}
}`
  )).join('\n');

  const rewrites = _.map(ends, end => (
    `
location ${end[0] === 'web' ? '/' : `/api/${end[0]}/`} {
  ${end[0] !== 'web' ? `rewrite /api/${end[0]}/(.*) /$1 break;` : ''}
  proxy_pass http://${end[0]};
}`
  )).join('\n');

  const template = await fs.readFile(path.resolve(nginxTemplateFile), { encoding: 'utf8' });
  const pidConfig = /^\s*pid\s+([a-zA-Z0-9._/]+)\s*;\s*$/m.exec(template);
  const pidFile = pidConfig ? pidConfig[1] : '/var/run/nginx.pid';

  const nginxFile = _.template(template)({
    env: process.env,
    pecorino: {
      UPSTREAMS: upstreams,
      URL_REWRITES: rewrites,
    },
  });
  await fs.writeFile(filePath, nginxFile, { encoding: 'utf8' });

  info('Starting nginx ...');
  return validAndStartNginx(nginxCmd, filePath, pidFile);
}

if (process.argv.length < 2) {
  console.log(`Usage: ${__filename} <nginx_template.conf>`);
  process.exit(1);
}

(async () => {
  await start(process.argv[2]);
})();
