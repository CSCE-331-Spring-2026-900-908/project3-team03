const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const router = express.Router();
const orderDao = require('../dao/orderDao');
const inventoryDao = require('../dao/inventoryDao');
const MenuItemDao = require('../dao/MenuItemDao');

// ---------------------------- Drink Style ----------------------------
// Load color data
const drinkCsvPath = path.resolve(__dirname, '..', 'images', 'DrinkColorData.csv');
let cachedDrinkStyleMap = null;

function parseSimpleCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row = {};

        headers.forEach((h, i) => {
            row[h] = values[i] ?? '';
        });

        return row;
    });
}

function buildDrinkStyleMap(rows) {
    const map = {};

    rows.forEach(row => {
        const type = (row.accent_type || '').toLowerCase();

        map[row.drink] = {
            lid_color: row.lid_color,
            straw_color: row.straw_main,
            straw_shadow: row.straw_shadow,
            liquid_top: row.liquid_top,
            liquid_mid: row.liquid_mid,
            liquid_bottom: row.liquid_bottom,

            show_bobba: false,
            bobba_color: row.boba_color,

            show_seeds: type === 'seeds',
            seeds_color: row.accent_color,

            show_cube_topping: type === 'cube' || type === 'cube_topping',
            cube_topping_color: row.accent_color,

            show_syrup: type === 'syrup' || type === 'powder' || type === 'caramel',
            syrup_color: row.accent_color
        };
    });

    return map;
}

async function getDrinkStyleMap() {
    if (cachedDrinkStyleMap) return cachedDrinkStyleMap;

    const csv = await fs.readFile(drinkCsvPath, 'utf8');
    const rows = parseSimpleCsv(csv);
    cachedDrinkStyleMap = buildDrinkStyleMap(rows);

    return cachedDrinkStyleMap;
}

// Load starting kiosk page
router.get('/', async (req, res) => {
    try {
        console.log('Kiosk: Loading menu from database');
        
        const [menuItems, activeAddons] = await Promise.all([
            MenuItemDao.get_active_drink_items(),
            MenuItemDao.get_active_addons()
        ]);
        console.log('Kiosk: Retrieved', menuItems.length, 'drink items');
        console.log('Kiosk: Retrieved', activeAddons.length, 'addons');
        
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
        
        const drinkStyleMap = await getDrinkStyleMap();

        res.render('kiosk', {
            categories,
            addons: activeAddons.map(item => ({
                id: item.menu_item_id,
                name: item.name,
                price: parseFloat(item.base_price)
            })),
            drinkStyleMap,
            statusMessage: ''
        });
    } catch (err) {
        console.error('Kiosk: Error loading menu:', err);
        res.render('kiosk', {
            categories: {},
            addons: [],
            drinkStyleMap: {},
            statusMessage: 'Error loading menu items'
        });
    }
});

// Submitting an order
router.post('/submitOrder', async (req, res) => {
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
