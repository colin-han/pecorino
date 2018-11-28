#!/usr/bin/env node

const yargs = require('yargs');
const chalk = require('chalk');
const childProcess = require('child_process');
const { initEnv } = require('pecorino-client');

function info(message) {
  console.log(chalk.cyan(message));
}

function error(message) {
  console.error(chalk.red(message));
}

const { argv } = yargs
  .usage(`Usage: $0 -m <http://master-ip:port/path/to> \\
         -s <service-name> \\
         <your commands ...>
  `)
  .alias('m', 'master')
  .alias('s', 'serviceId')
  .demandOption(['m', 's']);

const { serviceId } = argv;

let pid;

function startService() {
  const [command, ...args] = argv._;
  pid = childProcess.spawn(command, args, {
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
