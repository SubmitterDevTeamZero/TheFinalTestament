const Discord = require('discord.io');
const winston = require('winston');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');

const VerseQuery = require('./verseQuery');

const MAX_LENGTH = 1400;

dotenv.config();

/* ------------------------------- */
/* --------- BOT SET UP ---------- */
/* ------------------------------- */

const NODE_ENV = process.env.NODE_ENV || 'development';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'dev_token';

// Configure logger settings
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

const db = new sqlite3.Database(`${__dirname}/../files/Quran.sqlite`, sqlite3.OPEN_READONLY, (err) => {
  err ? logger.error(err.message) : logger.info('Connected to the Quran database.');
});

if (NODE_ENV === 'development') {
  var stdin = process.openStdin();
  stdin.addListener("data", (d) => {
      if (d.toString().trim() === 'quit') process.exit(-1);
      // note:  d is an object, and when converted to a string it will
      // end with a linefeed.  so we (rather crudely) account for that  
      // with toString() and then trim() 
      handleMessage('MOCK_USER_ID', 'MOCK_CHANNEL_ID', d.toString().trim());
    });
}

// Initialize Discord Bot
const bot = new Discord.Client({
  token: AUTH_TOKEN,
  autorun: true
});

bot.on('ready', function (evt) {
  logger.info('Connected');
  logger.info('Logged in as: ');
  logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
  handleMessage(userID, channelID, message);
});

/* ------------------------------- */
/* -- Methods to Handle Message -- */
/* ------------------------------- */

// Looks up for all the verses that are tied to the query
const findVerses = (verseQuery, callback) => {
  // Use GET for the first row, and ALL for all the rows
  return db.all(verseQuery.generateQuery(), [], (err, rows) => {
    if (err) {
      throw err;
    } else {
      logger.debug('these are the verses (range)', rows);
      callback(rows);
    }
  });
};

const debugLog = (verseQuery) => {
  if (verseQuery.lastVerse) {
    logger.debug('[INPUTS]', verseQuery.sura, verseQuery.firstVerse, verseQuery.lastVerse);
  } else {
    logger.debug('[INPUTS]', verseQuery.sura, verseQuery.firstVerse);
  }
};

// Generic response when a failure occurs.
const failureResponse = (userId, message) => {
  if (NODE_ENV === 'development') {
    console.log('Recipient: ' + recipient);
    console.log('Message: ' + message);
    return;
  }

  bot.sendMessage({
    to: recipient,
    message: message
  });
}

// Get string containing range of verses
const cleanVerses = (verseQuery, rows) => {
  const result = [];
  rows.forEach(function (row, index) {
    const currentVerse = firstVerseNum + index;
    const { ZSURA_EN, ZSUBTITLE, ZENGLISH_VERSION, ZFOOTNOTE } = row;

    if (ZSUBTITLE) result.push(ZSUBTITLE);

    if (suraNum === 1) {
      if (currentVerse === 0) {
        throw new Error('cleanVerses: INVALID VERSE RANGE')
      } else if (currentVerse === 1) {
        result.push(`Sura ${suraNum}: ${ZSURA_EN}`);
      }
      result.push(`[${suraNum}:${currentVerse}] ${ZENGLISH_VERSION}`);
    } else { // Sura 2-114
      if (currentVerse === 0) {
        result.push(`Sura ${suraNum}: ${ZSURA_EN}`);
        result.push(ZENGLISH_VERSION);
      } else if (currentVerse === 1) {
        if (firstVerseNum !== 0) { // this prevents redundant title text
          result.push(`Sura ${suraNum}: ${ZSURA_EN}`);
          if (suraNum === 9) // No basmalah!
            result.push('No Basmalah*');
          else
            result.push('In the name of GOD, Most Gracious, Most Merciful');
        }
        result.push(`[${suraNum}:${currentVerse}] ${ZENGLISH_VERSION}`);
      } else {
        result.push(`[${suraNum}:${currentVerse}] ${ZENGLISH_VERSION}`);
      }
    }
    if (ZFOOTNOTE) result.push(ZFOOTNOTE);
  });

  return result.join('\n');
}

const parseMessage = (message) => {
  const verses = [];
  for (let i = 0; i < message.length; i += 1) {
    if (message[i] === '$') {
      const query = new VerseQuery(message.slice(i));
      try {
        query.isValid();
        verses.push(query);
        i += query.index;
      } catch (e) {
        logger.error('[CAUGHT EXCEPTION] ', e);
      }
    }
  }

  return verses;
}

const handleMessage = (userID, channelID, message) => {
  if (message[0] === '$') {
    const args = message.substring(1).split(':');
    const suraNum = parseInt(args[0], 10);

    if (args[1].includes('-')) { //range of verses
      const range = args[1].split('-');
      topRange = parseInt(range[0], 10);
      bottomRange = parseInt(range[1], 10);

      if (!isNaN(topRange) && !isNaN(bottomRange)) {
        findVerses(suraNum, topRange, bottomRange, (rows) => {
          logger.debug('Range inputs', suraNum, topRange, bottomRange);
          if (rows) {
            const response = cleanVerses(suraNum, topRange, bottomRange, rows);
            sendMessage(channelID, response);
          }
        });
      }

    } else { //assume it is a single verse
      const verseNum = parseInt(args[1], 10);
      if (!isNaN(suraNum) && !isNaN(verseNum)) {
        findVerse(suraNum, verseNum, (verseInfo) => {
          logger.debug(suraNum, verseNum, verseInfo);
          if (verseInfo) {
            const response =  cleanVerse(suraNum, verseNum, verseInfo);
            sendMessage(channelID, response);
          }
        });
      }
    }
  } else if (message[0] === '!') {
    let args = message.substring(1).split(' ');
    logger.debug(args);
    const cmd = args[0].toLowerCase();

    switch (cmd) {
      case 'ping':
        sendMessage(channelID, 'Pong!');
        break;
      case 'makan':
        sendMessage(channelID, 'Hi Makan, thanks for that swell SQL query! Much love');
        break;
      case 'takbeer':
        sendMessage(channelID, 'ALLAHU AKBAR!');
        break;
    }
  } else {
    const verses = parseMessage(message);
    //TODO: create ability to loop through multiple messages
    try {
      const query = verses[0];
      findVerses(query, (rows) => {
        debugLog(query);
        if (rows) {
          const response = cleanVerses(suraNum, topRange, bottomRange, rows);
          sendMessage(channelID, response);
        }
      });
    } catch (e) {
      logger.error("[DATABASE] ", e);
      failureResponse(userId, "HI! Quran Bot here. It looks like we didn't get anything. Please check the command you typed");
    }
  }

}

const sendMessage = (recipient, message) => {
  if (message.length > MAX_LENGTH) {
    message = message.substring(0, MAX_LENGTH);
    message += '\n[...]';
  }

  message = '```' + message + '```';

  if (NODE_ENV === 'development') {
    console.log('Recipient: ' + recipient);
    console.log('Message: ' + message);
    return;
  }

  bot.sendMessage({
    to: recipient,
    message: message
  });
};

process.on('uncaughtException', function(err) {
  logger.error('Caught exception: ' + err);
});
