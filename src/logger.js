const winston = require('winston');

const NODE_ENV = process.env.NODE_ENV || 'development';

const transportConsole = new (winston.transports.Console)({
  timestamp: true,
  colorize: true,
});

const transportFile = new winston.transports.File({filename: 'bot.log'});

let logger;

if (NODE_ENV === 'development') {
    logger = winston.createLogger({
        format: winston.format.json(),
        transports: [transportConsole, transportFile]
      });
} else {
    logger = winston.createLogger({
        format: winston.format.json(),
        transports: [transportFile]
      });
}

logger.level = process.env.LOG_LEVEL || 'silly';

module.exports = logger;
