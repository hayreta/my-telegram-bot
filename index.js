require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

const divider = '━━━━━━━━━━━━━━━━━━━━';

// --- MAIN MENU ---
const mainMenu = Markup.keyboard([
    [config.buttons.myProducts, config.buttons.addProduct],
    [config.buttons.preferences, config.buttons.account],
    [config.buttons.contactUs]
]).resize();

// --- START COMMAND (REGISTRATION FLOW) ---
bot.start((ctx) => {
    if (ctx.session?.registered) {
        return ctx.reply(`እንኳን ደህና መጡ ${ctx.session.realName}!`, mainMenu);
    }
    ctx.session = { state: 'REG_NAME' };
    ctx.reply('🌟 እንኳን ወደ ዛህራ ሳፋ መገበያያ ቦት በሰላም መጡ!\n\nለመቀጠል እባክዎ **ሙሉ ስምዎን** ያስገቡ፡');
});

// --- MESSAGE HANDLER (REGISTRATION & PRODUCT POSTING) ---
bot.on('message', async (ctx) => {
    const text = ctx.message.text;
    const state = ctx.session?.state;

    // --- REGISTRATION LOGIC ---
    if (state === 'REG_NAME') {
        ctx.session.realName = text;
        ctx.session.state = 'REG_PHONE';
        return ctx.reply(`ደስ የሚል ስም ነው ${text}! አሁን ደግሞ ስልክ ቁጥርዎን ያጋሩን፡`, 
            Markup.keyboard([[Markup.button.contactRequest(config.buttons.shareContact)]]).resize().oneTime());
    }

    if (state === 'REG_PHONE' && ctx.message.contact) {
        ctx.session.phone = ctx.message.contact.phone_number;
        ctx.session.registered = true;
        ctx.session.state = null;
        return ctx.reply('✅ ምዝገባ ተጠናቅቋል! አሁን ምርት መለጠፍ ይችላሉ።', mainMenu);
    }

    // --- PRODUCT POSTING LOGIC ---
    if (text === config.buttons.addProduct) {
        if (!ctx.session?.registered) return ctx.reply('እባክዎ መጀመሪያ /start በማለት ይመዝገቡ።');
        ctx.session.state = 'WAITING_PROD_NAME';
        return ctx.reply('✍🏻 የምርትዎን ስም ያስገቡ፡', Markup.keyboard([[config.buttons.cancel]]).resize());
    }

    if (text === config.buttons.cancel) {
        ctx.session.state = null;
        return ctx.reply('ተሰርዟል', mainMenu);
    }

    switch (state) {
        case 'WAITING_PROD_NAME':
            ctx.session.prodName = text;
            ctx.session.state = 'WAITING_CAT';
            return ctx.reply('📂 ምድብ ይምረጡ፡', Markup.inlineKeyboard(config.categories));

        case 'WAITING_IMAGE':
            if (!ctx.message.photo) return ctx.reply('❌ እባክዎ ፎቶ ይላኩ።');
            ctx.session.photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            ctx.session.state = 'WAITING_DESC';
            return ctx.reply('✍️ ስለ ምርቱ ዝርዝር መግለጫ ይጻፉ፡');

        case 'WAITING_DESC':
            ctx.session.desc = text;
            ctx.session.state = 'WAITING_PRICE';
            return ctx.reply('💵 ዋጋ ያስገቡ (በቁጥር ብቻ)፡');

        case 'WAITING_PRICE':
            if (isNaN(text)) return ctx.reply('❌ እባክዎ ቁጥር ብቻ ያስገቡ።');
            ctx.session.price = text;
            return sendToAdmin(ctx);
    }
});

// --- INLINE BUTTONS ---
bot.action(/^cat_(.+)$/, async (ctx) => {
    ctx.session.category = ctx.match[1];
    ctx.session.state = 'WAITING_SUB';
    const subs = config.subCategories[ctx.session.category] || [[{ text: 'General', callback_data: 'sub_General' }]];
    await ctx.editMessageText('📂 ንዑስ ምድብ ይምረጡ፡', Markup.inlineKeyboard(subs));
});

bot.action(/^sub_(.+)$/, async (ctx) => {
    ctx.session.subCategory = ctx.match[1];
    ctx.session.state = 'WAITING_IMAGE';
    await ctx.deleteMessage();
    ctx.reply('📷 የምርቱን ፎቶ ይላኩ፡');
});

// --- ADMIN REVIEW FUNCTION ---
async function sendToAdmin(ctx) {
    const { prodName, category, subCategory, photoId, desc, price, phone, realName } = ctx.session;
    
    const adminCaption = `🔍 <b>አዲስ ምርት ለግምገማ</b>\n${divider}\n` +
                         `🛒 <b>Item:</b> ${prodName}\n` +
                         `📝 <i>${desc}</i>\n` +
                         `💰 <b>Price:</b> ${price} ETB\n` +
                         `👤 <b>Seller:</b> ${realName}\n` +
                         `📞 <b>Phone:</b> ${phone}\n` +
                         `📂 <b>Cat:</b> #${category}`;

    await ctx.telegram.sendPhoto(config.adminId, photoId, {
        caption: adminCaption,
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ ፍቀድ (Approve)', `approve_${ctx.from.id}`)],
            [Markup.button.callback('❌ አትፍቀድ (Reject)', `reject_${ctx.from.id}`)]
        ])
    });

    ctx.session.state = null;
    await ctx.reply('⏳ ምርትዎ ለአስተዳዳሪ ተልኳል። ሲፈቀድ ይለጠፋል!', mainMenu);
}

// --- ADMIN ACTIONS ---
bot.action(/^approve_(\d+)$/, async (ctx) => {
    if (ctx.from.id !== config.adminId) return;
    const userId = ctx.match[1];
    const photoId = ctx.callbackQuery.message.photo[ctx.callbackQuery.message.photo.length - 1].file_id;
    const finalCaption = ctx.callbackQuery.message.caption.replace('🔍 አዲስ ምርት ለግምገማ', '🛍 <b>አዲስ ምርት</b>') + `\n${divider}\n🛒 @hayre37`;

    await ctx.telegram.sendPhoto(config.channelId, photoId, { caption: finalCaption, parse_mode: 'HTML' });
    await ctx.editMessageCaption('✅ ተለጥፏል!');
    await bot.telegram.sendMessage(userId, "🎉 ምርትዎ በቻናሉ ላይ ተለጥፏል!");
});

bot.launch();
