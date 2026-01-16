require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const config = require('./config');

if (!process.env.BOT_TOKEN) {
    console.error("BOT_TOKEN is missing!");
    process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// Use session to prevent crashes during the "Add Product" flow
bot.use(session());

const mainMenu = Markup.keyboard([
    [config.buttons.myProducts, config.buttons.addProduct],
    [config.buttons.preferences, config.buttons.account],
    [config.buttons.contactUs, config.buttons.schedulePost],
    [config.buttons.browseProducts]
]).resize();

// --- 1. Start Command ---
bot.start((ctx) => {
    ctx.session = null; // Reset any active flow
    ctx.reply('🌟 Hello! Welcome to Zahara Safa Marketplace.', mainMenu);
});

// --- 2. Start Add Product Flow ---
bot.hears(config.buttons.addProduct, (ctx) => {
    ctx.session = { state: 'WAITING_NAME' };
    ctx.reply('✍🏻 የምርትዎን ስም ያስገቡ (ግልፅ ይሁን)።', Markup.keyboard([[config.buttons.cancel]]).resize());
});

// --- 3. Main Logic Handler ---
bot.on('message', async (ctx) => {
    if (!ctx.session) return; // Ignore messages if not in a flow

    const text = ctx.message.text;
    if (text === config.buttons.cancel) {
        ctx.session = null;
        return ctx.reply('❌ Cancelled.', mainMenu);
    }

    switch (ctx.session.state) {
        case 'WAITING_NAME':
            ctx.session.name = text;
            ctx.session.state = 'WAITING_CATEGORY';
            ctx.reply(`📂 Main Category: ይምረጡ (ለምሳሌ፡ 'Electronics')።`, 
                Markup.keyboard([...config.categories.map(c => [c]), [config.buttons.cancel]]).resize());
            break;

        case 'WAITING_CATEGORY':
            ctx.session.category = text;
            ctx.session.state = 'WAITING_SUB';
            const subs = config.subCategories[text] || ['General'];
            ctx.reply(`📂 Sub Category: ይምረጡ (ለምሳሌ፡ Accessories )።`, 
                Markup.keyboard([...subs.map(s => [s]), [config.buttons.back, config.buttons.cancel]]).resize());
            break;

        case 'WAITING_SUB':
            ctx.session.state = 'WAITING_IMAGE';
            ctx.reply('📷 Image: የምርትዎን የሽፋን ፎቶ ያስገቡ። (1 ይሁን)\n\nPlease ensure the width of image is greater than or equal to the height.');
            break;

        case 'WAITING_IMAGE':
            if (!ctx.message.photo) return ctx.reply('እባክዎ የምርቱን ፎቶ ይላኩ።');
            ctx.session.photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            ctx.session.state = 'WAITING_DESC';
            ctx.reply('✍️ Description: ስለ ምርትዎ ተጨማሪ መረጃ ይስጡ።\n\nስልክ ቁጥር እና ማንኛውም Link አይፈቀድም');
            break;

        case 'WAITING_DESC':
            ctx.session.desc = text;
            ctx.session.state = 'WAITING_PRICE';
            ctx.reply('💵 Price: የምርትዎን ዋጋ ያስገቡ።');
            break;

        case 'WAITING_PRICE':
            const finalPrice = text;
            const { name, category, photoId, desc } = ctx.session;
            const user = ctx.from.username ? `@${ctx.from.username}` : 'Not Set';

            const caption = `🏷 #${category.split(' ').pop()}\n<b>${name}</b>\n\n<i>${desc}</i>\n` +
                            `──────\n🛒 <a href="https://t.me/${ctx.botInfo.username}">Shop More</a>\n\n` +
                            `📍 User: ${user}\n💰 <b>Price: ${finalPrice}</b>`;

            try {
                await ctx.telegram.sendPhoto(config.channelId, photoId, { caption, parse_mode: 'HTML' });
                ctx.reply('✅ ምርትዎ በተሳካ ሁኔታ ተለጥፏል!', mainMenu);
            } catch (e) {
                ctx.reply('❌ Error: Bot must be Admin in @hayre37 channel.', mainMenu);
            }
            ctx.session = null;
            break;
    }
});

bot.launch().then(() => console.log("✅ Marketplace Bot is online!"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
