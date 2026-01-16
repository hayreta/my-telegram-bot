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
        shareContact: '📱 Share Your Contact'
    },
    // Inline Category Buttons
    categories: [
        [{ text: '🎧 Electronics', callback_data: 'cat_Electronics' }, { text: '👗 Fashion', callback_data: 'cat_Fashion' }],
        [{ text: '💄 Health & Beauty', callback_data: 'cat_Health' }, { text: '🎁 Gifts', callback_data: 'cat_Gifts' }],
        [{ text: '🛋 Home & Living', callback_data: 'cat_Home' }, { text: '👶 Baby & Kids', callback_data: 'cat_Baby' }],
        [{ text: '💍 Jewelry & Watches', callback_data: 'cat_Jewelry' }, { text: '🏠 Property', callback_data: 'cat_Property' }],
        [{ text: '🚗 Vehicles', callback_data: 'cat_Vehicles' }, { text: '🌐 Services', callback_data: 'cat_Services' }],
        [{ text: '🔧 Auto Parts', callback_data: 'cat_Auto' }, { text: '🍎 Food & Grocery', callback_data: 'cat_Food' }],
        [{ text: '🪑 Office Supplies', callback_data: 'cat_Office' }, { text: '🐕 Pet Supplies', callback_data: 'cat_Pet' }]
    ],
    // Inline Sub-Category Buttons (Example for Electronics)
    subCategories: {
        'Electronics': [
            [{ text: '⚡️ Accessories', callback_data: 'sub_Accessories' }, { text: '💡 Smart Devices', callback_data: 'sub_Smart' }],
            [{ text: '🖥 Desktops', callback_data: 'sub_Desktops' }, { text: '📱 Smartphones', callback_data: 'sub_Phones' }],
            [{ text: '💻 Laptops', callback_data: 'sub_Laptops' }, { text: '📷 Cameras', callback_data: 'sub_Cameras' }]
        ]
    }
};
