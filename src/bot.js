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

const findVerse = (chapterNumLookup, verseNumLookup, callback) => {
  const verseQuery = `SELECT v.ZSUBTITLE, v.ZENGLISH_VERSION, v.ZFOOTNOTE FROM ZVERSE v INNER JOIN ZSURA s ON s.Z_PK = v.ZWHICHSURA WHERE v.ZVERSE_NO IS ${verseNumLookup} AND s.ZSURA_NO IS ${chapterNumLookup};`

  return db.get(verseQuery, [], (err, rows) => {
    if (err) {
      throw err;
    } else {
      // console.log('these are the verses', rows);
      callback(rows);
    }
  });
}

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
  console.log('this is verseinfo', verseInfo)
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
