/**
 * SEM SDK - React Hooks Example
 *
 * This example demonstrates how to use the SEM SDK with React hooks.
 *
 * Usage:
 *   # In a React app, install the SDK:
 *   npm install @sem-org/sem-sdk
 *
 *   # Then use the hooks:
 *   import { useSemAuth, useSemSecrets } from '@sem-org/sem-sdk';
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createSemSDK, SemSDK } from '../../sdk/javascript/src';

// ============================================================================
// SDK Instance Hook
// ============================================================================

let sdkInstance: SemSDK | null = null;

function getSDK(baseUrl: string): SemSDK {
  if (!sdkInstance) {
    sdkInstance = createSemSDK({
      baseUrl,
      autoRefresh: true,
    });
  }
  return sdkInstance;
}

// ============================================================================
// Authentication Hook
// ============================================================================

interface UseSemAuthResult {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (password: string, namespace?: string, environment?: string) => Promise<void>;
  logout: () => Promise<void>;
  session: { sessionId: string; namespace: string; environment: string } | null;
}

export function useSemAuth(baseUrl: string): UseSemAuthResult {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ sessionId: string; namespace: string; environment: string } | null>(null);

  const sdk = getSDK(baseUrl);

  useEffect(() => {
    // Initialize from stored tokens
    sdk.initialize().then((hasTokens) => {
      setIsAuthenticated(hasTokens);
      if (hasTokens) {
        sdk.getSession().then((s) => {
          setSession({
            sessionId: s.sessionId,
            namespace: s.namespace,
            environment: s.environment,
          });
        }).catch(() => {
          setIsAuthenticated(false);
        });
      }
    });

    // Listen for auth events
    const handleLogin = () => setIsAuthenticated(true);
    const handleLogout = () => {
      setIsAuthenticated(false);
      setSession(null);
    };

    sdk.on('auth:login', handleLogin);
    sdk.on('auth:logout', handleLogout);

    return () => {
      sdk.off('auth:login', handleLogin);
      sdk.off('auth:logout', handleLogout);
    };
  }, [sdk]);

  const login = useCallback(async (password: string, namespace = 'global', environment = 'main') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await sdk.login({
        password,
        namespace,
        environment,
        deviceType: 'web',
        deviceName: navigator.userAgent,
      });

      if (response.success) {
        setIsAuthenticated(true);
        const s = await sdk.getSession();
        setSession({
          sessionId: s.sessionId,
          namespace: s.namespace,
          environment: s.environment,
        });
      } else {
        setError('Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }, [sdk]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await sdk.logout();
    } finally {
      setIsAuthenticated(false);
      setSession(null);
      setIsLoading(false);
    }
  }, [sdk]);

  return { isAuthenticated, isLoading, error, login, logout, session };
}

// ============================================================================
// Secrets Hook
// ============================================================================

interface UseSemSecretsResult {
  secrets: Record<string, string> | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSemSecrets(
  baseUrl: string,
  namespace: string,
  environment: string
): UseSemSecretsResult {
  const [secrets, setSecrets] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sdk = getSDK(baseUrl);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await sdk.getSecrets(namespace, environment);
      setSecrets(response.secrets || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load secrets');
    } finally {
      setIsLoading(false);
    }
  }, [sdk, namespace, environment]);

  useEffect(() => {
    refresh();

    // Subscribe to secret changes
    sdk.connectWs();
    sdk.subscribeToEnvironment(namespace, environment);

    const handleSecretChange = () => {
      refresh();
    };

    sdk.on('secret:change', handleSecretChange);

    return () => {
      sdk.off('secret:change', handleSecretChange);
      sdk.unsubscribeFromEnvironment(namespace, environment);
    };
  }, [sdk, namespace, environment, refresh]);

  return { secrets, isLoading, error, refresh };
}

// ============================================================================
// Example Component Usage
// ============================================================================

/*
// Example React component:
import { useSemAuth, useSemSecrets } from './hooks/sem-react';

function App() {
  const { isAuthenticated, isLoading, error, login, logout, session } = useSemAuth('http://localhost:8070');
  const { secrets, isLoading: secretsLoading, refresh } = useSemSecrets('http://localhost:8070', 'global', 'main');

  if (!isAuthenticated) {
    return (
      <div>
        <h1>Login to SEM</h1>
        <button onClick={() => login('Kumari@ai')}>Login</button>
        {error && <p style={{color: 'red'}}>{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <h1>SEM Secrets</h1>
      <p>Welcome, {session?.namespace}/{session?.environment}</p>
      <button onClick={logout}>Logout</button>
      <button onClick={refresh}>Refresh</button>

      {secretsLoading ? (
        <p>Loading secrets...</p>
      ) : (
        <ul>
          {secrets && Object.entries(secrets).map(([key, value]) => (
            <li key={key}><strong>{key}</strong>: {value}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
*/