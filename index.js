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
    ctx.reply('🌟 Hello! Welcome to Zahara Safa Marketplace.', mainMenu);
});

// --- Start Flow ---
bot.hears(config.buttons.addProduct, (ctx) => {
    ctx.session = { state: 'WAITING_NAME' };
    ctx.reply('✍🏻 የምርትዎን ስም ያስገቡ (ግልፅ ይሁን)።', Markup.keyboard([[config.buttons.cancel]]).resize());
});

// --- INLINE BUTTON ACTIONS (Back & Cancel) ---
bot.action('cancel_flow', (ctx) => {
    ctx.session = null;
    ctx.editMessageText('❌ Cancelled.');
    ctx.reply('Returned to Main Menu', mainMenu);
});

bot.action('back_to_start', (ctx) => {
    ctx.session.state = 'WAITING_NAME';
    ctx.deleteMessage();
    ctx.reply('✍🏻 የምርትዎን ስም ያስገቡ (ግልፅ ይሁን)።');
});

bot.action('back_to_cat', async (ctx) => {
    ctx.session.state = 'WAITING_CATEGORY';
    await ctx.editMessageText(`📂 Main Category: ይምረጡ።`, Markup.inlineKeyboard(config.categories));
});

bot.action(/^cat_(.+)$/, async (ctx) => {
    const category = ctx.match[1];
    ctx.session.category = category;
    ctx.session.state = 'WAITING_SUB';
    const subs = config.subCategories[category] || [[{ text: 'General', callback_data: 'sub_General' }, { text: '⬅️ Back', callback_data: 'back_to_cat' }]];
    await ctx.editMessageText(`📂 Sub Category: ይምረጡ።`, Markup.inlineKeyboard(subs));
});

bot.action(/^sub_(.+)$/, async (ctx) => {
    ctx.session.subCategory = ctx.match[1];
    ctx.session.state = 'WAITING_IMAGE';
    await ctx.deleteMessage();
    ctx.reply('📷 Image: የምርትዎን የሽፋን ፎቶ ያስገቡ። (ፎቶ መሆን አለበት!)');
});

// --- TEXT & PHOTO VALIDATION ---
bot.on('message', async (ctx) => {
    if (!ctx.session) return;
    const text = ctx.message.text;

    // Global Cancel
    if (text === config.buttons.cancel) {
        ctx.session = null;
        return ctx.reply('❌ Cancelled.', mainMenu);
    }

    switch (ctx.session.state) {
        case 'WAITING_NAME':
            ctx.session.name = text;
            ctx.session.state = 'WAITING_CATEGORY';
            ctx.reply(`📂 Main Category: ይምረጡ።`, Markup.inlineKeyboard(config.categories));
            break;

        case 'WAITING_IMAGE':
            if (!ctx.message.photo) return ctx.reply('❌ እባክዎ የምርቱን ፎቶ (Image) ብቻ ይላኩ!');
            ctx.session.photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            ctx.session.state = 'WAITING_DESC';
            ctx.reply('✍️ Description: ስለ ምርትዎ ተጨማሪ መረጃ ይስጡ።');
            break;

        case 'WAITING_DESC':
            ctx.session.desc = text;
            ctx.session.state = 'WAITING_PRICE';
            ctx.reply('💵 Price: የምርትዎን ዋጋ ያስገቡ (በቁጥር ብቻ)።');
            break;

        case 'WAITING_PRICE':
            // Validation: Ensure Price is a number
            if (isNaN(text)) return ctx.reply('❌ እባክዎ ዋጋውን በቁጥር ብቻ ያስገቡ (ለምሳሌ: 500)።');
            ctx.session.price = text;
            ctx.session.state = 'WAITING_CONTACT';
            ctx.reply('📱 ለመቀጠል የስልክ ቁጥርዎን ያጋሩ።', 
                Markup.keyboard([[Markup.button.contactRequest(config.buttons.shareContact)], [config.buttons.cancel]]).resize());
            break;

        case 'WAITING_CONTACT':
            if (!ctx.message.contact) return ctx.reply('❌ እባክዎ "Share Your Contact" የሚለውን በተን ይጫኑ።');
            const phone = ctx.message.contact.phone_number;
            const { name, category, subCategory, photoId, desc, price } = ctx.session;
            const user = ctx.from.username ? `@${ctx.from.username}` : 'Not Set';

            const caption = `🏷 #${category}|#${subCategory}\n<b>${name}</b>\n\n<i>${desc}</i>\n` +
                            `──────\n🛒 Shop @halal_order\n\n` +
                            `📍 User: ${user}\n📞 Phone: ${phone}\n💰 <b>Price: ${price} ETB</b>`;

            await ctx.telegram.sendPhoto(config.channelId, photoId, { caption, parse_mode: 'HTML' });
            ctx.session = null;
            ctx.reply('✅ ምርትዎ በተሳካ ሁኔታ ተለጥፏል!', mainMenu);
            break;
    }
});

bot.launch();
