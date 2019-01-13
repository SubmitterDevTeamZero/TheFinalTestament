const Discord = require('discord.io');
const winston = require('winston');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');

const VerseQuery = require('./helper');

const MAX_LENGTH = 1400;

dotenv.config();

const  NODE_ENV = process.env.NODE_ENV || 'development';
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
  stdin.addListener("data", function(d) {
      if (d.toString().trim() === 'quit')
        process.exit(-1);
      // note:  d is an object, and when converted to a string it will
      // end with a linefeed.  so we (rather crudely) account for that  
      // with toString() and then trim() 
      handleMessage('MOCK_USER_ID', 'MOCK_CHANNEL_ID', d.toString().trim());
    });
}

const findVerse = (suraNumLookup, verseNumLookup, callback) => {
  const verseQuery = genQuery(suraNumLookup, verseNumLookup);

  return db.get(verseQuery, [], (err, rows) => {
    if (err) {
      throw err;
    } else {
      logger.debug('these are the verses', rows);
      callback(rows);
    }
  });
};

// Looks up a range of verses from firstVerseNum to lastVerseNum
// in the given sura
const findVerses = (verseQuery, callback) => {
  return db.all(verseQuery, [], (err, rows) => {
    if (err) {
      throw err;
    } else {
      logger.debug('these are the verses (range)', rows);
      callback(rows);
    }
  });
};

const cleanVerse = (suraNum, verseNum, verseInfo) => {
  const { ZSURA_EN, ZSUBTITLE, ZENGLISH_VERSION, ZFOOTNOTE } = verseInfo;
  if (!areInputsValid(suraNum, verseNum, verseNum))
    throw new Error('cleanVerses: INVALID VERSE RANGE')

  const result = [];
  if (verseNum === 0) {
    result.push(`Sura ${suraNum}: ${ZSURA_EN}`);
    result.push(ZENGLISH_VERSION);
  } else if (verseNum === 1) {
    result.push(`Sura ${suraNum}: ${ZSURA_EN}`);
    if (suraNum !== 1 && suraNum !== 9) {
      result.push('In the name of GOD, Most Gracious, Most Merciful');
    }
    result.push(`[${suraNum}:${verseNum}] ${ZENGLISH_VERSION}`);
    if (ZFOOTNOTE) result.push(ZFOOTNOTE);
  } else {
    if (ZSUBTITLE) result.push(ZSUBTITLE);
    result.push(`[${suraNum}:${verseNum}] ${ZENGLISH_VERSION}`);
    if (ZFOOTNOTE) result.push(ZFOOTNOTE);
  }

  return result.join('\n');
}

// Get string containing range of verses
const cleanVerses = (suraNum, firstVerseNum, lastVerseNum, rows) => {
  const numVerses = lastVerseNum - firstVerseNum + 1;
  if (!areInputsValid(suraNum, firstVerseNum, lastVerseNum) || isNaN(numVerses) || numVerses < 1)
    throw new Error('cleanVerses: INVALID VERSE RANGE')

  const result = [];
  var num = 0;
  rows.forEach(function (row) {
    const currentVerse = firstVerseNum + num;
    const { ZSURA_EN, ZSUBTITLE, ZENGLISH_VERSION, ZFOOTNOTE } = row;

    if (suraNum === 1) {
      if (currentVerse === 0) {
        throw new Error('cleanVerses: INVALID VERSE RANGE')
      } else if (currentVerse === 1) {
        result.push(`Sura ${suraNum}: ${ZSURA_EN}`);
      }
      if (ZSUBTITLE) result.push(ZSUBTITLE);
      result.push(`[${suraNum}:${currentVerse}] ${ZENGLISH_VERSION}`);
      if (ZFOOTNOTE) result.push(ZFOOTNOTE);
    } else { // Sura 2-114
      if (currentVerse === 0) {
        result.push(`Sura ${suraNum}: ${ZSURA_EN}`);
        result.push(ZENGLISH_VERSION);
        if (ZFOOTNOTE) result.push(ZFOOTNOTE);
      } else if (currentVerse === 1) {
        if (firstVerseNum !== 0) { // this prevents redundant title text
          result.push(`Sura ${suraNum}: ${ZSURA_EN}`);
          if (suraNum === 9) // No basmalah!
            result.push('No Basmalah*');
          else
            result.push('In the name of GOD, Most Gracious, Most Merciful');
        }
        result.push(`[${suraNum}:${currentVerse}] ${ZENGLISH_VERSION}`);
        if (ZFOOTNOTE) result.push(ZFOOTNOTE);
      } else {
        if (ZSUBTITLE) result.push(ZSUBTITLE);
        result.push(`[${suraNum}:${currentVerse}] ${ZENGLISH_VERSION}`);
        if (ZFOOTNOTE) result.push(ZFOOTNOTE);
      }
    }

    num++;
  });

  return result.join('\n');
}

const areInputsValid = (suraNum, firstVerseNum, lastVerseNum) => {
  if ( (isNaN(suraNum) || isNaN(firstVerseNum) || isNaN(lastVerseNum))
      || (firstVerseNum > lastVerseNum)
      || (suraNum < 0)
      || (firstVerseNum < 0)
      || (lastVerseNum < 0)
      || (suraNum > 114)
      || (firstVerseNum > 286)
      || (lastVerseNum > 286)
      || (suraNum == 1 && firstVerseNum == 0)
      || (suraNum == 9 && firstVerseNum == 0) )
    return false;

  return true;
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

const parseMessage = (message) => {
  const verses = [];
  for (let i = 0; i < message.length; i += 1) {
    if (message[i] === '$') {
      const query = new VerseQuery(message.slice(i));
      try {
        query.isValid();
        verses.push(query)
        i += query.index;
      } catch (e) {
        logger.error('[CAUGHT EXCEPTION] ', e);
      }
    }
  }

  return verses;
}

const handleMessage = (userID, channelID, message) => {
  if (message[0] === '!') {
    const args = message.substring(1).split(' ');
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
    // refactor to parse multiple verses
    try {
      findVerse(verses[0]);
    } catch (e) {
      logger.error("[DATABASE] ", e)
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
