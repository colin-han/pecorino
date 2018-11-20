const http = require('http');

console.log(JSON.stringify(process.env, null, ' '));

const server = http.createServer((req, res) => {
  res.text('Hello World!');
});

server.listen(4100);
