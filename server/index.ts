import express from 'express';
import { createServer } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Server, Socket } from 'socket.io';
import { command, createGame, snapshot, type Game, type Command } from './game.js';

interface Seat { id: string; name: string; token: string; socket?: string; ready: boolean }
interface Room { code: string; host: string; seats: Seat[]; game?: Game; touched: number }
export function createApp(options: { adminToken?: string; version?: string; startDrained?: boolean } = {}) {
  const app = express(), http = createServer(app);
  const io = new Server(http, { maxHttpBufferSize: 8192 });
  const rooms = new Map<string, Room>();
  let draining = options.startDrained ?? false;
  const version = options.version || 'local';
  const status = () => ({ draining, version, rooms: rooms.size,
    activeGames: [...rooms.values()].filter(r => r.game && r.game.phase !== 'over').length });
  const admin = createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const expected = Buffer.from(`Bearer ${options.adminToken || ''}`);
    const supplied = Buffer.from(req.headers.authorization || '');
    if (!options.adminToken || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      res.writeHead(401); res.end(); return;
    }
    if (req.method === 'POST' && (req.url === '/drain' || req.url === '/resume')) {
      draining = req.url === '/drain';
      for (const room of rooms.values()) broadcast(room);
    } else if (req.method !== 'GET' || req.url !== '/status') { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(status()));
  });
  app.disable('x-powered-by');
  app.get('/health', (_req, res) => res.set('Cache-Control', 'no-store').json({ ok: true, version }));
  app.use(express.static(resolve('dist')));
  const broadcast = (r: Room) => {
    for (const s of r.seats) if (s.socket) io.to(s.socket).emit('room', {
      code: r.code, host: r.host, me: s.id, draining,
      seats: r.seats.map(({ id, name, ready, socket }) => ({ id, name, ready, connected: !!socket })),
      game: r.game ? snapshot(r.game, s.id) : null,
    });
  };
  io.on('connection', (socket: Socket) => {
    let binding: { code: string; id: string } | undefined;
    let requests = 0, windowStart = Date.now();
    const member = () => {
      const room = binding && rooms.get(binding.code), seat = room?.seats.find(s => s.id === binding?.id && s.socket === socket.id);
      if (!room || !seat) throw Error('Join a room first.');
      return { room, seat };
    };
    // Every event has a bounded payload and rate limit; tokens never enter broadcasts.
    const handle = (event: string, run: (data: any) => unknown) => socket.on(event, (data, reply) => {
      const respond = typeof reply === 'function' ? reply : () => {};
      try {
        if (Date.now() - windowStart > 10_000) { requests = 0; windowStart = Date.now(); }
        if (++requests > 40) throw Error('Too many requests. Wait a few seconds.');
        respond({ ok: true, ...(run(data ?? {}) as object ?? {}) });
      } catch (e) { respond({ ok: false, error: e instanceof Error ? e.message : 'Unable to complete that request.' }); }
    });
    handle('enter', data => {
      if (draining) throw Error('An update is pending. New seats are temporarily paused.');
      if (binding) throw Error('Leave your current room first.');
      if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 24) throw Error('Choose a name from 1 to 24 characters.');
      const name = data.name.trim();
      let room: Room | undefined;
      if (data.code) {
        if (typeof data.code !== 'string' || !/^[A-Z0-9]{6}$/.test(data.code)) throw Error('Enter a six-character room code.');
        room = rooms.get(data.code);
        if (!room) throw Error('Room not found. Check the code or create a new room.');
      } else {
        if (rooms.size >= 500) throw Error('The server is full. Please try later.');
        let code: string; do { code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase(); } while (rooms.has(code));
        room = { code, host: '', seats: [], touched: Date.now() }; rooms.set(code, room);
      }
      if (room.game) throw Error('This game has already started. Reconnect with your original browser.');
      if (room.seats.length >= 6) throw Error('This room is full.');
      const seat: Seat = { id: randomUUID(), name, token: randomBytes(32).toString('hex'), socket: socket.id, ready: false };
      room.seats.push(seat); if (!room.host) room.host = seat.id;
      binding = { code: room.code, id: seat.id }; room.touched = Date.now(); broadcast(room);
      return { code: room.code, token: seat.token, name };
    });
    handle('resume', data => {
      if (binding) throw Error('Already connected to a room.');
      const room = typeof data.code === 'string' ? rooms.get(data.code) : undefined;
      const seat = typeof data.token === 'string' && data.token.length === 64 ? room?.seats.find(s => s.token === data.token) : undefined;
      if (!room || !seat) throw Error('Your room session has expired. Create or join another room.');
      if (seat.socket) io.sockets.sockets.get(seat.socket)?.disconnect(true);
      seat.socket = socket.id; binding = { code: room.code, id: seat.id }; room.touched = Date.now(); broadcast(room);
    });
    handle('ready', () => { const { room, seat } = member(); if (room.game) throw Error('The game has started.'); seat.ready = !seat.ready; room.touched = Date.now(); broadcast(room); });
    handle('start', () => {
      if (draining) throw Error('An update is pending. New games are temporarily paused.');
      const { room, seat } = member();
      if (seat.id !== room.host || room.game || room.seats.length < 2 || !room.seats.every(s => s.ready && s.socket)) throw Error('The host can start when 2–6 connected players are ready.');
      room.game = createGame(room.seats.map(({ id, name }) => ({ id, name }))); room.touched = Date.now(); broadcast(room);
    });
    handle('move', data => {
      const { room, seat } = member();
      if (!room.game) throw Error('The game has not started.');
      if (data.revision !== room.game.revision) throw Error('The table changed. Review it and choose again.');
      if (room.seats.some(s => !s.socket && room.game!.players.find(p => p.id === s.id)?.cards.some(c => !c.revealed))) throw Error('Waiting for a disconnected player to return.');
      room.game = command(room.game, seat.id, data.command as Command); room.touched = Date.now(); broadcast(room);
    });
    handle('rematch', () => {
      const { room, seat } = member();
      if (room.host !== seat.id || room.game?.phase !== 'over') throw Error('Only the host can open a rematch after the game.');
      room.game = undefined; room.seats.forEach(s => { s.ready = false; }); room.touched = Date.now(); broadcast(room);
    });
    handle('leave', () => {
      const { room, seat } = member();
      if (room.game && room.game.phase !== 'over') throw Error('A live seat is preserved. Close this tab to disconnect; return to reconnect.');
      room.seats = room.seats.filter(s => s.id !== seat.id); binding = undefined;
      if (!room.seats.length) rooms.delete(room.code);
      else { if (room.host === seat.id) room.host = room.seats[0].id; room.touched = Date.now(); broadcast(room); }
    });
    socket.on('disconnect', () => {
      if (!binding) return;
      const room = rooms.get(binding.code), seat = room?.seats.find(s => s.id === binding?.id);
      if (seat?.socket === socket.id && room) { seat.socket = undefined; room.touched = Date.now(); broadcast(room); }
    });
  });
  const cleanup = setInterval(() => {
    for (const [code, room] of rooms) if ((!room.game || room.game.phase === 'over') && Date.now() - room.touched > 6 * 60 * 60 * 1000 && room.seats.every(s => !s.socket)) rooms.delete(code);
  }, 60_000); cleanup.unref();
  http.on('close', () => clearInterval(cleanup));
  return { http, io, admin };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const adminToken = process.env.ADMIN_TOKEN_FILE ? readFileSync(process.env.ADMIN_TOKEN_FILE, 'utf8').trim() : undefined;
  if (adminToken !== undefined && adminToken.length < 32) throw Error('Admin token must be at least 32 characters.');
  const { http, admin, io } = createApp({ adminToken, version: process.env.BUILD_VERSION, startDrained: process.env.START_DRAINED === 'true' });
  const port = Number(process.env.PORT || 3001), host = process.env.HOST || '127.0.0.1';
  http.listen(port, host, () => console.log(`Cat Coup: http://${host}:${port}`));
  if (adminToken) admin.listen(Number(process.env.ADMIN_PORT || 3002), process.env.ADMIN_HOST || '127.0.0.1');
  const shutdown = () => { admin.close(); io.close(() => process.exit(0)); setTimeout(() => process.exit(1), 5000).unref(); };
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
}
