/**
 * SEM SDK - Node.js Example
 *
 * This example demonstrates how to use the SEM SDK in a Node.js environment.
 *
 * Usage:
 *   npx ts-node examples/sdk-node/example.ts
 *   # or with compiled JS:
 *   node examples/sdk-node/example.js
 */

import { createSemSDK, SemSDK } from '../../sdk/javascript/src';

async function main() {
  console.log('=== SEM SDK Node.js Example ===\n');

  // Initialize SDK
  const sem = createSemSDK({
    baseUrl: process.env.SEM_BASE_URL || 'http://localhost:8070',
    debug: process.env.DEBUG === 'true',
  });

  // Register event listeners
  sem.on('auth:login', (data) => {
    console.log('Logged in:', data);
  });

  sem.on('auth:logout', () => {
    console.log('Logged out');
  });

  sem.on('ws:connect', () => {
    console.log('WebSocket connected');
  });

  sem.on('secret:change', (event) => {
    console.log('Secret changed:', event);
  });

  try {
    // Login
    console.log('1. Logging in...');
    const loginResponse = await sem.login({
      password: process.env.SEM_PASSWORD || 'Kumari@ai',
      namespace: 'global',
      environment: 'main',
      deviceType: 'sdk',
      deviceName: 'Example Node.js App',
    });
    console.log('   Login success:', loginResponse.success);

    // Get session info
    console.log('\n2. Getting session info...');
    const session = await sem.getSession();
    console.log('   Session ID:', session.sessionId?.substring(0, 16) + '...');
    console.log('   Namespace:', session.namespace);
    console.log('   Environment:', session.environment);

    // List secrets
    console.log('\n3. Listing secrets...');
    const secrets = await sem.getSecrets('global', 'main');
    console.log('   Total secrets:', secrets.secrets ? Object.keys(secrets.secrets).length : 0);

    // Get a specific secret
    console.log('\n4. Getting API_KEY secret...');
    const apiKey = await sem.getSecret('global', 'main', 'API_KEY');
    if (apiKey) {
      console.log('   Found API_KEY:', apiKey.substring(0, 10) + '...');
    } else {
      console.log('   API_KEY not found');
    }

    // Connect WebSocket for realtime updates
    console.log('\n5. Connecting to WebSocket...');
    sem.connectWs();
    sem.subscribeToEnvironment('global', 'main');
    console.log('   WebSocket subscribed to global/main');

    // Simulate some activity
    console.log('\n6. Waiting for events...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Cleanup
    console.log('\n7. Cleaning up...');
    sem.disconnectWs();
    await sem.logout();
    console.log('   Done!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();