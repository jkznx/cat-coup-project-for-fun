import test from 'node:test';
import assert from 'node:assert/strict';
import { io as connect, type Socket } from 'socket.io-client';
import { createApp } from '../server/index.js';

test('admin isolation and drain preserve unfinished games and reconnects', async () => {
  const token = 'test-only-'.repeat(4);
  const { http, io, admin } = createApp({ adminToken: token, version: 'test-revision', startDrained: true });
  await new Promise<void>(r => http.listen(0, '127.0.0.1', r));
  await new Promise<void>(r => admin.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${(http.address() as any).port}`;
  const control = `http://127.0.0.1:${(admin.address() as any).port}`;
  const clients: Socket[] = [];
  async function client() {
    const s = connect(url, { transports: ['websocket'], reconnection: false }); clients.push(s);
    await new Promise<void>((r, j) => { s.once('connect', r); s.once('connect_error', j); }); return s;
  }
  const send = (s: Socket, event: string, data = {}) => s.timeout(2000).emitWithAck(event, data);
  const request = (path: string, method = 'GET') => fetch(control + path, { method, headers: { Authorization: `Bearer ${token}` } });
  try {
    assert.equal((await fetch(control + '/status')).status, 401);
    assert.equal((await (await request('/status')).json()).draining, true);
    await request('/resume', 'POST');
    assert.equal((await fetch(url + '/drain', { method: 'POST' })).status, 404);
    assert.equal((await (await fetch(url + '/health')).json()).version, 'test-revision');
    const a = await client(), b = await client();
    const host = await send(a, 'enter', { name: 'A' });
    await send(b, 'enter', { name: 'B', code: host.code });
    await send(a, 'ready'); await send(b, 'ready');
    await request('/drain', 'POST');
    assert.equal((await send(a, 'start')).ok, false);
    const c = await client();
    assert.equal((await send(c, 'enter', { name: 'C' })).ok, false);
    await request('/resume', 'POST');
    assert.equal((await send(a, 'start')).ok, true);
    await request('/drain', 'POST');
    assert.equal((await send(a, 'move', { revision: 0, command: { type: 'action', action: 'income' } })).ok, true);
    a.disconnect(); b.disconnect(); await new Promise(r => setTimeout(r, 30));
    assert.deepEqual(await (await request('/status')).json(), { draining: true, version: 'test-revision', rooms: 1, activeGames: 1 });
    assert.equal((await send(c, 'resume', { code: host.code, token: host.token })).ok, true);
    await request('/resume', 'POST');
    assert.equal((await (await request('/status')).json()).draining, false);
  } finally {
    clients.forEach(s => s.disconnect());
    await new Promise<void>(r => io.close(() => r()));
    await new Promise<void>(r => admin.close(() => r()));
  }
});
