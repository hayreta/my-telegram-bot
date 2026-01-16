require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- Custom Keyboard Layout ---
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

// --- Button Handlers ---

bot.hears('📦 My Products', (ctx) => {
    ctx.reply('እዚህ የእርስዎን ምርቶች ዝርዝር ማየት ይችላሉ። (Feature coming soon)');
});

bot.hears('🛒 Post Product', (ctx) => {
    ctx.reply('እባክዎ የምርቱን ፎቶ እና ዝርዝር መረጃ ይላኩ።');
});

bot.hears('📞 Contact Us', (ctx) => {
    ctx.reply('ለድጋፍ @halal_order ያግኙን።');
});

// Add more handlers for the other buttons as you build them...

// --- Launch ---
bot.launch().then(() => {
    console.log("E-commerce Bot is live!");
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
