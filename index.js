require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

const divider = '━━━━━━━━━━━━━━━━━━━━';
const mainMenu = Markup.keyboard([
    [config.buttons.myProducts, config.buttons.addProduct],
    [config.buttons.preferences, config.buttons.account],
    [config.buttons.contactUs, config.buttons.schedulePost],
    [config.buttons.browseProducts]
]).resize();

const navKeyboard = Markup.keyboard([[config.buttons.back, config.buttons.cancel]]).resize();

// --- 🌟 Start ---
bot.start((ctx) => {
    ctx.reply('🌟 <b>እንኳን ወደ ዛህራ ሳፋ መገበያያ ቦት በሰላም መጡ!</b>\n\nእባክዎ ከታች ካሉት አማራጮች አንዱን ይምረጡ።', { 
        parse_mode: 'HTML', 
        ...mainMenu 
    });
});

// --- 🛒 Add Product Entry ---
bot.hears(config.buttons.addProduct, (ctx) => {
    const savedPhone = ctx.session?.phone;
    ctx.session = { state: 'WAITING_NAME', phone: savedPhone };
    ctx.reply('✍🏻 <b>የምርትዎን ስም ያስገቡ:</b>\n<i>ለምሳሌ: iPhone 15 Pro Max</i>', { 
        parse_mode: 'HTML', 
        ...Markup.keyboard([[config.buttons.cancel]]).resize() 
    });
});

// --- ⚙️ State Handlers ---
bot.on('message', async (ctx) => {
    if (!ctx.session) return;
    const text = ctx.message.text;

    if (text === config.buttons.cancel) {
        ctx.session = null;
        return ctx.reply('❌ ፖስቱ ተሰርዟል።', mainMenu);
    }

    // Global Back Logic
    if (text === config.buttons.back) {
        // Logic to rewind states can be added here
        return ctx.reply('ወደ ኋላ ተመልሰናል::');
    }

    switch (ctx.session.state) {
        case 'WAITING_NAME':
            ctx.session.name = text;
            ctx.session.state = 'WAITING_CATEGORY';
            await ctx.reply('ቀጣዩን ደረጃ ይምረጡ...', navKeyboard);
            return ctx.reply('📂 <b>Main Category:</b> ይምረጡ', { 
                parse_mode: 'HTML', 
                ...Markup.inlineKeyboard(config.categories) 
            });

        case 'WAITING_IMAGE':
            if (!ctx.message.photo) return ctx.reply('❌ እባክዎ ፎቶ (Image) ብቻ ይላኩ።');
            ctx.session.photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            ctx.session.state = 'WAITING_DESC';
            ctx.reply('✍️ <b>ዝርዝር መግለጫ:</b> ስለ ምርቱ ተጨማሪ መረጃ ይጻፉ (ፎቶ አይፈቀድም)።', { parse_mode: 'HTML' });
            break;

        case 'WAITING_DESC':
            if (ctx.message.photo) return ctx.reply('❌ መግለጫው በጽሁፍ ብቻ መሆን አለበት።');
            ctx.session.desc = text;
            ctx.session.state = 'WAITING_PRICE';
            ctx.reply('💵 <b>ዋጋ:</b> የምርቱን ዋጋ ያስገቡ (በቁጥር ብቻ)።', { parse_mode: 'HTML' });
            break;

        case 'WAITING_PRICE':
            if (isNaN(text)) return ctx.reply('❌ እባክዎ ዋጋውን በቁጥር ብቻ ያስገቡ (ለምሳሌ: 5000)።');
            ctx.session.price = text;

            if (ctx.session.phone) {
                return showSchedulingOptions(ctx);
            } else {
                ctx.session.state = 'WAITING_CONTACT';
                return ctx.reply('📱 <b>ስልክ ቁጥር:</b> ለመጀመሪያ ጊዜ ስልክ ቁጥርዎን ያጋሩን።', { 
                    parse_mode: 'HTML', 
                    ...Markup.keyboard([[Markup.button.contactRequest(config.buttons.shareContact)], [config.buttons.cancel]]).resize() 
                });
            }
    }
});

// --- 📞 Contact Handling ---
bot.on('contact', async (ctx) => {
    if (ctx.session?.state === 'WAITING_CONTACT') {
        ctx.session.phone = ctx.message.contact.phone_number;
        return showSchedulingOptions(ctx);
    }
});

