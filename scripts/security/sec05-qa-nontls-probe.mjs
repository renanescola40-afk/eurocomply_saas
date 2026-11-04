import net from 'node:net';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * QA-only, credential-free PostgreSQL non-TLS probe. Do not use against PROD.
 * Sends a protocol-3 startup packet, with PUBLIC role/database identifiers and
 * NO password, authentication response, customer data or SQL. The socket is
 * closed as soon as a server response is classified.
 *
 * A negative probe is accepted ONLY on an explicit server TLS-requirement
 * error. Authentication challenge is evidence that a non-TLS startup reached
 * authentication, but may not prove a full session could be established.
 */
const QA_HOST = 'db.zrxrrfbllsxtleyxjpsz.supabase.co';
const QA_PORT = 5432;
const MAX_BYTES = 8192;
const TLS_REJECTION = /(?:no encryption|(?:ssl|tls|encryption) (?:is )?required|must (?:use|enable) (?:ssl|tls)|non[- ]ssl connections? (?:are )?(?:not allowed|rejected))/i;

export function startupPacket() {
  const params = Buffer.from('user\0postgres\0database\0postgres\0application_name\0risck_sec05_qa_nontls_probe\0\0', 'utf8');
  const packet = Buffer.alloc(8 + params.length);
  packet.writeUInt32BE(packet.length, 0);
  packet.writeUInt32BE(196608, 4); // PostgreSQL protocol 3.0
  params.copy(packet, 8);
  return packet;
}

function parseErrorPayload(data) {
  const parts = new Map();
  for (let idx = 0; idx < data.length && data[idx] !== 0;) {
    const code = String.fromCharCode(data[idx++]);
    const end = data.indexOf(0, idx);
    if (end < 0) return null;
    parts.set(code, data.toString('utf8', idx, end));
    idx = end + 1;
  }
  return { sqlstate: parts.get('C') ?? '', message: parts.get('M') ?? '' };
}

export function classifyResponse(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5) return null;
  const len = buffer.readUInt32BE(1);
  if (len < 4 || len + 1 > MAX_BYTES) return 'INCONCLUSIVE';
  if (buffer.length < len + 1) return null;
  const kind = String.fromCharCode(buffer[0]);
  if (kind === 'R') return 'NON_TLS_REACHED_AUTH';
  if (kind !== 'E') return 'INCONCLUSIVE';
  const error = parseErrorPayload(buffer.subarray(5, len + 1));
  if (!error) return 'INCONCLUSIVE';
  // No raw server error is logged: it can contain client/network identifiers.
  return TLS_REJECTION.test(error.message) ? 'EXPLICIT_NON_TLS_REJECTION' : 'INCONCLUSIVE';
}

export function probeNonTls({ host = QA_HOST, port = QA_PORT, timeoutMs = 5000 } = {}) {
  if (host !== QA_HOST && host !== '127.0.0.1') throw new Error('Only QA hostname or local fixture allowed');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 15000) throw new Error('Invalid timeout');
  return new Promise(resolveResult => {
    const socket = net.createConnection({ host, port });
    let answered = false;
    let collected = Buffer.alloc(0);
    function settle(result) {
      if (answered) return;
      answered = true;
      socket.destroy();
      resolveResult({project:'QA',evidence:'credential-free-startup',result});
    }
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => socket.write(startupPacket()));
    socket.on('data', data => {
      if (collected.length + data.length > MAX_BYTES) return settle('INCONCLUSIVE');
      collected = Buffer.concat([collected, data]);
      const classification = classifyResponse(collected);
      if (classification) settle(classification);
    });
    socket.once('timeout', () => settle('INCONCLUSIVE'));
    socket.once('error', () => settle('INCONCLUSIVE'));
    socket.once('end', () => settle('INCONCLUSIVE'));
    socket.once('close', () => settle('INCONCLUSIVE'));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await probeNonTls();
    process.stdout.write(JSON.stringify(result) + '\n');
    if (result.result !== 'EXPLICIT_NON_TLS_REJECTION') process.exitCode = 2;
  } catch {
    process.stdout.write(JSON.stringify({project:'QA',result:'INCONCLUSIVE'}) + '\n');
    process.exitCode = 2;
  }
}
