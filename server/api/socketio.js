// @flow
import type { Server } from 'http';
import socketio from 'socket.io';
import P2mLogger from 'p2m-common-logger';
import config from 'config';

import etcd from './etcd';

const logger = new P2mLogger('SOCKET');
const { production, version, env } = config;

function registerService(name: string, end: string) {
  const key = end.replace(/[.:/]/g, '_');
  const path = `/${production}/${version}/${env}/services/register/${name}/${key}`;
  etcd.set(path, end);
}

let io;
export default function (server: Server) {
  io = socketio(server, { path: '/io' });
  logger.log('Socket io server started at "/io".');

  io.on('connection', socket => {
    logger.log(`A client "${socket.id}" connected to comfit socket.io server.`);
    socket.on('register', ({ service, addr, port }) => {
      const end = `${addr}:${port}`;
      logger.info(`Client "${socket.id}" from "${end}" register as service ${service}`);
      registerService(service, end);
    });
    socket.on('watch', ({ service }) => {
      socket.join(`watch_${service}`); // service changed.
      socket.join('watch'); // base changed.
    });
  });
}

export async function notifyServiceChange(service: string, changes: Array<string>) {
  logger.info(`Notify change to service ${service}.`);
  io.to(`watch_${service}`).emit('change', changes);
}

export async function notifyAllChange(changes: Array<string>) {
  logger.info('Notify change to all service.');
  io.to('watch').emit('change', changes);
}
