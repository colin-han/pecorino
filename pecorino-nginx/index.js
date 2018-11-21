#!/usr/bin/env node
const chalk = require('chalk');
const childProcess = require('child_process');
const _ = require('lodash');
const { promises: fs } = require('fs');
const path = require('path');

function info(message) {
  console.log(chalk.cyan(message));
}
function error(message) {
  console.error(chalk.red(message));
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

  const ends = _.map(
    _.filter(
      _.toPairs(env),
      ([name]) => name.indexOf('@_') === 0
    ),
    ([name, value]) => ([
      name.substring(2),
      value.split(',').map(end => {
        const parts = end.split(':');
        return {
          ip: parts[0],
          port: parts[1],
          role: parts[2] || 'api'
        };
      })
    ])
  );

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
  const nginxFile = _.template(template)({
    env: process.env,
    pecorino: {
      UPSTREAMS: upstreams,
      URL_REWRITES: rewrites,
    },
  });
  await fs.writeFile(filePath, nginxFile, { encoding: 'utf8' });

  info('Starting to validate nginx.conf');
  childProcess.exec(`"${nginxCmd}" -t -c ${filePath}`, (err, stdout, stderr) => {
    if (err) {
      error('Validate nginx.conf failed with errors: --------------');
      console.error(err);
      console.error('STDOUT: ----------------------------------------------');
      console.error(stdout);
      console.error('STDERR: ----------------------------------------------');
      console.error(stderr);
      process.exit(3);
      return;
    }

    info('Validate success, reload nginx ...');
    childProcess.exec(`"${nginxCmd}" -s reload -c "${filePath}"`, (err2, stdout2, stderr2) => {
      if (err2) {
        error(`Reload nginx config with error: ${err2}`);
        console.error('STDOUT: ----------------------------------------------');
        console.error(stdout2);
        console.error('STDERR: ----------------------------------------------');
        console.error(stderr2);
        process.exit(4);
        return;
      }

      console.log('STDOUT: ----------------------------------------------');
      console.log(stdout2);
      console.log('STDERR: ----------------------------------------------');
      console.log(stderr2);
      info('Reload success.');
    });
  });
}

if (process.argv.length < 2) {
  console.log(`Usage: ${__filename} <nginx_template.conf>`);
  process.exit(1);
}
start(process.argv[2]);
