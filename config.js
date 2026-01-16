module.exports = {
    channelId: '@hayre37', 
    buttons: {
        myProducts: '📦 My Products',
        addProduct: '🛒 add Product',
        preferences: '⭐️ Preferences',
        account: '👤 Account',
        contactUs: '📞 Contact us',
        schedulePost: '📅 Schedule Post',
        browseProducts: '🔍 Browse Products',
        cancel: '❌ Cancel',
        back: '⬅️ Back',
        shareContact: '📱 Share Your Contact'
    },
    categories: [
        [{ text: '🎧 Electronics', callback_data: 'cat_Electronics' }, { text: '👗 Fashion', callback_data: 'cat_Fashion' }],
        [{ text: '💄 Health & Beauty', callback_data: 'cat_Health' }, { text: '🎁 Gifts', callback_data: 'cat_Gifts' }],
        [{ text: '🛋 Home & Living', callback_data: 'cat_Home' }, { text: '👶 Baby & Kids', callback_data: 'cat_Baby' }],
        [{ text: '💍 Jewelry & Watches', callback_data: 'cat_Jewelry' }, { text: '🏠 Property', callback_data: 'cat_Property' }],
        [{ text: '🚗 Vehicles', callback_data: 'cat_Vehicles' }, { text: '🌐 Services', callback_data: 'cat_Services' }],
        [{ text: '⬅️ Back', callback_data: 'back_to_start' }, { text: '❌ Cancel', callback_data: 'cancel_flow' }]
    ],
    subCategories: {
        'Electronics': [
            [{ text: '⚡️ Accessories', callback_data: 'sub_Accessories' }, { text: '💡 Smart Devices', callback_data: 'sub_Smart' }],
            [{ text: '📱 Smartphones', callback_data: 'sub_Phones' }, { text: '💻 Laptops', callback_data: 'sub_Laptops' }],
            [{ text: '⬅️ Back', callback_data: 'back_to_cat' }, { text: '❌ Cancel', callback_data: 'cancel_flow' }]
        ]
    }
};
