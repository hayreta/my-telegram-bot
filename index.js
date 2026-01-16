require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Create the Keyboard using the config file
const mainMenu = Markup.keyboard([
    [config.buttons.myProducts, config.buttons.postProduct],
    [config.buttons.preferences, config.buttons.account],
    [config.buttons.contactUs, config.buttons.schedulePost],
    [config.buttons.browseProducts]
]).resize();

// Start Command
bot.start((ctx) => ctx.reply(config.replies.welcome, mainMenu));

// --- Button Logic ---

bot.hears(config.buttons.myProducts, (ctx) => ctx.reply(config.replies.myProducts));

bot.hears(config.buttons.postProduct, (ctx) => ctx.reply(config.replies.postProduct));

bot.hears(config.buttons.preferences, (ctx) => ctx.reply(config.replies.preferences));

bot.hears(config.buttons.account, (ctx) => ctx.reply(config.replies.account));

bot.hears(config.buttons.contactUs, (ctx) => ctx.reply(config.replies.contactUs));

bot.hears(config.buttons.schedulePost, (ctx) => ctx.reply(config.replies.schedulePost));

bot.hears(config.buttons.browseProducts, (ctx) => ctx.reply(config.replies.browseProducts));

// Launch the bot
bot.launch().then(() => console.log("Bot is active with custom buttons!"));

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
