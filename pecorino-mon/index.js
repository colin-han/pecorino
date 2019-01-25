#!/usr/bin/env node
const SocketIo = require('socket.io-client');
const yargs = require('yargs');
const { URL } = require('url');
const childProcess = require('child_process');
const { initEnv, loadConfig, pecorinoLog } = require('pecorino-client');
const _ = require('lodash');

const { argv } = yargs
  .options('master', {
    alias: 'm',
    describe: 'The url to pecorino service api.'
  })
  .options('service', {
    alias: 's',
    describe: 'The name of current service.'
  })
  .options('ip', {
    alias: 'i',
    describe: 'Address for current service, the gateway will transfer request for this service to this address and port describe be <port> argument'
  })
  .options('port', {
    alias: 'p',
    describe: 'Port for current service.'
  })
  .options('require', {
    alias: 'r',
    array: true,
    describe: 'Addition modules those will be required before main module, you can use this args to loading babel-register firstly.'
  })
  .options('register', {
    alias: 'l',
    boolean: true,
    describe: 'Register "http://<ip>:<port>" as a endpoint for current service.'
  })
  .options('watch', {
    alias: 'w',
    boolean: true,
    describe: 'Watch configuration change from pecorino server, to restart this service.'
  })
  .options('config', {
    alias: 'c',
    default: 'pecorino.yaml',
    describe: 'Config file that can be used to overwrite all args from command-line excepts this arg.',
  });

const { config } = argv;
const { _: commands } = argv;
let pid;
loadConfig(config, _.assign(_.omit(argv, ['config', '_']), { commands }))
  .then((settings) => {
    const master = new URL(settings.master);
    const { service, ip, port, register, watch } = settings;

    const io = new SocketIo(master.origin, { path: `${master.pathname}io` });
    io.on('connect', () => {
      if (register) {
        pecorinoLog.info(`Registering current service (${ip}:${port}) as ${service}`);
        io.emit('register', {
          service,
          end: `${ip}:${port}`,
        }, () => {
          pecorinoLog.info('Register success.');
        });
      }
      if (watch) {
        io.emit('watch', { service });
        io.on('change', () => restart());
      }
    });

    pecorinoLog.info(`Prepare to starting the service "${service}"...`);
    start();

    function restart() {
      if (pid) {
        pecorinoLog.info(`Found a config changed, to restarting the service "${service}"...`);
        pid.kill('SIGUSR2');
      } else {
        start();
      }
    }
    function startService() {
      const [arg0, ...args] = commands;
      if (/^.*\.js$/.test(arg0)) {
        // It is js file.
        const r = [];
        if (settings.require) {
          settings.require.forEach(req => {
            r.push('-r');
            r.push(req);
          });
        }
        pecorinoLog.info(`$ node ${r.join(' ')} ${commands.join(' ')}`);
        pid = childProcess.spawn('node', _.concat(r, commands), {
          env: process.env,
          stdio: 'inherit'
        });
      } else {
        pecorinoLog.info(`$ ${commands.join(' ')}`);
        pid = childProcess.spawn(arg0, args, {
          env: process.env,
          stdio: 'inherit'
        });
      }
      pid.on('exit', (code, signal) => {
        pecorinoLog.info(`Service exit with code ${code}, that is caused by signal "${signal}"`);
        if (signal === 'SIGUSR2') {
          pecorinoLog.info(`Prepare to restarting the service "${service}"...`);
          start();
        } else {
          process.exit(code);
        }
      });
      pecorinoLog.info(`Service "${service}" stared, the PID is ${pid.pid}.`);
    }
    function start() {
      initEnv(settings)
        .then(() => {
          startService();
        })
        .catch(err2 => {
          pecorinoLog.error(`Service "${service}" starting failed with error: ${err2.stack}`);
        });
    }
  })
  .catch(err => {
    pecorinoLog.error(`Load config failed with error: ${err.stack}`);
  });
