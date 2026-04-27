const express = require('express');
const router = express.Router();
const orderDao = require('../dao/orderDao');
const inventoryDao = require('../dao/inventoryDao');
const MenuItemDao = require('../dao/MenuItemDao');
const { fetchCollegeStationWeather } = require('../utils/weather');
const { getDrinkStyleMap } = require('../utils/drinkStyle');

// Give every drink a starting profile based on its category
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

// Adjust specific drinks by name (max drink per category).
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

// Builds one profile per active drink from the live database menu items
function buildDrinkQuizProfilesFromMenuItems(menuItems) {
    const map = {};

    menuItems
        .filter((item) => String(item.category || '').toUpperCase() !== 'ADDON')
        .forEach((item) => {
            const profile = createBaseQuizProfile(item.category);
            map[item.menu_item_id] = applyQuizProfileOverrides(item.name, item.category, profile);
        });

    return map;
}

// Load starting kiosk page
router.get('/', async (req, res) => {
    try {
        console.log('Kiosk: Loading menu from database');
        
        const [menuItems, activeAddons, weather] = await Promise.all([
            MenuItemDao.get_active_drink_items(),
            MenuItemDao.get_active_addons(),
            fetchCollegeStationWeather()
        ]);
        console.log('Kiosk: Retrieved', menuItems.length, 'drink items');
        console.log('Kiosk: Retrieved', activeAddons.length, 'addons');

        const defaultAddonsByDrink = await MenuItemDao.get_default_addons_by_drink(
            menuItems.map(item => item.menu_item_id)
        );
        
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
                category: item.category,
                defaultAddonIds: defaultAddonsByDrink[String(item.menu_item_id)] || []
            });
        });
        
        console.log('Kiosk: Organized into', Object.keys(categories).length, 'categories');
        
        const drinkStyleMap = await getDrinkStyleMap();
        const quizDrinkProfiles = buildDrinkQuizProfilesFromMenuItems(menuItems);

        res.render('kiosk', {
            categories,
            addons: activeAddons.map(item => ({
                id: item.menu_item_id,
                name: item.name,
                price: parseFloat(item.base_price)
            })),
            drinkStyleMap,
            quizDrinkProfiles,
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
                base_price: item.basePrice,
                addons: Object.fromEntries(
                    (item.addons || [])
                        .filter(a => !a.included)
                        .map(a => [a.id, 1])
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
