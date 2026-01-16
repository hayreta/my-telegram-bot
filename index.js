require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

// 1. Safety Check for Token
if (!process.env.BOT_TOKEN) {
    console.error("CRITICAL ERROR: BOT_TOKEN is missing in Railway Variables!");
    process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// 2. Create the Keyboard
const mainMenu = Markup.keyboard([
    ['📦 My Products', '🛒 Post Product'],
    ['⭐ Preferences', '👤 Account'],
    ['📞 Contact Us', '📅 Schedule Post'],
    ['🔍 Browse Products']
]).resize();

// 3. Start Command with your Amharic Text
bot.start((ctx) => {
    const userName = ctx.from.first_name || "user";
    const welcome = `🌟 Hello ${userName}!\n\nየቦቱን አማራጮች እንዴት መጠቀም ይቻላል?\n\n📦 **My Products**\n👉 የእርስዎን ምርቶች ይዩ።\n\n🛒 **Post Product**\n👉 አዲስ ምርት ለመለጠፍ።\n\n📣 Join : @halal_order`;
    
    // Using simple reply to avoid Markdown formatting crashes
    return ctx.reply(welcome, mainMenu);
});

// 4. Basic Listeners
bot.hears('📦 My Products', (ctx) => ctx.reply('Your products list will appear here.'));
bot.hears('📞 Contact Us', (ctx) => ctx.reply('Contact us at @halal_order'));

// 5. Launch with Error Catching
bot.launch()
    .then(() => console.log("✅ Bot is online and working!"))
    .catch((err) => {
        console.error("❌ Failed to connect to Telegram:", err.message);
        process.exit(1);
    });

// Handle graceful stops
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
