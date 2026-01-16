require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Main Menu Keyboard
const mainMenu = Markup.keyboard([
    ['🚀 My Services', '📞 Contact Support'], // First row
    ['ℹ️ About Bot', '🌐 Visit Website']      // Second row
]).resize(); // .resize() makes the buttons fit the screen nicely

// Command: /start
bot.start((ctx) => {
    ctx.reply('Welcome! Use the menu below to navigate:', mainMenu);
});

// Handle button clicks
bot.hears('🚀 My Services', (ctx) => {
    ctx.reply('Here are my services: \n1. AI Chat \n2. Data Analysis \n3. Automation');
});

bot.hears('📞 Contact Support', (ctx) => {
    ctx.reply('You can reach support at @YourUsername');
});

bot.hears('ℹ️ About Bot', (ctx) => {
    ctx.reply('I am a custom bot built with Node.js and hosted on Railway!');
});

bot.hears('🌐 Visit Website', (ctx) => {
    ctx.reply('Visit us at: https://example.com');
});

// Launch bot
bot.launch();
console.log("Bot updated and listening...");

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
