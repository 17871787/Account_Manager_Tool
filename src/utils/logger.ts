let logger: {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
};

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pino = require('pino');
  logger = pino({
    level: process.env.LOG_LEVEL || 'info',
  });
} catch {
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug,
  };
}

export { logger };

