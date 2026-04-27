const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const router = express.Router();
const orderDao = require('../dao/orderDao');
const inventoryDao = require('../dao/inventoryDao');
const MenuItemDao = require('../dao/MenuItemDao');
const { fetchCollegeStationWeather } = require('../utils/weather');

// ---------------------------- Drink Style ----------------------------
// Load color data
const drinkCsvPath = path.resolve(__dirname, '..', 'images', 'DrinkColorData.csv');
const menuItemCsvPath = path.resolve(__dirname, '..', 'db', 'menu_item.csv');
let cachedDrinkStyleMap = null;
let cachedDrinkQuizProfiles = null;

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

// Drink profile category
function createBaseQuizProfile(category) {
    const profiles = {
        'Milk Tea': {
            chill: 2,
            treat: 1,
            creamy: 3,
            sweet: 1,
            safe: 2
        },
        'Tea': {
            chill: 1,
            fresh: 2,
            teaForward: 3,
            safe: 2,
            noSugar: 1
        },
        'Fruit Tea': {
            fresh: 3,
            fruity: 4,
            slightlySweet: 2,
            noToppings: 1,
            safe: 1
        },
        'Smoothie': {
            treat: 2,
            fresh: 1,
            fruity: 3,
            rich: 1,
            adventurous: 1
        },
        'Energy': {
            energetic: 4,
            sweet: 2,
            extraSweet: 3,
            lotsToppings: 2,
            adventurous: 2
        },
        'Matcha': {
            chill: 1,
            fresh: 2,
            teaForward: 2,
            rich: 1,
            adventurous: 2
        },
        'Seasonal': {
            treat: 1,
            adventurous: 3,
            surprise: 4
        },
        'SEASONAL': {
            treat: 1,
            adventurous: 3,
            surprise: 4
        }
    };

    return { ...(profiles[category] || { chill: 1, safe: 1 }) };
}

// Drink profile defaults for each category
function applyQuizProfileOverrides(name, category, profile) {
    const lowerName = name.toLowerCase();

    if (lowerName === 'misty milk') {
        Object.assign(profile, {
            chill: 4,
            creamy: 5,
            safe: 4,
            energetic: 0,
            fruity: 0
        });
    } else if (lowerName === 'glass cannon') {
        Object.assign(profile, {
            energetic: 6,
            extraSweet: 5,
            lotsToppings: 4,
            adventurous: 3,
            safe: 0
        });
    } else if (lowerName === 'chard shore') {
        Object.assign(profile, {
            fresh: 5,
            fruity: 5,
            slightlySweet: 4,
            noToppings: 3,
            safe: 2
        });
    } else if (lowerName === 'flounder creme brulee') {
        Object.assign(profile, {
            treat: 5,
            rich: 5,
            sweet: 4,
            safe: 2,
            fresh: 0
        });
    } else if (lowerName === 'coal chocolate') {
        Object.assign(profile, {
            treat: 4,
            rich: 4,
            sweet: 3
        });
    } else if (lowerName === 'forsaken drink') {
        Object.assign(profile, {
            energetic: 3,
            adventurous: 5,
            surprise: 3,
            safe: 0
        });
    } else if (lowerName === 'mola mola matcha' || lowerName === 'islandic matcha') {
        Object.assign(profile, {
            fresh: 3,
            teaForward: 3,
            adventurous: 3
        });
    } else if (lowerName === 'seafoam tide') {
        Object.assign(profile, {
            chill: 3,
            fresh: 2,
            creamy: 3
        });
    }

    if (category === 'Seasonal' || category === 'SEASONAL') {
        profile.surprise = Math.max(profile.surprise || 0, 5);
        profile.adventurous = Math.max(profile.adventurous || 0, 4);
    }

    return profile;
}

function buildDrinkQuizProfileMap(rows) {
    const map = {};

    rows
        .filter((row) => String(row.active).toUpperCase() === 'TRUE' && String(row.category).toUpperCase() !== 'ADDON')
        .forEach((row) => {
            const profile = createBaseQuizProfile(row.category);
            map[row.name.toLowerCase()] = applyQuizProfileOverrides(row.name, row.category, profile);
        });

    return map;
}

async function getDrinkQuizProfiles() {
    if (cachedDrinkQuizProfiles) return cachedDrinkQuizProfiles;

    const csv = await fs.readFile(menuItemCsvPath, 'utf8');
    const rows = parseSimpleCsv(csv);
    cachedDrinkQuizProfiles = buildDrinkQuizProfileMap(rows);

    return cachedDrinkQuizProfiles;
}

// Load starting kiosk page
router.get('/', async (req, res) => {
    try {
        console.log('Kiosk: Loading menu from database');
        
        const [menuItems, activeAddons, weather, drinkQuizProfiles] = await Promise.all([
            MenuItemDao.get_active_drink_items(),
            MenuItemDao.get_active_addons(),
            fetchCollegeStationWeather(),
            getDrinkQuizProfiles()
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
                price: parseFloat(item.base_price),
                category: item.category
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
            quizDrinkProfiles: Object.fromEntries(
                menuItems.map((item) => [
                    item.menu_item_id,
                    drinkQuizProfiles[String(item.name).toLowerCase()] || createBaseQuizProfile(item.category)
                ])
            ),
            statusMessage: '',
            weather
        });
    } catch (err) {
        console.error('Kiosk: Error loading menu:', err);
        res.render('kiosk', {
            categories: {},
            addons: [],
            drinkStyleMap: {},
            quizDrinkProfiles: {},
            statusMessage: 'Error loading menu items',
            weather: await fetchCollegeStationWeather()
        });
    }
});

// Submitting an order
router.post('/submitOrder', async (req, res) => {
    try {
        console.log("ORDER RECEIVED");

        const frontendOrder = req.body.order;

        if (!Array.isArray(frontendOrder) || frontendOrder.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order is empty.'
            });
        }

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
            return res.status(500).json({
                success: false,
                message: 'Could not save the order.'
            });
        }

        const inventoryUpdated = await orderDao.updateInventory(order, MenuItemDao, null);

        if (!inventoryUpdated) {
            console.error('Kiosk: Inventory update failed for order', result.orderId);
        }

        res.json({ success: true, orderId: result.orderId });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server error while submitting order.'
        });
    }
});

module.exports = router;
