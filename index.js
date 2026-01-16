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

// Navigation Keyboard (Used during the flow)
const navKeyboard = Markup.keyboard([
    [config.buttons.back, config.buttons.cancel]
]).resize();

bot.start((ctx) => {
    ctx.session = null;
    ctx.reply('🌟 Hello! Welcome to Zahara Safa.', mainMenu);
});

// --- Start Flow ---
bot.hears(config.buttons.addProduct, async (ctx) => {
    ctx.session = { state: 'WAITING_NAME' };
    await ctx.reply('✍🏻 የምርትዎን ስም ያስገቡ (ግልፅ ይሁን)።', Markup.keyboard([[config.buttons.cancel]]).resize());
});

// --- Action Handlers (Inline Selection) ---
bot.action(/^cat_(.+)$/, async (ctx) => {
    ctx.session.category = ctx.match[1];
    ctx.session.state = 'WAITING_SUB';
    const subs = config.subCategories[ctx.session.category] || [[{ text: 'General', callback_data: 'sub_General' }]];
    
    await ctx.editMessageText(`📂 Sub Category: ይምረጡ (Main: ${ctx.session.category})።`, 
        Markup.inlineKeyboard(subs));
});

bot.action(/^sub_(.+)$/, async (ctx) => {
    ctx.session.subCategory = ctx.match[1];
    ctx.session.state = 'WAITING_IMAGE';
    await ctx.deleteMessage(); // Remove inline menu
    ctx.reply('📷 Image: የምርትዎን የሽፋን ፎቶ ያስገቡ።', navKeyboard);
});

// --- Main Message Handler ---
bot.on('message', async (ctx) => {
    if (!ctx.session) return;
    const text = ctx.message.text;

    // 1. GLOBAL CANCEL
    if (text === config.buttons.cancel) {
        ctx.session = null;
        return ctx.reply('❌ Post Cancelled.', mainMenu);
    }

    // 2. GLOBAL BACK LOGIC
    if (text === config.buttons.back) {
        const state = ctx.session.state;
        if (state === 'WAITING_CATEGORY') {
            ctx.session.state = 'WAITING_NAME';
            return ctx.reply('✍🏻 የምርትዎን ስም ያስገቡ።', Markup.keyboard([[config.buttons.cancel]]).resize());
        }
        if (state === 'WAITING_SUB') {
            ctx.session.state = 'WAITING_CATEGORY';
            return ctx.reply('📂 Main Category: ይምረጡ።', Markup.inlineKeyboard(config.categories));
        }
        if (state === 'WAITING_IMAGE') {
            ctx.session.state = 'WAITING_SUB';
            const subs = config.subCategories[ctx.session.category] || [[{ text: 'General', callback_data: 'sub_General' }]];
            return ctx.reply('📂 Sub Category: ይምረጡ።', Markup.inlineKeyboard(subs));
        }
        if (state === 'WAITING_DESC') {
            ctx.session.state = 'WAITING_IMAGE';
            return ctx.reply('📷 Image: የምርትዎን የሽፋን ፎቶ ያስገቡ።', navKeyboard);
        }
    }

    // 3. STEP LOGIC
    switch (ctx.session.state) {
        case 'WAITING_NAME':
            ctx.session.name = text;
            ctx.session.state = 'WAITING_CATEGORY';
            ctx.reply('📂 Main Category: ይምረጡ።', {
                ...Markup.inlineKeyboard(config.categories),
                ...navKeyboard // Keep Back/Cancel at the bottom
            });
            break;

        case 'WAITING_IMAGE':
            if (!ctx.message.photo) return ctx.reply('❌ እባክዎ ፎቶ ብቻ ይላኩ።');
            ctx.session.photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            ctx.session.state = 'WAITING_DESC';
            ctx.reply('✍️ Description: ስለ ምርትዎ ተጨማሪ መረጃ ይስጡ።', navKeyboard);
            break;

        case 'WAITING_DESC':
            if (ctx.message.photo) return ctx.reply('❌ Description በፅሁፍ ብቻ ይላኩ!');
            ctx.session.desc = text;
            ctx.session.state = 'WAITING_PRICE';
            ctx.reply('💵 Price: የምርትዎን ዋጋ ያስገቡ።', navKeyboard);
            break;

        case 'WAITING_PRICE':
            if (isNaN(text)) return ctx.reply('❌ ዋጋውን በቁጥር ብቻ ያስገቡ።');
            ctx.session.price = text;
            ctx.session.state = 'WAITING_CONTACT';
            ctx.reply('📱 ስልክ ቁጥርዎን ያጋሩ።', 
                Markup.keyboard([[Markup.button.contactRequest(config.buttons.shareContact)], [config.buttons.cancel]]).resize());
            break;
    }
});

// --- Contact Handler ---
bot.on('contact', async (ctx) => {
    if (ctx.session?.state === 'WAITING_CONTACT') {
        const { name, category, subCategory, photoId, desc, price } = ctx.session;
        const caption = `<b>${name}</b>\n\n<i>${desc}</i>\n──────\n📍 User: @${ctx.from.username || 'User'}\n📞 Phone: ${ctx.message.contact.phone_number}\n💰 <b>Price: ${price} ETB</b>`;
        
        await ctx.telegram.sendPhoto(config.channelId, photoId, { caption, parse_mode: 'HTML' });
        ctx.session = null;
        ctx.reply('✅ ምርትዎ በተሳካ ሁኔታ ተለጥፏል!', mainMenu);
    }
});

bot.launch();
