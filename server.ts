import { createServer } from 'http';
import next from 'next';
import { Server as SocketServer } from 'socket.io';
import { setupSocketHandlers } from './lib/socket/handlers';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketServer(httpServer, {
    path: '/api/socketio',
    cors: {
      origin: dev ? '*' : undefined,
    },
  });

  setupSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(
      `> Poker server listening at http://localhost:${port} (${dev ? 'development' : 'production'})`
    );
  });
});
