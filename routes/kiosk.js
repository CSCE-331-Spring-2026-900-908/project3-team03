const express = require('express');
const router = express.Router();
const orderDao = require('../dao/orderDao');
const inventoryDao = require('../dao/inventoryDao');
const menuItemDao = require('../dao/MenuItemDao');

// Load starting kiosk page
router.get('/kiosk', async (req, res) => {
    try {
        console.log('Kiosk: Loading menu from database');
        
        // Fetch all active menu items
        const menuItems = await MenuItemDao.get_active_menu_items();
        console.log('Kiosk: Retrieved', menuItems.length, 'menu items');
        
        // Group menu items by category
        const categories = {};
        menuItems.forEach(item => {
            if (!categories[item.category]) {
                categories[item.category] = [];
            }
            categories[item.category].push({
                id: item.menu_item_id,
                name: item.name,
                price: parseFloat(item.base_price)
            });
        });
        
        console.log('Kiosk: Organized into', Object.keys(categories).length, 'categories');
        
        res.render('kiosk', {
            categories,
            statusMessage: ''
        });
    } catch (err) {
        console.error('Kiosk: Error loading menu:', err.message);
        res.render('kiosk', {
            categories: {},
            statusMessage: 'Error loading menu items'
        });
    }
});

// Submitting an order
app.post('/submitOrder', async (req, res) => {
    try {
        console.log("ORDER RECEIVED");

        const frontendOrder = req.body.order;

        const order = {
            created_at: new Date(),
            status: "PAID",
            payment_method: "CARD",
            employee_id: 1,
            notes: "",
            subtotal: 0,
            tax: 0,
            total: 0,
            drinks: frontendOrder.map(item => ({
                menu_item_id: item.drinkId,
                quantity: item.quantity,
                ice_amount: 0,//will change to normal later but db is currently only taking ints
                sugar_amount: 0,//will change to normal later but db is currently only taking ints
                special_notes: "",
                base_price: item.total / item.quantity,
                addons: Object.fromEntries(
                    item.addons.map(a => [a.id, 1])
                )
            }))
        };

        const result = await orderDao.submitOrder(order);

        if (!result.success) {
            return res.json({ success: false });
        }

        await orderDao.updateInventory(order, MenuItemDao, null);

        res.json({ success: true, orderId: result.orderId });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;