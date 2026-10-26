import test from 'node:test';
import assert from 'node:assert/strict';
import { io as connect, type Socket } from 'socket.io-client';
import { createApp } from '../server/index.js';

test('rooms enforce readiness, private hands, revisions and token-based reconnection', async () => {
  const { http, io } = createApp();
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const address = http.address() as { port: number };
  const clients: Socket[] = [];
  const views = new Map<Socket, any>();
  const client = async () => {
    const socket = connect(`http://127.0.0.1:${address.port}`, { transports: ['websocket'], forceNew: true });
    clients.push(socket);
    socket.on('room', room => views.set(socket, room));
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    return socket;
  };
  const emit = (socket: Socket, event: string, data = {}) => new Promise<any>((resolve, reject) =>
    socket.timeout(2000).emit(event, data, (error: Error | null, reply: any) => error ? reject(error) : resolve(reply)));
  const settle = () => new Promise(resolve => setTimeout(resolve, 30));
  try {
    const a = await client(), b = await client();
    const host = await emit(a, 'enter', { name: 'Miso' });
    assert.equal(host.ok, true);
    const guest = await emit(b, 'enter', { name: 'Mochi', code: host.code });
    assert.equal(guest.ok, true);
    assert.equal((await emit(a, 'start')).ok, false);
    await emit(a, 'ready'); await emit(b, 'ready');
    assert.equal((await emit(b, 'start')).ok, false);
    assert.equal((await emit(a, 'start')).ok, true);
    await settle();
    for (const socket of [a, b]) {
      const view = views.get(socket);
      assert.equal(view.seats.some((s: any) => 'token' in s), false);
      assert.equal('deck' in view.game, false);
      assert.equal(view.game.players.find((p: any) => p.id === view.me).cards.every((c: any) => !!c.role && !!c.id), true);
      assert.deepEqual(view.game.players.find((p: any) => p.id !== view.me).cards, [{ revealed: false }, { revealed: false }]);
    }
    assert.equal((await emit(b, 'move', { revision: 0, command: { type: 'action', action: 'income' } })).ok, false);
    assert.equal((await emit(a, 'move', { revision: 0, command: { type: 'action', action: 'income' } })).ok, true);
    assert.equal((await emit(a, 'move', { revision: 0, command: { type: 'action', action: 'income' } })).ok, false);
    a.disconnect(); await settle();
    assert.equal((await emit(b, 'move', { revision: 1, command: { type: 'action', action: 'income' } })).ok, false);
    const replacement = await client();
    assert.equal((await emit(replacement, 'resume', { code: host.code, token: '0'.repeat(64) })).ok, false);
    assert.equal((await emit(replacement, 'resume', { code: host.code, token: host.token })).ok, true);
    await settle();
    assert.equal(views.get(replacement).me, views.get(a).me);
    assert.equal(views.get(replacement).game.revision, 1);
    assert.equal((await emit(b, 'move', { revision: 1, command: { type: 'action', action: 'income' } })).ok, true);
  } finally {
    clients.forEach(socket => socket.disconnect());
    await new Promise<void>(resolve => io.close(() => resolve()));
  }
});
