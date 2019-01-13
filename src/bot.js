const Discord = require('discord.io');
const winston = require('winston');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');
const { VerseQuery, RandomVerse } = require('./verseQuery');

const MAX_LENGTH = 1980;

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

// Connect to SQLITE DB
const db = new sqlite3.Database(`${__dirname}/../files/Quran.sqlite`, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.log(`[DB ERROR] Failed to connect to DB ${err.message}`);
    logger.error(err.message);
  } else {
    console.log('[DB] Connected to the Quran DB');
    logger.info('[DB] Connected to the Quran DB');
  }
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

bot.on('ready', (evt) => {
  console.log(`[CONNECTED] Logged in as: ${bot.username} - (${bot.id})`)
  logger.info('Connected');
  logger.info('Logged in as: ');
  logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', (user, userID, channelID, message, evt) => {
  console.log(`[MESSAGE] Received messge from ${user} (${userID})`);
  if (user !== 'Masjid Bot' && user !== 'TheFinalTestament') {
    handleMessage(userID, channelID, message);
  }
});

// Set up RandomVerse Instance
const random = new RandomVerse();

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
    console.log(`[INPUTS] ${verseQuery.sura}, ${verseQuery.firstVerse}, ${verseQuery.lastVerse}`);
    logger.debug('[INPUTS]', verseQuery.sura, verseQuery.firstVerse, verseQuery.lastVerse);
  } else {
    console.log(`[INPUTS] ${verseQuery.sura}, ${verseQuery.firstVerse}`);
    logger.debug('[INPUTS]', verseQuery.sura, verseQuery.firstVerse);
  }
};

// Generic response when a failure occurs.
const failureResponse = (userID, message) => {
  if (NODE_ENV === 'development') {
    console.log('Recipient: ' + userID);
    console.log('Message: ' + message);
    return;
  }

  bot.sendMessage({
    to: userID,
    message: message
  });
}

const sendMessage = (recipient, message) => {
  if (message.length === 0) {
    console.log('[RESPONSE] I GOT NOTHING...');
    logger.info('[RESPONSE] I GOT NOTHING', message);
    return null;
  }
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

// Get string containing range of verses
const cleanVerses = (query, rows) => {
  const result = [];
  rows.forEach((row, index) => {
    const currentVerse = query.firstVerse + index;
    const { ZSURA_EN, ZSUBTITLE, ZENGLISH_VERSION, ZFOOTNOTE } = row;

    if (ZSUBTITLE) result.push(ZSUBTITLE);

    if (query.sura === 1) {
      if (currentVerse === 0) {
        throw new Error('cleanVerses: INVALID VERSE RANGE')
      } else if (currentVerse === 1) {
        result.push(`Sura ${query.sura}: ${ZSURA_EN}`);
      }
      result.push(`[${query.sura}:${currentVerse}] ${ZENGLISH_VERSION}`);
    } else { // Sura 2-114
      if (currentVerse === 0) {
        result.push(`Sura ${query.sura}: ${ZSURA_EN}`);
        result.push(ZENGLISH_VERSION);
      } else if (currentVerse === 1) {
        if (query.firstVerse !== 0) { // this prevents redundant title text
          result.push(`Sura ${query.sura}: ${ZSURA_EN}`);
          if (query.sura === 9) {// No basmalah!
            result.push('No Basmalah*');
          } else {
            result.push('In the name of GOD, Most Gracious, Most Merciful');
          }
        }
        result.push(`[${query.sura}:${currentVerse}] ${ZENGLISH_VERSION}`);
      } else {
        result.push(`[${query.sura}:${currentVerse}] ${ZENGLISH_VERSION}`);
      }
    }
    if (ZFOOTNOTE) result.push(ZFOOTNOTE);
  });

  return result.join('\n');
}

const parseMessage = (message) => {
  const verses = [];
  for (let i = 0; i < message.length; i += 1) {
    if (message.includes('$random')) {
      const query = random.generateRandomVerse();
      try {
        i += 6
        query.isValid();
        verses.push(query);
      } catch (e) {
        logger.error('[CAUGHT EXCEPTION] ', e);
      }
    } else if (message[i] === '$') {
      const query = new VerseQuery(message.slice(i));
      try {
        i += (query.index - 1);
        query.isValid();
        verses.push(query);
      } catch (e) {
        logger.error('[CAUGHT EXCEPTION] ', e);
      }
    }
  }
  return verses;
}

const handleMessage = (userID, channelID, message) => {
  if (message[0] === '!') {
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
    //TODO: create return multiple querie in the same message
    try {
      const query = verses[0];
      findVerses(query, (rows) => {
        debugLog(query);
        if (rows) {
          const response = cleanVerses(query, rows);
          sendMessage(channelID, response);
        }
      });
    } catch (e) {
      console.log(`[DATABASE] ${e}`);
      logger.error("[DATABASE] ", e);
      // failureResponse(userID, "HI! Quran Bot here. It looks like we didn't get anything. Please check the command you typed");
    }
  }

}

process.on('uncaughtException', (err) => {
  console.log(`[EXCEPTION] Caught exception ${err}`)
  logger.error('Caught exception: ' + err);
});
