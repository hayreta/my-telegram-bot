require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

// Check if token exists to prevent crash before starting
if (!process.env.BOT_TOKEN) {
    console.error("ERROR: BOT_TOKEN is missing in Environment Variables!");
    process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- Keyboard Layout ---
const mainMenu = Markup.keyboard([
    ['📦 My Products', '🛒 Post Product'],
    ['⭐ Preferences', '👤 Account'],
    ['📞 Contact Us', '📅 Schedule Post'],
    ['🔍 Browse Products']
]).resize();

// --- Start Command ---
bot.start((ctx) => {
    const userName = ctx.from.first_name || "user";
    const welcomeMessage = `🌟 Hello ${userName}!\n\n` +
        `የቦቱን አማራጮች እንዴት መጠቀም ይቻላል?\n\n` +
        `📦 **My Products (የእኔ ምርቶች)**\n` +
        `👉 የእርስዎን ምርቶች ይዩ፣ ፖስት ያድርጉ ወይም ያስወግዱ።\n\n` +
        `🛒 **Post Product (ምርት ለመለጠፍ)**\n` +
        `👉 አዲስ ምርት ለመለጠፍ ይህን በተን ይጠቀሙ።\n\n` +
        `⭐ **Preferences (ምርጫዎች)**\n` +
        `👉 የሚፈልጉት ምርት ፖስት ሲደረግ ለማወቅ ምርጫዎትን ያስቀምጡ።\n\n` +
        `👤 **Account (መለያ)**\n` +
        `👉 የመለያ መረጃዎን ይዩ ወይም ያሻሽሉ።\n\n` +
        `📞 **Contact Us (አግኙን)**\n` +
        `👉 ለጥያቄዎች ወይም ድጋፍ ለማገኘት።\n\n` +
        `📅 **Schedule Post (ምርት ለማስቀመጥ)**\n` +
        `👉 ምርቶችዎን ለወደፊት በራስ-ሰር ፖስት ለማድረግ ይህን በተን ይጠቀሙ!\n\n` +
        `🔍 **Browse Products (ምርቶችን ይፈልጉ)**\n` +
        `👉 የተለያዩ ምርቶችን ይፈልጉ ወይም ወደ አፕ ይሂዱ እና ይግዙ።\n\n` +
        `📣 Join : @halal_order`;

    ctx.replyWithMarkdown(welcomeMessage, mainMenu);
});

// --- Simple Handlers to prevent empty response ---
bot.hears('📦 My Products', (ctx) => ctx.reply('Feature coming soon!'));
bot.hears('📞 Contact Us', (ctx) => ctx.reply('Contact us at @halal_order'));

// --- Error Handling ---
bot.catch((err, ctx) => {
    console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
});

// --- Launch ---
bot.launch()
    .then(() => console.log("Bot is running successfully on Railway!"))
    .catch((err) => console.error("Failed to launch bot:", err));

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
