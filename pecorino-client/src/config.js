import fs from 'fs-extra';
import path from 'path';
import YAML from 'js-yaml';
import _ from 'lodash';

import * as log from './log';

async function loadConfigImpl(filePath) {
  return new Promise(resolve => {
    fs.access(filePath, async err => {
      if (err) {
        log.info(`Can't find the pecorino config file "${filePath}".`);
        resolve({});
      } else {
        log.info(`Pecorino config file is found at "${filePath}".`);
        const configText = await fs.readFile(filePath);
        const configItems = YAML.safeLoad(configText);
        resolve(configItems);
      }
    });
  });
}
export default async function loadConfig(config, overwrite) {
  const fileName = /^(.*)\.([^.]+)$/.exec(config);
  if (!fileName) {
    log.error(`Config filename (${config}) wrong, it should like '[filename].[ext]'. Default is 'pecorino.yaml'.`);
    process.exit(1);
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  const developmentFileName = path.resolve(process.cwd(), `${fileName[1]}.${nodeEnv}.${fileName[2]}`);
  const defaultFileName = path.resolve(process.cwd(), config);

  const development = await loadConfigImpl(developmentFileName);
  const def = await loadConfigImpl(defaultFileName);

  if (_.isEmpty(development) && _.isEmpty(def)) {
    log.warn(`Can't find config file "${config}"`);
  }

  return _.assign({}, def, development, overwrite);
}
