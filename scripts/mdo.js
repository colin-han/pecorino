// Do command within every projects
const childProcess = require('child_process');
const chalk = require('chalk');
const readline = require('readline');
const path = require('path');

const projects = [
  'pecorino-cli',
  'pecorino-client',
  'pecorino-mon',
  'pecorino-nginx',
  'pecorino-server',
];

let parallel, command, args;
const argv = process.argv.slice(2);
if (argv[ 0 ] === '-p') {
  parallel = true;
  command = argv[ 1 ];
  args = argv.slice(2);
} else {
  parallel = false;
  command = argv[ 0 ];
  args = argv.slice(1);
}

function doOneProject(project) {
  return new Promise((resolve, reject) => {
    function log(line) {
      console.log(chalk.gray(`[${project}]`) + ' ' + line);
    }

    function err(line) {
      console.log(chalk.red(`[${project}]`) + ' ' + line);
    }

    log(chalk.cyan(`== Starting to execute "${command} ${args.join(' ')}" ==================`));
    const cwd = path.resolve(__dirname, '..', project);
    let cp;
    if (parallel) {
      cp = childProcess.spawn(command, args, { cwd, shell: true });
      const stdout = readline.createInterface({ input: cp.stdout, terminal: true });
      stdout.on('line', line => log(line));

      const stderr = readline.createInterface({ input: cp.stderr, terminal: true });
      stderr.on('line', line => err(line));
    } else {
      cp = childProcess.spawn(command, args, {
        cwd,
        stdio: [ 0, 1, 2 ],
        shell: true,
      });
    }
    cp.on('close', code => {
      if (code === 0) {
        log(chalk.gray('Command execute successed.'));
      } else {
        err(chalk.red('Command exit with error code: ' + code));
      }
      resolve(code);
    });
    cp.on('error', reject);
  });
}

let promise;
if (parallel) {
  promise = Promise.all(projects.map(p => doOneProject(p)));
} else {
  promise = projects.reduce(
    (l, p) => l.then(
      (r) => doOneProject(p).then((code) => {
        r.push(code);
        return r;
      }),
    ),
    Promise.resolve([]),
  );
}

promise.then((codes) => {
  if (codes.filter(c => c !== 0).length) {
    console.log(chalk.red.bold('Some command execute failed.'));
    process.exit(-1);
  } else {
    console.log(chalk.cyan.bold('All command execute success.'));
    process.exit(0);
  }
}).catch((error) => {
  console.log(chalk.red.bold('Some exception occur.'));
  console.log(error.stack);
  process.exit(-2);
});


