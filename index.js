require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Using session to remember the user's progress and phone number
bot.use(session());

const divider = '━━━━━━━━━━━━━━';
const mainMenu = Markup.keyboard([
    [config.buttons.myProducts, config.buttons.addProduct],
    [config.buttons.preferences, config.buttons.account],
    [config.buttons.contactUs, config.buttons.schedulePost],
    [config.buttons.browseProducts]
]).resize();

const navKeyboard = Markup.keyboard([[config.buttons.back, config.buttons.cancel]]).resize();

// --- Start ---
bot.start((ctx) => {
    ctx.reply('🌟 እንኳን ወደ ዛህራ ሳፋ መገበያያ ቦት በሰላም መጡ!', mainMenu);
});

// --- Start Add Product ---
bot.hears(config.buttons.addProduct, (ctx) => {
    // We preserve ctx.session.phone if it exists from a previous post
    const phone = ctx.session?.phone;
    ctx.session = { state: 'WAITING_NAME', phone: phone };
    ctx.reply('✍🏻 <b>የምርትዎን ስም</b> ያስገቡ (ግልፅ ይሁን)።', { 
        parse_mode: 'HTML', 
        ...Markup.keyboard([[config.buttons.cancel]]).resize() 
    });
});

// --- Action Handlers (Inline) ---
bot.action(/^cat_(.+)$/, async (ctx) => {
    ctx.session.category = ctx.match[1];
    ctx.session.state = 'WAITING_SUB';
    const subs = config.subCategories[ctx.session.category] || [[{ text: 'General', callback_data: 'sub_General' }]];
    await ctx.editMessageText(`📂 <b>Sub Category</b> ይምረጡ:\nSelected: ${ctx.session.category}`, 
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(subs) });
});

bot.action(/^sub_(.+)$/, async (ctx) => {
    ctx.session.subCategory = ctx.match[1];
    ctx.session.state = 'WAITING_IMAGE';
    await ctx.deleteMessage();
    ctx.reply('📷 <b>ፎቶ:</b> የምርትዎን ጥራት ያለው ፎቶ ያስገቡ።', { parse_mode: 'HTML', ...navKeyboard });
});

// --- Post Timing Actions ---
bot.action('post_now', async (ctx) => {
    const { name, category, subCategory, photoId, desc, price, phone } = ctx.session;
    const user = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

    const caption = `🛍 <b>${name}</b>\n\n` +
                    `📝 <i>${desc}</i>\n` +
                    `${divider}\n` +
                    `📂 #${category} | #${subCategory}\n` +
                    `💰 <b>Price:</b> ${price} ETB\n` +
                    `📞 <b>Contact:</b> ${phone}\n` +
                    `👤 <b>Seller:</b> ${user}\n` +
                    `${divider}\n` +
                    `🛒 Shop: @hayre37`;

    try {
        await ctx.telegram.sendPhoto(config.channelId, photoId, { caption, parse_mode: 'HTML' });
        await ctx.editMessageText('✅ ምርትዎ በተሳካ ሁኔታ ተለጥፏል!');
        ctx.reply('ወደ ዋናው ማውጫ ተመልሰናል::', mainMenu);
    } catch (e) {
        ctx.reply('❌ ስህተት ተፈጥሯል (ቦቱ በቻናሉ ላይ Admin መሆኑን ያረጋግጡ)');
    }
    ctx.session.state = null; // Clear state but keep phone in session
});

bot.action('post_schedule', (ctx) => {
    ctx.editMessageText('📅 ቀጠሮ ተይዟል! በቅርቡ በቻናሉ ላይ ይለጠፋል።');
    ctx.session.state = null;
    ctx.reply('ወደ ዋናው ማውጫ...', mainMenu);
});

// --- Message Handlers ---
bot.on('message', async (ctx) => {
    if (!ctx.session) return;
    const text = ctx.message.text;

    if (text === config.buttons.cancel) {
        ctx.session = null;
        return ctx.reply('❌ ተሰርዟል።', mainMenu);
    }

    switch (ctx.session.state) {
        case 'WAITING_NAME':
            ctx.session.name = text;
            ctx.session.state = 'WAITING_CATEGORY';
            await ctx.reply('ምድብ ይምረጡ...', navKeyboard);
            return ctx.reply('📂 <b>Main Category</b> ይምረጡ:', Markup.inlineKeyboard(config.categories));

        case 'WAITING_IMAGE':
            if (!ctx.message.photo) return ctx.reply('❌ እባክዎ የምስል ፋይል (Photo) ይላኩ።');
            ctx.session.photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            ctx.session.state = 'WAITING_DESC';
            ctx.reply('✍️ <b>ዝርዝር:</b> ስለ ምርቱ ማብራሪያ ይጻፉ (ፎቶ አይፈቀድም)።', { parse_mode: 'HTML' });
            break;

        case 'WAITING_DESC':
            if (ctx.message.photo) return ctx.reply('❌ እባክዎ ጽሁፍ ብቻ ያስገቡ።');
            ctx.session.desc = text;
            ctx.session.state = 'WAITING_PRICE';
            ctx.reply('💵 <b>ዋጋ:</b> የምርቱን ዋጋ ያስገቡ።', { parse_mode: 'HTML' });
            break;

        case 'WAITING_PRICE':
            if (isNaN(text)) return ctx.reply('❌ እባክዎ ዋጋውን በቁጥር ብቻ ያስገቡ።');
            ctx.session.price = text;

            // Check if we already have the phone number
            if (ctx.session.phone) {
                ctx.session.state = 'WAITING_SCHEDULE';
                return ctx.reply('📅 <b>መቼ ይለጠፍ?</b>', Markup.inlineKeyboard([
                    [{ text: '🚀 አሁኑኑ (Post Now)', callback_data: 'post_now' }],
                    [{ text: '📅 ቀጠሮ (Schedule)', callback_data: 'post_schedule' }]
                ]));
            } else {
                ctx.session.state = 'WAITING_CONTACT';
                return ctx.reply('📱 ለጥያቄ እንዲመች <b>ስልክ ቁጥርዎን</b> ያጋሩ (አንድ ጊዜ ብቻ)።', 
                    Markup.keyboard([[Markup.button.contactRequest(config.buttons.shareContact)], [config.buttons.cancel]]).resize());
            }
    }
});

// --- Contact Handler ---
bot.on('contact', async (ctx) => {
    if (ctx.session?.state === 'WAITING_CONTACT') {
        ctx.session.phone = ctx.message.contact.phone_number;
        ctx.session.state = 'WAITING_SCHEDULE';
        ctx.reply('✅ ተመዝግቧል! 📅 <b>መቼ ይለጠፍ?</b>', {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [{ text: '🚀 አሁኑኑ (Post Now)', callback_data: 'post_now' }],
                [{ text: '📅 ቀጠሮ (Schedule)', callback_data: 'post_schedule' }]
            ])
        });
    }
});

bot.launch().then(() => console.log("✅ Beautiful Bot is Online!"));

