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

bot.start((ctx) => {
    ctx.session = null;
    ctx.reply('🌟 Hello! Welcome to Zahara Safa.', mainMenu);
});

// --- Start Add Product Flow ---
bot.hears(config.buttons.addProduct, (ctx) => {
    ctx.session = { state: 'WAITING_NAME' };
    ctx.reply('✍🏻 የምርትዎን ስም ያስገቡ (ግልፅ ይሁን)።', Markup.keyboard([[config.buttons.cancel]]).resize());
});

// --- Handle Text Inputs ---
bot.on('text', async (ctx) => {
    if (!ctx.session) return;
    const text = ctx.message.text;

    if (text === config.buttons.cancel) {
        ctx.session = null;
        return ctx.reply('❌ Cancelled.', mainMenu);
    }

    if (ctx.session.state === 'WAITING_NAME') {
        ctx.session.name = text;
        ctx.session.state = 'WAITING_CATEGORY';
        await ctx.reply(`📂 Main Category: ይምረጡ (ለምሳሌ፡ 'Electronics')።`, 
            Markup.inlineKeyboard(config.categories));
    } else if (ctx.session.state === 'WAITING_DESC') {
        ctx.session.desc = text;
        ctx.session.state = 'WAITING_PRICE';
        ctx.reply('💵 Price: የምርትዎን ዋጋ ያስገቡ።');
    } else if (ctx.session.state === 'WAITING_PRICE') {
        ctx.session.price = text;
        ctx.session.state = 'WAITING_CONTACT';
        ctx.reply('📱 ለመቀጠል የስልክ ቁጥርዎን ያጋሩ።', 
            Markup.keyboard([[Markup.button.contactRequest(config.buttons.shareContact)], [config.buttons.cancel]]).resize());
    }
});

// --- Handle Inline Button Clicks (Actions) ---
bot.action(/^cat_(.+)$/, async (ctx) => {
    const category = ctx.match[1];
    ctx.session.category = category;
    ctx.session.state = 'WAITING_SUB';
    
    const subs = config.subCategories[category] || [[{ text: 'General', callback_data: 'sub_General' }]];
    
    await ctx.editMessageText(`📂 Sub Category: ይምረጡ (ለምሳሌ፡ Accessories )።`, 
        Markup.inlineKeyboard(subs));
});

bot.action(/^sub_(.+)$/, async (ctx) => {
    ctx.session.subCategory = ctx.match[1];
    ctx.session.state = 'WAITING_IMAGE';
    await ctx.deleteMessage(); // Clean up the inline menu
    ctx.reply('📷 Image: የምርትዎን የሽፋን ፎቶ ያስገቡ። (1 ይሁን)');
});

// --- Handle Photo Input ---
bot.on('photo', async (ctx) => {
    if (ctx.session?.state === 'WAITING_IMAGE') {
        ctx.session.photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        ctx.session.state = 'WAITING_DESC';
        ctx.reply('✍️ Description: ስለ ምርትዎ ተጨማሪ መረጃ ይስጡ።');
    }
});

// --- Handle Contact Input ---
bot.on('contact', async (ctx) => {
    if (ctx.session?.state === 'WAITING_CONTACT') {
        const phone = ctx.message.contact.phone_number;
        const { name, category, subCategory, photoId, desc, price } = ctx.session;
        const user = ctx.from.username ? `@${ctx.from.username}` : 'Not Set';

        const caption = `🏷 #${category}|#${subCategory}\n<b>${name}</b>\n\n<i>${desc}</i>\n` +
                        `──────\n🛒 Shop More at @halal_order\n\n` +
                        `📍 User: ${user}\n📞 Phone: ${phone}\n💰 <b>Price: ${price}</b>`;

        await ctx.telegram.sendPhoto(config.channelId, photoId, { caption, parse_mode: 'HTML' });
        ctx.session = null;
        ctx.reply('✅ ምርትዎ በተሳካ ሁኔታ ተለጥፏል!', mainMenu);
    }
});

bot.launch();
