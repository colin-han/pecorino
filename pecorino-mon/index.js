#!/usr/bin/env node

const SocketIo = require('socket.io-client');
const yargs = require('yargs');
const { URL } = require('url');
const chalk = require('chalk');
const childProcess = require('child_process');
const { initEnv } = require('pecorino-client');
const config = require('config');

function info(message) {
  console.log(chalk.cyan(message));
}

function error(message) {
  console.error(chalk.red(message));
}

const { argv } = yargs
  .usage(`Usage: $0 -m <http://master-ip:port/path/to> \\
         -s <service-name> \\
         -f <server.js> \\
         -e <my-addr:my-port> \\
         [-r babel-register] \\
         -l
  `)
  .alias('m', 'master')
  .alias('s', 'serviceId')
  .alias('e', 'my')
  .alias('f', 'file')
  .array('require')
  .alias('r', 'require')
  .alias('l', 'register');

const settings = { ...config.pecorino, ...argv };

const master = new URL(settings.master);
const { serviceId, my, file, register } = settings;

let pid;

const io = new SocketIo(master.origin, { path: `${master.pathname}io` });
io.on('connect', () => {
  if (register) {
    info(`Registering current service (${my}) as ${serviceId}`);
    io.emit('register', {
      service: serviceId,
      end: my,
    }, () => {
      info('Register success.');
    });
  }
  io.emit('watch', { service: serviceId });
});
io.on('change', () => restart());

function restart() {
  if (pid) {
    info(`Found a config changed, to restarting the service "${serviceId}"...`);
    pid.kill('SIGUSR2');
  } else {
    start();
  }
}

function startService() {
  const r = [];
  if (argv.require) {
    argv.require.forEach(req => {
      r.push('-r');
      r.push(req);
    });
  }
  pid = childProcess.spawn('node', [...r, file, ...argv._], {
    env: process.env,
    stdio: 'inherit'
  });
  pid.on('exit', (code, signal) => {
    info(`Service exit with code ${code}, that is caused by signal "${signal}"`);
    if (signal === 'SIGUSR2') {
      start();
    }
  });
  info(`Service "${serviceId}" stared, the PID is ${pid.pid}.`);
}

function start() {
  info(`Prepare to starting the service "${serviceId}"...`);

  initEnv(argv.master, serviceId)
    .then(() => {
      startService();
    })
    .catch(err => {
      error(`Service "${serviceId}" starting failed with error: ${err.stack}`);
    });
}

start();
