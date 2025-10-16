const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      logMessage += ` ${JSON.stringify(data)}`;
    }
    
    return logMessage;
  }

  error(message, data) {
    if (this.level >= LOG_LEVELS.error) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  warn(message, data) {
    if (this.level >= LOG_LEVELS.warn) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  info(message, data) {
    if (this.level >= LOG_LEVELS.info) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  debug(message, data) {
    if (this.level >= LOG_LEVELS.debug) {
      console.log(this.formatMessage('debug', message, data));
    }
  }
}

export const logger = new Logger();