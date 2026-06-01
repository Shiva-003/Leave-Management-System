import { createLogger, format, transports } from 'winston';
import Transport from 'winston-transport';
import net from 'net';

const SERVICE_NAME  = process.env.SERVICE_NAME  || 'notification-service';
const LOGSTASH_HOST = process.env.LOGSTASH_HOST || 'logstash';
const LOGSTASH_PORT = Number(process.env.LOGSTASH_PORT) || 5044;

class LogstashTransport extends Transport {
    constructor(opts) {
        super(opts);
        this._host = opts.host;
        this._port = opts.port;
        this._socket = null;
        this._connect();
    }

    _connect() {
        const socket = new net.Socket();
        socket.setTimeout(3000);
        socket.on('connect', () => { this._socket = socket; });
        socket.on('error',   () => socket.destroy());
        socket.on('timeout', () => socket.destroy());
        socket.on('close',   () => {
            this._socket = null;
            setTimeout(() => this._connect(), 5000);
        });
        socket.connect(this._port, this._host);
    }

    log(info, callback) {
        setImmediate(() => this.emit('logged', info));
        if (this._socket && !this._socket.destroyed) {
            try {
                this._socket.write(JSON.stringify(info) + '\n');
            } catch (err) {
                console.error('Failed to send log to Logstash:', err.message);
            }
        }
        callback();
    }
}


const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: SERVICE_NAME },
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.printf(({ timestamp, level, message, service, ...meta }) => {
                    const extras = Object.keys(meta).length
                        ? ' ' + JSON.stringify(meta)
                        : '';
                    return `[${service}] ${timestamp} ${level}: ${message}${extras}`;
                }),
            ),
        }),
        new LogstashTransport({ host: LOGSTASH_HOST, port: LOGSTASH_PORT }),
    ],
});

export default logger;
