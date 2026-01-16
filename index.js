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

// --- Start Flow ---
bot.hears(config.buttons.addProduct, (ctx) => {
    ctx.session = { state: 'WAITING_NAME' };
    ctx.reply('✍🏻 የምርትዎን ስም ያስገቡ (ግልፅ ይሁን)።', Markup.keyboard([[config.buttons.cancel]]).resize());
});

// --- Inline Navigation ---
bot.action('cancel_flow', (ctx) => {
    ctx.session = null;
    ctx.editMessageText('❌ Post Cancelled.');
    ctx.reply('Main Menu', mainMenu);
});

bot.action('back_to_name', async (ctx) => {
    ctx.session.state = 'WAITING_NAME';
    await ctx.deleteMessage();
    ctx.reply('✍🏻 የምርትዎን ስም ያስገቡ (ግልፅ ይሁን)።', Markup.keyboard([[config.buttons.cancel]]).resize());
});

bot.action('back_to_cat', async (ctx) => {
    ctx.session.state = 'WAITING_CATEGORY';
    await ctx.editMessageText(`📂 Main Category: ይምረጡ።`, Markup.inlineKeyboard(config.categories));
});

// --- Category/Sub Actions ---
bot.action(/^cat_(.+)$/, async (ctx) => {
    ctx.session.category = ctx.match[1];
    ctx.session.state = 'WAITING_SUB';
    const subs = config.subCategories[ctx.session.category] || [[{ text: 'General', callback_data: 'sub_General' }, { text: '⬅️ Back', callback_data: 'back_to_cat' }]];
    await ctx.editMessageText(`📂 Sub Category: ይምረጡ።`, Markup.inlineKeyboard(subs));
});

bot.action(/^sub_(.+)$/, async (ctx) => {
    ctx.session.subCategory = ctx.match[1];
    ctx.session.state = 'WAITING_IMAGE';
    await ctx.deleteMessage();
    ctx.reply('📷 Image: የምርትዎን የሽፋን ፎቶ ያስገቡ።', Markup.keyboard([[config.buttons.back, config.buttons.cancel]]).resize());
});

// --- Message Handlers ---
bot.on('message', async (ctx) => {
    if (!ctx.session) return;
    const state = ctx.session.state;

    // Handle Back/Cancel from Keyboard
    if (ctx.message.text === config.buttons.cancel) {
        ctx.session = null;
        return ctx.reply('❌ Cancelled.', mainMenu);
    }
    if (ctx.message.text === config.buttons.back) {
        // Logic to go back one step based on current state
        if (state === 'WAITING_IMAGE') {
            ctx.session.state = 'WAITING_CATEGORY';
            return ctx.reply('📂 Main Category:', Markup.inlineKeyboard(config.categories));
        }
    }

    // Step Logic
    if (state === 'WAITING_NAME') {
        ctx.session.name = ctx.message.text;
        ctx.session.state = 'WAITING_CATEGORY';
        // Remove keyboard when showing inline categories
        ctx.reply('📂 Main Category: ይምረጡ።', Markup.inlineKeyboard(config.categories));
    } 
    else if (state === 'WAITING_IMAGE') {
        if (!ctx.message.photo) return ctx.reply('❌ እባክዎ ፎቶ ብቻ ይላኩ።');
        ctx.session.photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        ctx.session.state = 'WAITING_DESC';
        ctx.reply('✍️ Description: ስለ ምርትዎ ተጨማሪ መረጃ ይስጡ።\n\n⚠️ ፎቶ ወይም ሊንክ አይፈቀድም!', Markup.keyboard([[config.buttons.cancel]]).resize());
    } 
    else if (state === 'WAITING_DESC') {
        // STRICT CHECK: Reject if user sends photo instead of text
        if (ctx.message.photo || ctx.message.document) {
            return ctx.reply('❌ እባክዎ የምርት ማብራሪያውን በፅሁፍ (Text) ብቻ ይላኩ። ፎቶ አይፈቀድም!');
        }
        ctx.session.desc = ctx.message.text;
        ctx.session.state = 'WAITING_PRICE';
        ctx.reply('💵 Price: የምርትዎን ዋጋ ያስገቡ (በቁጥር ብቻ)።');
    } 
    else if (state === 'WAITING_PRICE') {
        if (isNaN(ctx.message.text)) return ctx.reply('❌ እባክዎ ዋጋውን በቁጥር ብቻ ያስገቡ (ለምሳሌ: 1500)');
        ctx.session.price = ctx.message.text;
        ctx.session.state = 'WAITING_CONTACT';
        ctx.reply('📱 ስልክ ቁጥርዎን ያጋሩ።', Markup.keyboard([[Markup.button.contactRequest(config.buttons.shareContact)], [config.buttons.cancel]]).resize());
    }
});

// --- Contact Handler ---
bot.on('contact', async (ctx) => {
    if (ctx.session?.state === 'WAITING_CONTACT') {
        const { name, category, subCategory, photoId, desc, price } = ctx.session;
        const caption = `<b>${name}</b>\n\n<i>${desc}</i>\n──────\n📍 User: @${ctx.from.username || 'User'}\n📞 Phone: ${ctx.message.contact.phone_number}\n💰 <b>Price: ${price} ETB</b>`;
        
        await ctx.telegram.sendPhoto(config.channelId, photoId, { caption, parse_mode: 'HTML' });
        ctx.session = null;
        ctx.reply('✅ ተለጥፏል!', mainMenu);
    }
});

bot.launch();
