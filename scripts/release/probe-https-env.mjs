#!/usr/bin/env node
import https from 'node:https';
const u = process.env.RELEASE_DEPLOYMENT_URL;
console.log(Boolean(u), typeof https.request);
