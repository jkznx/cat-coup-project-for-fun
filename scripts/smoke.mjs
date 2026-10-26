// Lobby-only smoke: leaves both seats and never creates an unfinished live game.
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
const base = process.env.BASE_URL || 'http://127.0.0.1:3001';
const health = await (await fetch(base + '/health', { signal: AbortSignal.timeout(10000) })).json();
assert.equal(health.ok, true);
if (process.env.EXPECTED_VERSION) assert.equal(health.version, process.env.EXPECTED_VERSION);
for (const transport of ['websocket', 'polling']) {
  const clients = [];
  const send = (s, event, data = {}) => s.timeout(5000).emitWithAck(event, data);
  try {
    for (let i = 0; i < 2; i++) {
      const s = io(base, { transports: [transport], reconnection: false, timeout: 10000, forceNew: true });
      clients.push(s);
      await new Promise((resolve, reject) => { s.once('connect', resolve); s.once('connect_error', reject); });
    }
    const host = await send(clients[0], 'enter', { name: 'Deploy smoke A' }); assert.equal(host.ok, true);
    assert.equal((await send(clients[1], 'enter', { name: 'Deploy smoke B', code: host.code })).ok, true);
    for (const s of clients) assert.equal((await send(s, 'ready')).ok, true);
    for (const s of clients) assert.equal((await send(s, 'leave')).ok, true);
    console.log(`PASS: ${transport} create/join/ready/leave`);
  } finally { for (const s of clients) s.disconnect(); }
}
