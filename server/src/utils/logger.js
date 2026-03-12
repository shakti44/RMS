const { createLogger, format, transports } = require('winston');
const { combine, timestamp, errors, json, colorize, printf } = format;

const isProd = process.env.NODE_ENV === 'production';

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) =>
    `${timestamp} ${level}: ${stack || message}`)
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level:      process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  format:     isProd ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
    ...(isProd ? [
      new transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 10_000_000, maxFiles: 5 }),
      new transports.File({ filename: 'logs/combined.log',              maxsize: 10_000_000, maxFiles: 10 }),
    ] : []),
  ],
  exceptionHandlers: isProd ? [new transports.File({ filename: 'logs/exceptions.log' })] : [],
  rejectionHandlers: isProd ? [new transports.File({ filename: 'logs/rejections.log' })] : [],
});

module.exports = logger;
