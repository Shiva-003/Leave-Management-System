import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';

const SERVICE_NAME = process.env.SERVICE_NAME || 'auth-service';

const sdk = new NodeSDK({
    resource: new Resource({
        'service.name': SERVICE_NAME,
        'service.version': '1.0.0',
    }),
    traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4318/v1/traces',
    }),

    instrumentations: [
        getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs':  { enabled: false },
            '@opentelemetry/instrumentation-dns': { enabled: false },
            '@opentelemetry/instrumentation-net': { enabled: false },
            '@opentelemetry/instrumentation-http': { ignoreIncomingRequestHook: (req) => req.url.includes('/health') }
        }),
    ],
});

sdk.start();
console.log(`[TRACING] OpenTelemetry SDK started — service: ${SERVICE_NAME}`);

const _flush = () => {
    sdk.shutdown()
        .then(()  => console.log('[TRACING] SDK flushed and shut down'))
        .catch((e) => console.error('[TRACING] SDK shutdown error:', e.message));
};

process.on('SIGTERM', _flush);
process.on('SIGINT',  _flush);
