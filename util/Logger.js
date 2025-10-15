// util/Logger.js
const winston = require('winston');
const { combine, timestamp, printf, errors, colorize, json } = winston.format;

// Custom log levels with 'activity' level
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    activity: 4,
    debug: 5
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    activity: 'cyan',
    debug: 'blue'
  }
};

winston.addColors(customLevels.colors);

// Console format (colored, readable)
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      msg += `\n${JSON.stringify(metadata, null, 2)}`;
    }
    
    return msg;
  })
);

// File format (JSON for parsing)
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  json()
);

// Create logger instance
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'activity',
  format: fileFormat,
  // defaultMeta: { 
  //   service: 'manager-api',
  //   environment:'development'
  // },
  transports: [
    // Console
    new winston.transports.Console({ format: consoleFormat }),
    
    // All logs
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Error logs only
    new winston.transports.File({ 
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    
    // Activity logs only
    new winston.transports.File({ 
      filename: 'logs/activity.log',
      level: 'activity',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ],
  exitOnError: false
});

// Add custom activity method
logger.activity = function(message, metadata) {
  this.log('activity', message, metadata);
};

module.exports = logger;
