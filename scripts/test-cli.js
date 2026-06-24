#!/usr/bin/env node
/**
 * SEM CLI - Integration Test Script
 *
 * Tests CLI commands against a running SEM backend.
 * Usage: node scripts/test-cli.js
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.SEM_BASE_URL || 'http://localhost:8070';
const PASSWORD = process.env.SEM_PASSWORD || 'Kumari@ai';

function apiRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testAuthFlow() {
  console.log('\n=== CLI Integration Tests ===\n');

  const tests = [];

  // Test 1: Login
  try {
    console.log('Test 1: Login...');
    const res = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: {
        password: PASSWORD,
        deviceType: 'cli',
        namespace: 'global',
        environment: 'main',
      },
    });

    if (res.status === 200 && res.data.success) {
      console.log('  ✓ Login successful');
      console.log('    Token expires in:', res.data.data.expires_in, 'seconds');
      tests.push({ name: 'Login', passed: true });

      const accessToken = res.data.data.access_token;

      // Test 2: Get session info
      console.log('\nTest 2: Get session info...');
      const meRes = await apiRequest('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (meRes.status === 200 && meRes.data.success) {
        console.log('  ✓ Session info retrieved');
        console.log('    Namespace:', meRes.data.data.namespace);
        console.log('    Environment:', meRes.data.data.environment);
        tests.push({ name: 'Get Session', passed: true });
      } else {
        console.log('  ✗ Failed:', meRes.data);
        tests.push({ name: 'Get Session', passed: false });
      }

      // Test 3: Token refresh
      console.log('\nTest 3: Token refresh...');
      const refreshRes = await apiRequest('/api/v1/auth/refresh', {
        method: 'POST',
        body: { refresh_token: res.data.data.refresh_token },
      });

      if (refreshRes.status === 200 && refreshRes.data.success) {
        console.log('  ✓ Token refresh successful');
        tests.push({ name: 'Token Refresh', passed: true });
      } else {
        console.log('  ✗ Failed:', refreshRes.data);
        tests.push({ name: 'Token Refresh', passed: false });
      }

      // Test 4: List secrets
      console.log('\nTest 4: List secrets...');
      const secretsRes = await apiRequest('/api/v1/global/main', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (secretsRes.status === 200 && secretsRes.data.success) {
        console.log('  ✓ Secrets listed');
        const count = secretsRes.data.data?.secrets ? Object.keys(secretsRes.data.data.secrets).length : 0;
        console.log('    Total secrets:', count);
        tests.push({ name: 'List Secrets', passed: true });
      } else {
        console.log('  ✗ Failed:', secretsRes.data);
        tests.push({ name: 'List Secrets', passed: false });
      }

      // Test 5: Logout
      console.log('\nTest 5: Logout...');
      const logoutRes = await apiRequest('/api/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (logoutRes.status === 200) {
        console.log('  ✓ Logout successful');
        tests.push({ name: 'Logout', passed: true });
      } else {
        console.log('  ✗ Failed:', logoutRes.data);
        tests.push({ name: 'Logout', passed: false });
      }

    } else {
      console.log('  ✗ Login failed:', res.data);
      tests.push({ name: 'Login', passed: false });
    }
  } catch (error) {
    console.log('  ✗ Error:', error.message);
    tests.push({ name: 'Login', passed: false, error: error.message });
  }

  // Summary
  console.log('\n=== Test Summary ===');
  const passed = tests.filter((t) => t.passed).length;
  const failed = tests.filter((t) => !t.passed).length;
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    tests.filter((t) => !t.passed).forEach((t) => {
      console.log(`  - ${t.name}${t.error ? ': ' + t.error : ''}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

testAuthFlow();