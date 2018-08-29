const Discord = require('discord.io');
const logger = require('winston');
const sqlite3 = require('sqlite3').verbose();
// const Promise = require('bluebird');

const auth = require('./../auth.json');

const db = new sqlite3.Database(`${__dirname}/../files/Quran.sqlite`, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the Quran database.');
  }
});

const genQuery = (chapterNumLookup, verseNumLookup) => {
  if (chapterNumLookup && verseNumLookup) {
    return (
      `SELECT v.ZSUBTITLE, v.ZENGLISH_VERSION, v.ZFOOTNOTE FROM ZVERSE v INNER JOIN ZSURA s ON s.Z_PK = v.ZWHICHSURA WHERE v.ZVERSE_NO IS ${verseNumLookup} AND s.ZSURA_NO IS ${chapterNumLookup};`
    )
  }
  return new Error('BAD SURA AND/OR VERSE: Need to provide a number');
};

const parseCMD = (type, cmd) => ({
  type,
  cmd,
});

const parseVerseQuery = (type, message) => {
  const format = { type };
  let val = '';

  for (let i = 0; i < message.length; i += 1) {
    const char = message[i];
    if (char === ':') {
      format.chapter = parseInt(val, 10);
      val = '';
      continue;
    } else if (char === '-') {
      format.startVerse = parseInt(val, 10);
      val = '';
      continue;
    }
    val += char;
  }

  if (val !== '') {
    if ('startVerse' in format) {
      format.endVerse = parseInt(val, 10);
    } else {
      format.startVerse = parseInt(val, 10);
    }
  }

  return format;
}

const parseLookup = (query) => {
  if (typeof query !== 'string') {
    return new Error('BAD QUERY: Please submit a string');
  }
  const type = query[0];
  if (type === '!') {
    return parseCMD(type, query.slice(1));
  } else if (type === '$') {
    return parseVerseQuery(type, query.slice(1));
  }
};

const findVerse = (chapterNumLookup, verseNumLookup, callback) => {
  const verseQuery = genQuery(chapterNumLookup, verseNumLookup);

  return db.get(verseQuery, [], (err, rows) => {
    if (err) {
      throw err;
    } else {
      // console.log('these are the verses', rows);
      callback(rows);
    }
  });
};

// close the database connection
const closeDb = () => {
  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Closing the database connection.');
  });
}

const cleanVerse = (chapterNum, verseNum, verseInfo) => {
  const { ZSUBTITLE, ZENGLISH_VERSION, ZFOOTNOTE } = verseInfo;
  const result = [];

  if (ZSUBTITLE) result.push(ZSUBTITLE);
  result.push(`[${chapterNum}:${verseNum}] ${ZENGLISH_VERSION}`);
  if (ZFOOTNOTE) result.push(ZFOOTNOTE);

  return result.join('\n');
}

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
  colorize: true
});
logger.level = 'debug';

// Initialize Discord Bot
const bot = new Discord.Client({
  token: auth.token,
  autorun: true
});

bot.on('ready', function (evt) {
  logger.info('Connected');
  logger.info('Logged in as: ');
  logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
  if (message[0] === '$') {
    const args = message.substring(1).split(":");
    const chapterNum = parseInt(args[0], 10);
    const verseNum = parseInt(args[1], 10);
    // console.log(chapterNum, verseNum);
  
    if (!isNaN(chapterNum) && !isNaN(verseNum)) {
      findVerse(chapterNum, verseNum, (verseInfo) => {
        // console.log(chapterNum, verseNum, verseInfo);
        if (verseInfo) {
          const message = cleanVerse(chapterNum, verseNum, verseInfo);
  
          bot.sendMessage({
            to: channelID,
            message
          });
        } else {
          bot.sendMessage({
            to: userID,
            message: `Invalid verse - [${chapterNum}:${verseNum}] does not exist`
          });
        }
  
      });
    }
  } else if (message[0] === '!') {
    let args = message.substring(1).split(' ');
    // console.log(args);
    let cmd = args[0].toLowerCase();

    args = args.splice(1);
    switch (cmd) {
      // !ping
      case 'ping':
        bot.sendMessage({
          to: channelID,
          message: 'Pong!'
        });
        break;
      case 'makan':
        bot.sendMessage({
          to: channelID,
          message: 'Hi Makan, thanks for that swell SQL query! Much love'
        });
        break;
    }
  }

});

module.exports = {
  genQuery,
  cleanVerse,
  parseCMD,
  parseVerseQuery,
  parseLookup
};
