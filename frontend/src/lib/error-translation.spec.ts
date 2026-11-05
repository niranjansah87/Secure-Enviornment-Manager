import { describe, it, expect } from 'vitest';
import { translateError } from './error-translation';

describe('error-translation', () => {
  it('translates explicit known error code', () => {
    const err = translateError({
      status: 401,
      body: { code: 'AUTH_TOKEN_INVALID' },
    });
    expect(err.title).toBe('Invalid API token');
    expect(err.severity).toBe('error');
    expect(err.code).toBe('AUTH_TOKEN_INVALID');
  });

  it('translates status 429 to rate limit error', () => {
    const err = translateError({
      status: 429,
    });
    expect(err.title).toBe('Too many requests');
    expect(err.severity).toBe('warning');
  });

  it('translates status 500 to internal error', () => {
    const err = translateError({
      status: 500,
    });
    expect(err.title).toBe('Something went wrong');
    expect(err.severity).toBe('error');
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  it('translates network error message when present', () => {
    const err = translateError({
      message: 'Failed to fetch',
      body: { error: 'Network request failed' },
      status: 503,
    });
    expect(err.severity).toBe('error');
  });
});
