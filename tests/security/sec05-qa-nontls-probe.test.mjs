import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { classifyResponse, probeNonTls, startupPacket } from '../../scripts/security/sec05-qa-nontls-probe.mjs';

function errorFrame(message, sqlstate='28000') {
  const payload = Buffer.from('SFATAL\0C' + sqlstate + '\0M' + message + '\0\0', 'utf8');
  const frame = Buffer.alloc(5 + payload.length);
  frame[0] = 'E'.charCodeAt(0);
  frame.writeUInt32BE(4 + payload.length, 1);
  payload.copy(frame, 5);
  return frame;
}
function authFrame() {
  const frame=Buffer.alloc(9);
  frame[0]='R'.charCodeAt(0);
  frame.writeUInt32BE(8,1);
  frame.writeUInt32BE(10,5);
  return frame;
}

test('startup is PostgreSQL v3, never sends password or SQL', () => {
  const packet=startupPacket();
  assert.equal(packet.readUInt32BE(0), packet.length);
  assert.equal(packet.readUInt32BE(4),196608);
  assert.match(packet.toString('utf8'),/risck_sec05_qa_nontls_probe/);
  assert.doesNotMatch(packet.toString('utf8'),/password|authorization|SELECT/i);
});
test('explicit no-encryption rejection is a narrow, positive proof', () => {
  const frame=errorFrame('no pg_hba.conf entry for host xxx, user postgres, database postgres, no encryption');
  assert.equal(classifyResponse(frame), 'EXPLICIT_NON_TLS_REJECTION');
  assert.equal(classifyResponse(frame.subarray(0,8)),null);
});
test('TLS required error counts; unrelated error is inconclusive', () => {
  assert.equal(classifyResponse(errorFrame('SSL required')), 'EXPLICIT_NON_TLS_REJECTION');
  assert.equal(classifyResponse(errorFrame('password authentication failed')),'INCONCLUSIVE');
});
test('server reaching authentication cannot be labeled SSL-protected', () => {
  assert.equal(classifyResponse(authFrame()),'NON_TLS_REACHED_AUTH');
});
test('unexpected/oversized packets are inconclusive', () => {
  const over=Buffer.alloc(5);over[0]=69;over.writeUInt32BE(9000,1);
  assert.equal(classifyResponse(over),'INCONCLUSIVE');
  assert.equal(classifyResponse(Buffer.from([90,0,0,0,4])),'INCONCLUSIVE');
});
test('host allowlist prevents accidental production targeting', async () => {
  assert.throws(() => probeNonTls({host:'db.tganhbbhfxcpblmgqprg.supabase.co'}), /Only QA/);
});
test('real TCP framing against an in-memory mock proves rejection without credentials', async () => {
  const server=net.createServer(socket=>{
    socket.once('data', buffer=>{
      assert.equal(buffer.readUInt32BE(4),196608);
      const frame=errorFrame('no pg_hba.conf entry for host fake, no encryption');
      socket.write(frame.subarray(0,7));
      socket.write(frame.subarray(7));
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const {port}=server.address();
    const result=await probeNonTls({host:'127.0.0.1',port,timeoutMs:1000});
    assert.deepEqual(result,{project:'QA',evidence:'credential-free-startup',result:'EXPLICIT_NON_TLS_REJECTION'});
  } finally {await new Promise(resolve=>server.close(resolve));}
});
