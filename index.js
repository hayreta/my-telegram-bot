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

// Helper to delete the inline menu if it exists
const cleanMenu = async (ctx) => {
    if (ctx.session?.menuId) {
        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.session.menuId);
            ctx.session.menuId = null;
        } catch (e) { /* ignore error if already deleted */ }
    }
};

bot.start((ctx) => {
    ctx.session = null;
    ctx.reply('🌟 Hello! Welcome to Zahara Safa.', mainMenu);
});

bot.hears(config.buttons.addProduct, async (ctx) => {
    ctx.session = { state: 'WAITING_NAME' };
    await ctx.reply('✍🏻 የምርትዎን ስም ያስገቡ (ግልፅ ይሁን)።', Markup.keyboard([[config.buttons.cancel]]).resize());
});

// --- Inline Navigation (with cleaning) ---
bot.action('cancel_flow', async (ctx) => {
    ctx.session = null;
    await ctx.deleteMessage(); // Remove the inline menu
    ctx.reply('❌ Post Cancelled.', mainMenu);
});

bot.action('back_to_name', async (ctx) => {
    ctx.session.state = 'WAITING_NAME';
    await ctx.deleteMessage();
    ctx.reply('✍🏻 የምርትዎን ስም ያስገቡ (ግልፅ ይሁን)።');
});

bot.action('back_to_cat', async (ctx) => {
    ctx.session.state = 'WAITING_CATEGORY';
    // Edit existing message instead of sending new one
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
    await ctx.deleteMessage(); // THIS REMOVES THE INLINE BUTTONS
    ctx.reply('📷 Image: የምርትዎን የሽፋን ፎቶ ያስገቡ።', Markup.keyboard([[config.buttons.back, config.buttons.cancel]]).resize());
});

// --- Message Handlers ---
bot.on('message', async (ctx) => {
    if (!ctx.session) return;
    
    // If the user types anything while an inline menu is open, delete the menu
    await cleanMenu(ctx);

    const state = ctx.session.state;
    const text = ctx.message.text;

    if (text === config.buttons.cancel) {
        ctx.session = null;
        return ctx.reply('❌ Cancelled.', mainMenu);
    }

    if (state === 'WAITING_NAME') {
        ctx.session.name = text;
        ctx.session.state = 'WAITING_CATEGORY';
        // Save the message ID of the inline menu
        const sentMsg = await ctx.reply('📂 Main Category: ይምረጡ።', Markup.inlineKeyboard(config.categories));
        ctx.session.menuId = sentMsg.message_id;
    } 
    else if (state === 'WAITING_IMAGE') {
        if (!ctx.message.photo) return ctx.reply('❌ እባክዎ ፎቶ ብቻ ይላኩ።');
        ctx.session.photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        ctx.session.state = 'WAITING_DESC';
        ctx.reply('✍️ Description: ስለ ምርትዎ ተጨማሪ መረጃ ይስጡ።\n\n⚠️ ፎቶ አይፈቀድም!');
    } 
    else if (state === 'WAITING_DESC') {
        if (ctx.message.photo) return ctx.reply('❌ Description በፅሁፍ ብቻ ይላኩ!');
        ctx.session.desc = text;
        ctx.session.state = 'WAITING_PRICE';
        ctx.reply('💵 Price: የምርትዎን ዋጋ ያስገቡ።');
    } 
    else if (state === 'WAITING_PRICE') {
        if (isNaN(text)) return ctx.reply('❌ ዋጋውን በቁጥር ብቻ ያስገቡ።');
        ctx.session.price = text;
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
