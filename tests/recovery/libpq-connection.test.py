#!/usr/bin/env python3
"""Offline credential transport and rejection tests; no database connection."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

HELPER = Path(__file__).resolve().parents[2] / 'scripts/recovery/prepare-libpq-connection.py'


class ConnectionTests(unittest.TestCase):
    def invoke(self, uri, directory):
        env = os.environ.copy()
        env['RISCK_SOURCE_DATABASE_URL'] = uri
        return subprocess.run(['python3', str(HELPER), directory], env=env,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    def test_password_stays_in_private_passfile(self):
        with tempfile.TemporaryDirectory() as directory:
            result = self.invoke('postgresql://reader:synthetic%3A%5Csecret@db.invalid:6543/tenant%20db', directory)
            self.assertEqual(result.returncode, 0)
            self.assertEqual(result.stderr, b'')
            fields = result.stdout.decode().split('\0')
            self.assertEqual(fields[:4], ['db.invalid', '6543', 'reader', 'tenant db'])
            password_file = Path(fields[4])
            self.assertEqual(password_file.stat().st_mode & 0o777, 0o600)
            self.assertEqual(password_file.read_text(), 'db.invalid:6543:tenant db:reader:synthetic\\:\\\\secret\n')
            self.assertNotIn(b'synthetic', result.stdout + result.stderr)

    def test_ipv6_and_default_port(self):
        with tempfile.TemporaryDirectory() as directory:
            result = self.invoke('postgres://reader:synthetic@[2001:db8::1]/fixture', directory)
            self.assertEqual(result.returncode, 0)
            self.assertEqual(result.stdout.decode().split('\0')[:4], ['2001:db8::1', '5432', 'reader', 'fixture'])
            self.assertTrue((Path(directory) / 'source.pgpass').read_text().startswith('2001\\:db8\\:\\:1:5432:'))

    def test_whitespace_password_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            result = self.invoke('postgres://reader:%20synthetic%20@db.invalid/fixture', directory)
            self.assertEqual(result.returncode, 0)
            self.assertTrue((Path(directory) / 'source.pgpass').read_text().endswith(': synthetic \n'))

    def test_invalid_input_never_leaks_or_creates_password_file(self):
        bad = ['postgres://reader:synthetic@db.invalid/db?sslmode=disable',
               'postgres://reader:synthetic@db.invalid/db?',
               'postgres://reader:synthetic@db.invalid/db#fragment',
               'postgres://reader:synthetic@db.invalid:0/db',
               'postgres://reader:synthetic@db.invalid:99999/db',
               'postgres://reader:synthetic%0Ainjection@db.invalid/db',
               'postgres://reader:synthetic%0Dinjection@db.invalid/db',
               'postgres://reader:synthetic%00@db.invalid/db',
               'postgres://reader:synthetic%ZZ@db.invalid/db',
               'postgres://reader:synthetic%FF@db.invalid/db',
               'postgres://reader:synthetic@%2Fvar%2Frun/db',
               'postgres://reader:synthetic@db1,db2/db',
               'postgres://reader:synthetic@db.invalid/',
               'postgres://reader@db.invalid/db',
               'postgres:///db', 'host=db.invalid password=synthetic']
        for uri in bad:
            with self.subTest(uri=uri), tempfile.TemporaryDirectory() as directory:
                result = self.invoke(uri, directory)
                self.assertEqual(result.returncode, 2)
                self.assertEqual(result.stdout, b'')
                self.assertNotIn(b'synthetic', result.stderr)
                self.assertFalse((Path(directory) / 'source.pgpass').exists())

    def test_existing_credential_file_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'source.pgpass'
            path.write_text('sentinel')
            result = self.invoke('postgres://reader:synthetic@db.invalid/db', directory)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(path.read_text(), 'sentinel')


if __name__ == '__main__':
    unittest.main()
