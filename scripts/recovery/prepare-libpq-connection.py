#!/usr/bin/env python3
"""Convert an operator URI to libpq fields and a private password file.

The URI is read only from the environment; passwords never enter argv/output.
stdout is a NUL-delimited list for the calling Bash script, never a log.
"""
import os
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


def prepare(directory):
    raw = os.environ.get('RISCK_SOURCE_DATABASE_URL', '')
    if '?' in raw or '#' in raw:
        raise ValueError('URI options are unsupported')
    uri = urlsplit(raw)
    if uri.scheme not in ('postgres', 'postgresql') or not uri.hostname:
        raise ValueError('PostgreSQL TCP URI required')
    values = [uri.hostname, uri.username, uri.password, uri.path[1:]]
    if any(value is None or value == '' for value in values):
        raise ValueError('Explicit connection fields required')
    if any(re.search(r'%(?![0-9A-Fa-f]{2})', value) for value in values):
        raise ValueError('Malformed URI encoding')
    host, user, password, database = [unquote(value, errors='strict') for value in values]
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9.-]*|[A-Fa-f0-9:]+', host):
        raise ValueError('Single TCP host required')
    if any(any(ord(c) < 32 or ord(c) == 127 for c in value)
           for value in [host, user, password, database]):
        raise ValueError('Control characters are unsupported')
    port = str(uri.port if uri.port is not None else 5432)
    if not 1 <= int(port) <= 65535:
        raise ValueError('Invalid port')
    target = Path(directory) / 'source.pgpass'
    escape = lambda value: value.replace('\\', '\\\\').replace(':', '\\:')
    line = ':'.join(escape(value) for value in [host, port, database, user, password]) + '\n'
    descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w', encoding='utf-8') as file:
        file.write(line)
    return [host, port, user, database, str(target)]


if __name__ == '__main__':
    try:
        if len(sys.argv) != 2:
            raise ValueError('Private directory required')
        fields = prepare(sys.argv[1])
        sys.stdout.buffer.write(('\0'.join(fields) + '\0').encode())
    except (ValueError, UnicodeError, OSError):
        print('Cannot prepare source connection; review URI and private directory', file=sys.stderr)
        raise SystemExit(2)
