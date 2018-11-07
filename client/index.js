#!/usr/bin/env node

const SocketIo = require('socket.io-client');
const yargs = require('yargs');
const { URL } = require('url');
const chalk = require('chalk');
const childProcess = require('child_process');
const fetch = require('node-fetch');

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
         -a <my-ip-address-url> \\
         -p <my-port> \\
         -r
  `)
  .alias('m', 'master')
  .alias('s', 'serviceId')
  .alias('a', 'myAddr')
  .alias('p', 'myPort')
  .alias('f', 'file')
  .alias('r', 'register')
  .count('verbose')
  .alias('v', 'verbose')
  .demandOption(['m', 's', 'f']);

const master = new URL(argv.master);
const { serviceId, myAddr, myPort, file, register } = argv;

let pid;

const io = new SocketIo(master.origin, { path: `${master.pathname}io` });
io.on('connect', () => {
  if (register) {
    io.emit('register', {
      service: serviceId,
      addr: myAddr,
      port: myPort,
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

function start() {
  info(`Prepare to starting the service "${serviceId}"...`);

  fetch(`${argv.master}/conf/${serviceId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(res => {
    if (!res.ok) {
      throw new Error(`Assess failed with ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }).then(conf => {
    info(`Got the configurations from comfit. then starting the service "${serviceId}"...`);
    pid = childProcess.spawn('node', ['-r', 'babel-register', file, ...argv._], {
      env: Object.assign({}, process.env, conf),
      stdio: 'inherit'
    });
    pid.on('exit', (code, signal) => {
      info(`Service exit with code ${code}, that is caused by signal "${signal}"`);
      if (signal === 'SIGUSR2') {
        start();
      }
    });
    info(`Service "${serviceId}" stared, the PID is ${pid.pid}.`);
  }).catch(err => {
    error(`Service "${serviceId}" starting failed with error: ${err.stack}`);
  });
}

start();
