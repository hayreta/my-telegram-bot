require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

const mainMenu = Markup.keyboard([
    [config.buttons.myProducts, config.buttons.addProduct],
    [config.buttons.preferences, config.buttons.account],
    [config.buttons.contactUs, config.buttons.schedulePost],
    [config.buttons.browseProducts]
]).resize();

// --- 🛒 Start Add Product Flow ---
bot.hears(config.buttons.addProduct, (ctx) => {
    ctx.session = { state: 'WAITING_NAME' };
    ctx.reply('✍🏻 የምርትዎን ስም ያስገቡ (ግልፅ ይሁን)።', Markup.keyboard([[config.buttons.cancel]]).resize());
});

bot.on('message', async (ctx) => {
    const currentState = ctx.session?.state;
    const text = ctx.message.text;

    if (text === config.buttons.cancel) {
        ctx.session = null;
        return ctx.reply('❌ Cancelled.', mainMenu);
    }

    switch (currentState) {
        case 'WAITING_NAME':
            ctx.session.name = text;
            ctx.session.state = 'WAITING_CATEGORY';
            ctx.reply('📂 Main Category: ይምረጡ (ለምሳሌ፡ \'Electronics\')።', 
                Markup.keyboard([...config.categories.map(c => [c]), [config.buttons.back, config.buttons.cancel]]).resize());
            break;

        case 'WAITING_CATEGORY':
            ctx.session.category = text;
            ctx.session.state = 'WAITING_SUB';
            const subs = config.subCategories[text] || ['General'];
            ctx.reply(`📂 Sub Category: ይምረጡ (ለምሳሌ፡ Accessories )።`, 
                Markup.keyboard([...subs.map(s => [s]), [config.buttons.back, config.buttons.cancel]]).resize());
            break;

        case 'WAITING_SUB':
            ctx.session.subCategory = text;
            ctx.session.state = 'WAITING_IMAGE';
            ctx.reply('📷 Image: የምርትዎን የሽፋን ፎቶ ያስገቡ። (1 ይሁን)\n\nPlease ensure the width of image is greater than height.', 
                Markup.keyboard([[config.buttons.back, config.buttons.cancel]]).resize());
            break;

        case 'WAITING_IMAGE':
            if (!ctx.message.photo) return ctx.reply('Please send an actual photo.');
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
            const price = text;
            const { name, category, subCategory, photoId, desc } = ctx.session;
            const username = ctx.from.username ? `@${ctx.from.username}` : 'Not Set';

            const postText = `🏷 #${category.replace(/[^a-zA-Z]/g, "")}|#${subCategory.replace(/[^a-zA-Z]/g, "")}\n` +
                             `<b>${name}</b>\n\n` +
                             `<i>${desc}</i>\n` +
                             `──────\n` +
                             `🛒 <a href="https://t.me/${ctx.botInfo.username}">Shop More</a>\n\n` +
                             `📍 User: ${username}\n` +
                             `💰 <b>Price: ${price}</b>`;

            // Post to Channel
            await ctx.telegram.sendPhoto(config.channelId, photoId, { caption: postText, parse_mode: 'HTML' });
            
            ctx.session = null;
            ctx.reply('✅ ምርትዎ በተሳካ ሁኔታ ተለጥፏል!', mainMenu);
            break;
    }
});

bot.launch().then(() => console.log("Marketplace Bot Live!"));