// --- 📅 Scheduling Helper ---
function showSchedulingOptions(ctx) {
    ctx.session.state = 'WAITING_APPROVAL';
    return ctx.reply('📅 <b>የማረጋገጫ ደረጃ:</b>\nምርቱ እንዲለጠፍ ወደ አስተዳዳሪ መላክ ይፈልጋሉ?', {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [{ text: '🚀 ለግምገማ ላክ (Send for Review)', callback_data: 'post_for_review' }],
            [{ text: '❌ ሰርዝ (Cancel)', callback_data: 'cancel_flow' }]
        ])
    });
}

// --- 👑 Admin Approval Logic ---
bot.action('post_for_review', async (ctx) => {
    const { name, category, photoId, desc, price, phone } = ctx.session;
    const user = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

    const adminCaption = `🔍 <b>አዲስ ምርት ለግምገማ</b>\n${divider}\n` +
                         `🛒 <b>Item:</b> ${name}\n` +
                         `📝 <i>${desc}</i>\n` +
                         `💰 <b>Price:</b> ${price} ETB\n` +
                         `📞 <b>Phone:</b> ${phone}\n` +
                         `👤 <b>User:</b> ${user}\n` +
                         `📂 <b>Cat:</b> #${category}`;

    await ctx.telegram.sendPhoto(config.adminId, photoId, {
        caption: adminCaption,
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ ፍቀድ (Approve)', `approve_${ctx.from.id}`)],
            [Markup.button.callback('❌ አትፍቀድ (Reject)', `reject_${ctx.from.id}`)]
        ])
    });

    await ctx.editMessageText('⏳ <b>ተልኳል!</b>\nምርትዎ ለአስተዳዳሪ ተልኳል። ሲፈቀድ በቻናሉ ላይ ይለጠፋል።');
    ctx.reply('ወደ ዋናው ማውጫ...', mainMenu);
});

bot.action(/^approve_(\d+)$/, async (ctx) => {
    if (ctx.from.id !== config.adminId) return ctx.answerCbQuery("ፍቃድ የሎትም!");
    
    const userId = ctx.match[1];
    const originalCaption = ctx.callbackQuery.message.caption;
    const cleanCaption = originalCaption.replace('🔍 አዲስ ምርት ለግምገማ', '🛍 <b>አዲስ ምርት</b>') + `\n${divider}\n🛒 @hayre37`;
    const photoId = ctx.callbackQuery.message.photo[ctx.callbackQuery.message.photo.length - 1].file_id;

    await ctx.telegram.sendPhoto(config.channelId, photoId, { caption: cleanCaption, parse_mode: 'HTML' });
    await ctx.editMessageCaption('✅ <b>ተፈቅዷል:</b> ምርቱ በቻናሉ ላይ ተለጥፏል።', { parse_mode: 'HTML' });
    await bot.telegram.sendMessage(userId, "🎉 <b>እንኳን ደስ አለዎት!</b> ምርትዎ በአስተዳዳሪ ተፈቅዶ በቻናሉ ላይ ተለጥፏል።");
});

bot.action(/^reject_(\d+)$/, async (ctx) => {
    if (ctx.from.id !== config.adminId) return ctx.answerCbQuery("ፍቃድ የሎትም!");
    const userId = ctx.match[1];
    await ctx.editMessageCaption('❌ <b>ውድቅ ተደርጓል:</b> ምርቱ አልተለጠፈም።', { parse_mode: 'HTML' });
    await bot.telegram.sendMessage(userId, "❌ <b>ይቅርታ:</b> ያስገቡት ምርት በአስተዳዳሪው ተቀባይነት አላገኘም።");
});

// --- 📂 Inline Category Listeners ---
bot.action(/^cat_(.+)$/, async (ctx) => {
    ctx.session.category = ctx.match[1];
    ctx.session.state = 'WAITING_SUB';
    const subs = config.subCategories[ctx.session.category] || [[{ text: 'General', callback_data: 'sub_General' }]];
    await ctx.editMessageText(`📂 <b>Sub Category</b> ይምረጡ:\nMain: ${ctx.session.category}`, 
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(subs) });
});

bot.action(/^sub_(.+)$/, async (ctx) => {
    ctx.session.subCategory = ctx.match[1];
    ctx.session.state = 'WAITING_IMAGE';
    await ctx.deleteMessage();
    ctx.reply('📷 <b>ፎቶ ያስገቡ:</b>\nእባክዎ ጥራት ያለው 1 ምስል ይላኩ።', { parse_mode: 'HTML', ...navKeyboard });
});

bot.action('cancel_flow', async (ctx) => {
    ctx.session = null;
    await ctx.deleteMessage();
    ctx.reply('❌ ተሰርዟል።', mainMenu);
});

bot.launch().then(() => console.log("✅ Advanced Marketplace Bot is Live!"));
