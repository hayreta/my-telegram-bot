module.exports = {
    channelId: '@hayre37', 
    adminId: 5522724001, 
    buttons: {
        myProducts: '📦 My Products',
        addProduct: '🛒 add Product',
        preferences: '⭐️ Preferences',
        account: '👤 Account',
        contactUs: '📞 Contact us',
        cancel: '❌ Cancel',
        shareContact: '📱 Share My Contact'
    },
    categories: [
        [{ text: '🎧 Electronics', callback_data: 'cat_Electronics' }, { text: '👗 Fashion', callback_data: 'cat_Fashion' }],
        [{ text: '💄 Health & Beauty', callback_data: 'cat_Health' }, { text: '🎁 Gifts', callback_data: 'cat_Gifts' }],
        [{ text: '🛋 Home & Living', callback_data: 'cat_Home' }, { text: '👶 Baby & Kids', callback_data: 'cat_Baby' }]
    ],
    subCategories: {
        'Electronics': [
            [{ text: '⚡️ Accessories', callback_data: 'sub_Accessories' }, { text: '📱 Smartphones', callback_data: 'sub_Phones' }]
        ]
    }
};
