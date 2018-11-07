// @flow
/* eslint-disable no-underscore-dangle */
const Module = module.constructor;
const jsCompiler = Module._extensions['.js'];

(async function boot() {
  addModuleExtensions();
  // eslint-disable-next-line flowtype-errors/show-errors,global-require
  require('./server');
}());

// async function initDatabase() {
//   return models.sequelize.sync({ alter: true })
//     .catch(async () => {
//       await models.sequelize.sync({ force: true });
//     });
// }

function addModuleExtensions() {
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    Module._extensions = {
      '.dev.js': jsCompiler,
      ...Module._extensions
    };
  } else {
    Module._extensions = {
      '.prod.js': jsCompiler,
      ...Module._extensions
    };
  }
}
