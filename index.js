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

// Bottom navigation during posting
const navKeyboard = Markup.keyboard([[config.buttons.back, config.buttons.cancel]]).resize();

bot.start((ctx) => ctx.reply('🌟 Welcome to Zahara Safa.', mainMenu));

bot.hears(config.buttons.addProduct, (ctx) => {
    ctx.session = { state: 'WAITING_NAME' };
    ctx.reply('✍🏻 የምርትዎን ስም ያስገቡ (ግልፅ ይሁን)።', Markup.keyboard([[config.buttons.cancel]]).resize());
});

// --- Action Handlers for Inline Buttons ---
bot.action(/^cat_(.+)$/, async (ctx) => {
    const category = ctx.match[1];
    ctx.session.category = category;
    ctx.session.state = 'WAITING_SUB';
    
    const subs = config.subCategories[category] || [[{ text: 'General', callback_data: 'sub_General' }]];
    
    await ctx.editMessageText(`📂 Sub Category: ይምረጡ (Main: ${category})`, 
        Markup.inlineKeyboard(subs));
});

bot.action(/^sub_(.+)$/, async (ctx) => {
    ctx.session.subCategory = ctx.match[1];
    ctx.session.state = 'WAITING_IMAGE';
    await ctx.deleteMessage(); // Remove inline menu
    ctx.reply('📷 Image: የምርትዎን የሽፋን ፎቶ ያስገቡ።', navKeyboard);
});

// --- Message Listener ---
bot.on('message', async (ctx) => {
    if (!ctx.session) return;
    const text = ctx.message.text;

    if (text === config.buttons.cancel) {
        ctx.session = null;
        return ctx.reply('❌ Cancelled.', mainMenu);
    }

    // Back Logic
    if (text === config.buttons.back) {
        if (ctx.session.state === 'WAITING_CATEGORY') {
            ctx.session.state = 'WAITING_NAME';
            return ctx.reply('✍🏻 የምርትዎን ስም ያስገቡ።', Markup.keyboard([[config.buttons.cancel]]).resize());
        }
        if (ctx.session.state === 'WAITING_IMAGE') {
            ctx.session.state = 'WAITING_CATEGORY';
            return ctx.reply('📂 Main Category: ይምረጡ።', Markup.inlineKeyboard(config.categories));
        }
    }

    // State Logic
    if (ctx.session.state === 'WAITING_NAME') {
        ctx.session.name = text;
        ctx.session.state = 'WAITING_CATEGORY';
        // FIXED: This ensures the Inline Keyboard shows UP with the Nav Keyboard
        await ctx.reply('Menu updated.', navKeyboard);
        return ctx.reply('📂 Main Category: ይምረጡ።', Markup.inlineKeyboard(config.categories));
    }

    if (ctx.session.state === 'WAITING_IMAGE') {
        if (!ctx.message.photo) return ctx.reply('❌ እባክዎ ፎቶ ይላኩ።');
        ctx.session.photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        ctx.session.state = 'WAITING_DESC';
        ctx.reply('✍️ Description: ስለ ምርትዎ ተጨማሪ መረጃ ይስጡ።', navKeyboard);
    }

    else if (ctx.session.state === 'WAITING_DESC') {
        if (ctx.message.photo) return ctx.reply('❌ ጽሁፍ ብቻ ያስገቡ።');
        ctx.session.desc = text;
        ctx.session.state = 'WAITING_PRICE';
        ctx.reply('💵 Price: የምርትዎን ዋጋ ያስገቡ።', navKeyboard);
    }

    else if (ctx.session.state === 'WAITING_PRICE') {
        if (isNaN(text)) return ctx.reply('❌ ዋጋ በቁጥር ብቻ!');
        ctx.session.price = text;
        ctx.session.state = 'WAITING_CONTACT';
        ctx.reply('📱 ስልክ ቁጥርዎን ያጋሩ።', 
            Markup.keyboard([[Markup.button.contactRequest(config.buttons.shareContact)], [config.buttons.cancel]]).resize());
    }
});

// Final Post to Channel
bot.on('contact', async (ctx) => {
    if (ctx.session?.state === 'WAITING_CONTACT') {
        const { name, category, subCategory, photoId, desc, price } = ctx.session;
        const caption = `🏷 #${category}\n<b>${name}</b>\n\n<i>${desc}</i>\n──────\n📍 User: @${ctx.from.username || 'User'}\n📞 Phone: ${ctx.message.contact.phone_number}\n💰 <b>Price: ${price} ETB</b>`;
        
        await ctx.telegram.sendPhoto(config.channelId, photoId, { caption, parse_mode: 'HTML' });
        ctx.session = null;
        ctx.reply('✅ በተሳካ ሁኔታ ተለጥፏል!', mainMenu);
    }
});

bot.launch();
