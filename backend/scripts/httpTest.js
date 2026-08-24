import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

function get(u) {
  return new Promise((resolve, reject) => {
    const url = new URL(u);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(u, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const urls = ['http://localhost:3000/', 'http://localhost:3000/api/health', 'http://localhost:3000/api/dashboard/summary'];
  for (const u of urls) {
    try {
      const r = await get(u);
      console.log(u, r.status, r.body);
    } catch (e) {
      console.error(u, 'ERR', e.message);
    }
  }
}

run();
