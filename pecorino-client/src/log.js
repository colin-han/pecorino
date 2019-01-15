import chalk from 'chalk';

export function info(message) {
  console.log(`${chalk.gray('[pecorino]')} ${message.replace(/[\r\n]+/g, `\n${chalk.gray('[pecorino]')} `)}`);
}

export function error(message) {
  console.error(`${chalk.gray('[pecorino]')} ${message.replace(/[\r\n]+/g, `\n${chalk.gray('[pecorino]')} `)}`);
}

export function warn(message) {
  console.warn(`${chalk.gray('[pecorino]')} ${message.replace(/[\r\n]+/g, `\n${chalk.gray('[pecorino]')} `)}`);
}
