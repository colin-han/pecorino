export function info(message) {
  console.log(`[pecorino] ${message.replace(/[\r\n]+/g, '\n[pecorino] ')}`);
}

export function error(message) {
  console.error(`[pecorino] ${message.replace(/[\r\n]+/g, '\n[pecorino] ')}`);
}

export function warn(message) {
  console.warn(`[pecorino] ${message.replace(/[\r\n]+/g, '\n[pecorino] ')}`);
}
