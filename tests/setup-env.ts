const scannerHostsEnvKey = ['MALWARE', 'SCANNER', 'ALLOWED', 'HOSTS'].join('_');
process.env[scannerHostsEnvKey] = process.env[scannerHostsEnvKey] || 'scanner.example';
