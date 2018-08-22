const Discord = require('discord.io');
const logger = require('winston');

const db = require('./../db/db.js');
const auth = require('./../auth.json');

console.log(db.findVerse);

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
  console.log('running')
  logger.info('Connected');
  logger.info('Logged in as: ');
  logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
  // Our bot needs to know if it will execute a command
  // It will listen for messages that will start with `!`
  if (message.substring(0, 1) == '!') {
    let args = message.substring(1).split(' ');
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
      case 'verse':
        console.log('this is the function itself', db.findVerse);
        break;
      // Just add any case commands if you want to..
    }
  }
});
