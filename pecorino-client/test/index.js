import http from 'http';
import { start, get } from '../src';

start('http://localhost:5003')
  .then(async () => {
    const server = http.createServer((req, res) => {
      res.text('Hello World!');
    });

    const port = await get('merlin', 'PORT');
    console.log(port);
    server.listen(port);
  })
  .catch(err => {
    console.log(`Error: ${err}`);
  });
