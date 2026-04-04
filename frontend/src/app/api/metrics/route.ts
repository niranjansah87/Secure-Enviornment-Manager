import { register, collectDefaultMetrics } from 'prom-client';
import { NextResponse } from 'next/server';

// Ensure metrics are collected once in the Node.js runtime
if (!(global as { prometheusRegistered?: boolean }).prometheusRegistered) {
  collectDefaultMetrics({ prefix: 'sem_frontend_' });
  (global as { prometheusRegistered?: boolean }).prometheusRegistered = true;
}

export async function GET() {
  try {
    const metrics = await register.metrics();
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': register.contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (_err) {
    console.error('Error collecting metrics', _err);
    return new NextResponse('Error collecting metrics', { status: 500 });
  }
}
