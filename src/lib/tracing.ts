// Lightweight OpenTelemetry setup (NodeSDK) with OTLP/HTTP exporter
// Only starts when OTEL_EXPORTER_OTLP_ENDPOINT is set. Safe in dev/build.

export function initTracing() {
  const g: any = globalThis as any;
  if (g.__otel_inited) return;
  const endpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
  if (!endpoint) return;

  try {
    // Lazy require to avoid bundler type resolution
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Resource } = require('@opentelemetry/resources');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

    const serviceName = process.env['OTEL_SERVICE_NAME'] || 'carelinkai';

    // Parse headers from OTEL_EXPORTER_OTLP_HEADERS: "k1=v1,k2=v2"
    const headersEnv = process.env['OTEL_EXPORTER_OTLP_HEADERS'] || '';
    const headers: Record<string, string> = {};
    if (headersEnv) {
      for (const pair of headersEnv.split(',')) {
        const [k, v] = pair.split('=');
        if (k && v) headers[k.trim()] = v.trim();
      }
    }

    const traceExporter = new OTLPTraceExporter({ url: endpoint, headers });

    // Instrumentations (loaded lazily; safe if packages missing)
    let instrumentations: any[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaInstrumentation } = require('@prisma/instrumentation');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { UndiciInstrumentation } = require('@opentelemetry/instrumentation-undici');
      instrumentations = [
        new PrismaInstrumentation(),
        new HttpInstrumentation(),
        new UndiciInstrumentation(),
      ];
    } catch {}

    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      }),
      traceExporter,
      instrumentations,
    });

    sdk.start().then(() => {
      g.__otel_inited = true;
    }).catch(() => {
      // ignore startup errors in non-critical envs
    });
  } catch {
    // OTel packages may be unavailable in certain build targets
  }
}