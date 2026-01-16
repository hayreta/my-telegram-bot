require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

const divider = '━━━━━━━━━━━━━━━━━━━━';

// Keyboards
const mainMenu = Markup.keyboard([
    [config.buttons.myProducts, config.buttons.addProduct],
    [config.buttons.preferences, config.buttons.account],
    [config.buttons.contactUs, config.buttons.schedulePost],
    [config.buttons.browseProducts]
]).resize();

const navKeyboard = Markup.keyboard([[config.buttons.cancel]]).resize();

// --- START ---
bot.start((ctx) => {
    ctx.session = { phone: ctx.session?.phone }; // Reset flow but keep phone
    ctx.reply('🌟 <b>እንኳን ወደ ዛህራ ሳፋ መገበያያ ቦት በሰላም መጡ!</b>', { parse_mode: 'HTML', ...mainMenu });
});

// --- ADD PRODUCT INITIATION ---
bot.hears(config.buttons.addProduct, (ctx) => {
    ctx.session.state = 'WAITING_NAME';
    ctx.reply('✍🏻 <b>የምርትዎን ስም ያስገቡ:</b>', { parse_mode: 'HTML', ...navKeyboard });
});

// --- MAIN MESSAGE HANDLER ---
bot.on('message', async (ctx) => {
    if (!ctx.session || !ctx.session.state) return;
    const text = ctx.message.text;

    if (text === config.buttons.cancel) {
        ctx.session.state = null;
        return ctx.reply('❌ ተሰርዟል::', mainMenu);
    }

    switch (ctx.session.state) {
        case 'WAITING_NAME':
            ctx.session.name = text;
            ctx.session.state = 'WAITING_CATEGORY';
            return ctx.reply('📂 <b>Main Category:</b> ይምረጡ', { 
                parse_mode: 'HTML', 
                ...Markup.inlineKeyboard(config.categories) 
            });

        case 'WAITING_IMAGE':
            if (!ctx.message.photo) return ctx.reply('❌ እባክዎ ፎቶ ብቻ ይላኩ::');
            ctx.session.photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            ctx.session.state = 'WAITING_DESC';
            return ctx.reply('✍️ <b>ዝርዝር መግለጫ:</b> ስለ ምርቱ ይጻፉ (ፎቶ አይፈቀድም):', { parse_mode: 'HTML' });

        case 'WAITING_DESC':
            if (ctx.message.photo) return ctx.reply('❌ እባክዎ ጽሁፍ ብቻ ያስገቡ::');
            ctx.session.desc = text;
            ctx.session.state = 'WAITING_PRICE';
            return ctx.reply('💵 <b>ዋጋ:</b> በቁጥር ብቻ ያስገቡ:', { parse_mode: 'HTML' });

        case 'WAITING_PRICE':
            if (isNaN(text)) return ctx.reply('❌ እባክዎ ዋጋውን በቁጥር ብቻ ያስገቡ::');
            ctx.session.price = text;
            
            if (ctx.session.phone) {
                return finishToAdmin(ctx);
            } else {
                ctx.session.state = 'WAITING_CONTACT';
                return ctx.reply('📱 <b>ስልክ ቁጥር:</b> ለመጀመሪያ ጊዜ ስልክ ቁጥርዎን ያጋሩን::', 
                    Markup.keyboard([[Markup.button.contactRequest(config.buttons.shareContact)], [config.buttons.cancel]]).resize());
            }
    }
});

// --- CONTACT HANDLER ---
bot.on('contact', async (ctx) => {
    if (ctx.session?.state === 'WAITING_CONTACT') {
        ctx.session.phone = ctx.message.contact.phone_number;
        return finishToAdmin(ctx);
    }
});

// --- INLINE ACTION HANDLERS ---
bot.action(/^cat_(.+)$/, async (ctx) => {
    const category = ctx.match[1];
    ctx.session.category = category;
    ctx.session.state = 'WAITING_SUB';
    const subs = config.subCategories[category] || [[{ text: 'General', callback_data: 'sub_General' }]];
    await ctx.editMessageText(`📂 <b>Sub Category</b> ይምረጡ:\nMain: ${category}`, { 
        parse_mode: 'HTML', 
        ...Markup.inlineKeyboard(subs) 
    });
});

bot.action(/^sub_(.+)$/, async (ctx) => {
    ctx.session.subCategory = ctx.match[1];
    ctx.session.state = 'WAITING_IMAGE';
    await ctx.deleteMessage();
    ctx.reply('📷 <b>ፎቶ ያስገቡ:</b>', navKeyboard);
});

// --- ADMIN REVIEW FUNCTION ---
async function finishToAdmin(ctx) {
    const { name, category, subCategory, photoId, desc, price, phone } = ctx.session;
    const user = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

    const adminCaption = `🔍 <b>አዲስ ምርት ለግምገማ</b>\n${divider}\n` +
                         `🛒 <b>Item:</b> ${name}\n` +
                         `📝 <i>${desc}</i>\n` +
                         `💰 <b>Price:</b> ${price} ETB\n` +
                         `📞 <b>Phone:</b> ${phone}\n` +
                         `👤 <b>User:</b> ${user}\n` +
                         `📂 <b>Cat:</b> #${category} | #${subCategory}`;

    // Send to Admin
    await ctx.telegram.sendPhoto(config.adminId, photoId, {
        caption: adminCaption,
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ ፍቀድ (Approve)', `approve_${ctx.from.id}`)],
            [Markup.button.callback('❌ አትፍቀድ (Reject)', `reject_${ctx.from.id}`)]
        ])
    });

    ctx.session.state = null;
    await ctx.reply('⏳ <b>ተልኳል!</b> ምርትዎ ለአስተዳዳሪ ተልኳል። ሲፈቀድ ይለጠፋል።', mainMenu);
}

// --- ADMIN ACTIONS ---
bot.action(/^approve_(\d+)$/, async (ctx) => {
    if (ctx.from.id !== config.adminId) return ctx.answerCbQuery("Denied!");
    const userId = ctx.match[1];
    const originalCaption = ctx.callbackQuery.message.caption;
    const channelCaption = originalCaption.replace('🔍 አዲስ ምርት ለግምገማ', '🛍 <b>አዲስ ምርት</b>') + `\n${divider}\n🛒 @hayre37`;
    const photoId = ctx.callbackQuery.message.photo[ctx.callbackQuery.message.photo.length - 1].file_id;

    await ctx.telegram.sendPhoto(config.channelId, photoId, { caption: channelCaption, parse_mode: 'HTML' });
    await ctx.editMessageCaption('✅ <b>ተፈቅዷል:</b> በቻናሉ ላይ ተለጥፏል።');
    await bot.telegram.sendMessage(userId, "🎉 <b>እንኳን ደስ አለዎት!</b> ምርትዎ ተፈቅዶ በቻናሉ ላይ ተለጥፏል።");
});

bot.action(/^reject_(\d+)$/, async (ctx) => {
    if (ctx.from.id !== config.adminId) return ctx.answerCbQuery("Denied!");
    const userId = ctx.match[1];
    await ctx.editMessageCaption('❌ <b>ውድቅ ተደርጓል::</b>');
    await bot.telegram.sendMessage(userId, "❌ <b>ይቅርታ:</b> ያስገቡት ምርት በአስተዳዳሪው ተቀባይነት አላገኘም።");
});

bot.catch((err) => console.error("Global Error:", err));
bot.launch().then(() => console.log("✅ Stable Bot Online!"));
