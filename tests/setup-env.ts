const scannerHostsEnvKey = ['MALWARE', 'SCANNER', 'ALLOWED', 'HOSTS'].join('_');
process.env[scannerHostsEnvKey] = process.env[scannerHostsEnvKey] || 'scanner.example';

// Keep unit tests deterministic when they are executed from a protected
// Production release job. Runtime smoke checks use RELEASE_* targets instead;
// unit-test URL generation must not inherit the live application origin.
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
