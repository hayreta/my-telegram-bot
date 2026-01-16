require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

// Global Styles
const divider = '───────────────────';
const mainMenu = Markup.keyboard([
    [config.buttons.myProducts, config.buttons.addProduct],
    [config.buttons.preferences, config.buttons.account],
    [config.buttons.contactUs, config.buttons.schedulePost],
    [config.buttons.browseProducts]
]).resize();

const navKeyboard = Markup.keyboard([[config.buttons.back, config.buttons.cancel]]).resize();

bot.start((ctx) => ctx.reply('🌟 በዛህራ ሳፋ መገበያያ ቦት እንኳን ደህና መጡ!', mainMenu));

// --- 🛒 Add Product Flow ---
bot.hears(config.buttons.addProduct, (ctx) => {
    // Keep the phone number but reset other fields
    const savedPhone = ctx.session?.phone; 
    ctx.session = { state: 'WAITING_NAME', phone: savedPhone };
    ctx.reply('✍🏻 <b>የምርትዎን ስም</b> ያስገቡ (ግልፅ ይሁን)።', { parse_mode: 'HTML', ...Markup.keyboard([[config.buttons.cancel]]).resize() });
});

bot.action(/^cat_(.+)$/, async (ctx) => {
    ctx.session.category = ctx.match[1];
    ctx.session.state = 'WAITING_SUB';
    const subs = config.subCategories[ctx.session.category] || [[{ text: 'General', callback_data: 'sub_General' }]];
    await ctx.editMessageText(`📂 <b>Sub Category</b> ይምረጡ:\n${divider}\nCategory: ${ctx.session.category}`, 
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(subs) });
});

bot.action(/^sub_(.+)$/, async (ctx) => {
    ctx.session.subCategory = ctx.match[1];
    ctx.session.state = 'WAITING_IMAGE';
    await ctx.deleteMessage();
    ctx.reply('📷 <b>ፎቶ:</b> የምርትዎን ጥራት ያለው ፎቶ ያስገቡ።', { parse_mode: 'HTML', ...navKeyboard });
});

bot.on('message', async (ctx) => {
    if (!ctx.session) return;
    const text = ctx.message.text;

    if (text === config.buttons.cancel) {
        ctx.session = null;
        return ctx.reply('❌ ተሰርዟል።', mainMenu);
    }

    // Step Logic
    switch (ctx.session.state) {
        case 'WAITING_NAME':
            ctx.session.name = text;
            ctx.session.state = 'WAITING_CATEGORY';
            await ctx.reply('መመሪያዎችን በመከተል ይቀጥሉ...', navKeyboard);
            return ctx.reply('📂 <b>Main Category</b> ይምረጡ:', Markup.inlineKeyboard(config.categories));

        case 'WAITING_IMAGE':
            if (!ctx.message.photo) return ctx.reply('❌ እባክዎ ፎቶ ይላኩ።');
            ctx.session.photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            ctx.session.state = 'WAITING_DESC';
            ctx.reply('✍️ <b>ዝርዝር:</b> ስለ ምርቱ ማብራሪያ ይጻፉ።', { parse_mode: 'HTML' });
            break;

        case 'WAITING_DESC':
            if (ctx.message.photo) return ctx.reply('❌ ጽሁፍ ብቻ ያስገቡ።');
            ctx.session.desc = text;
            ctx.session.state = 'WAITING_PRICE';
            ctx.reply('💵 <b>ዋጋ:</b> የምርቱን ዋጋ ያስገቡ።', { parse_mode: 'HTML' });
            break;

        case 'WAITING_PRICE':
            if (isNaN(text)) return ctx.reply('❌ ዋጋ በቁጥር ብቻ!');
            ctx.session.price = text;

            // CHECK IF PHONE EXISTS
            if (ctx.session.phone) {
                ctx.session.state = 'WAITING_SCHEDULE';
                return ctx.reply('📅 <b>መቼ ይለጠፍ?</b>', Markup.inlineKeyboard([
                    [{ text: '🚀 አሁኑኑ (Post Now)', callback_data: 'post_now' }],
                    [{ text: '📅 ቀጠሮ ያዝ (Schedule)', callback_data: 'post_schedule' }]
                ]));
            } else {
                ctx.session.state = 'WAITING_CONTACT';
                return ctx.reply('📱 ለጥያቄ እንዲመች <b>ስልክ ቁጥርዎን</b> አንድ ጊዜ ያጋሩን።', 
                    Markup.keyboard([[Markup.button.contactRequest(config.buttons.shareContact)], [config.buttons.cancel]]).resize());
            }
    }
});

// --- Handle Contact (Save for future) ---
bot.on('contact', async (ctx) => {
    if (ctx.session?.state === 'WAITING_CONTACT') {
        ctx.session.phone = ctx.message.contact.phone_number;
        ctx.session.state = 'WAITING_SCHEDULE';
        ctx.reply('✅ ስልክ ቁጥርዎ ተመዝግቧል።\n📅 <b>መቼ ይለጠፍ?</b>', 
            { parse_mode: 'HTML', ...Markup.inlineKeyboard([
                [{ text: '🚀 አሁኑኑ (Post Now)', callback_data: 'post_now' }],
                [{ text: '📅 ቀጠሮ ያዝ (Schedule)', callback_data: 'post_schedule' }]
            ])});
    }
});

// --- Final Posting Logic ---
bot.action('post_now', async (ctx) => {
    const { name, category, subCategory, photoId, desc, price, phone } = ctx.session;
    const username = ctx.from.username ? `@${ctx.from.username}` : 'User';

    const caption = `<b>🛍 ${name}</b>\n\n` +
                    `📝 ${desc}\n` +
                    `${divider}\n` +
                    `📂 <b>Category:</b> #${category}\n` +
                    `💰 <b>Price:</b> ${price} ETB\n` +
                    `👤 <b>Seller:</b> ${username}\n` +
                    `📞 <b>Phone:</b> ${phone}\n` +
                    `${divider}\n` +
                    `🛒 Shop More: @hayre37`;

    try {
        await ctx.telegram.sendPhoto(config.channelId, photoId, { caption, parse_mode: 'HTML' });
        await ctx.editMessageText('✅ ምርትዎ በተሳካ ሁኔታ ተለጥፏል!');
        ctx.reply('ወደ ዋናው ማውጫ ተመልሰናል::', mainMenu);
    } catch (e) {
        ctx.reply('❌ ስህተት ተፈጥሯል (Bot Admin መሆኑን ያረጋግጡ)');
    }
    // Note: We don't clear ctx.session entirely so we keep the phone number
    ctx.session.state = null;
});

bot.action('post_schedule', (ctx) => {
    ctx.editMessageText('📅 ቀጠሮው ተመዝግቧል። አስተዳዳሪው ሲያረጋግጡት ይለጠፋል።\n(Note: This feature will be fully active once we add a database!)');
    ctx.reply('Main Menu', mainMenu);
});

bot.launch();
