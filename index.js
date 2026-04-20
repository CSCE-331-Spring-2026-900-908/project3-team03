const express = require('express');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv').config();
const pool = require('./db/pool');
const MenuItemDao = require('./dao/MenuItemDao');
const orderDao = require('./dao/orderDao');
const inventoryDao = require('./dao/inventoryDao');

// Load Passport configuration
require('./config/passportConfig');

// Create express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
const managerRoutes = require('./routes/manager');
const cashierRoutes = require('./routes/cashier');
const authRoutes = require('./routes/auth');

app.use('/auth', authRoutes);
app.use('/manager', managerRoutes);
app.use('/cashier', cashierRoutes);

// Add process hook to shutdown pool
process.on('SIGINT', function() {
    pool.end();
    console.log('Application successfully shutdown');
    process.exit(0);
});
	 	 	 	
app.set("view engine", "ejs");

// Hardcoded credentials
const credentials = {
    cashier: { username: 'cashier', password: 'cashier123' },
    manager: { username: 'manager', password: 'manager456' }
};

app.get('/', (req, res) => {
    res.render('index');
});

//separate cashier login handler
app.post('/loginCashier', (req, res) => {
    const { username, password } = req.body;
    if (username === credentials.cashier.username && password === credentials.cashier.password) {
        req.session.role = 'cashier';
        res.redirect('/cashier/menu');
    } else {
        res.render('login', { error: 'Invalid credentials' });
    }
});

//separate manager login handler
app.post('/loginManager', (req, res) => {
    const { username, password } = req.body;
    if (username === credentials.manager.username && password === credentials.manager.password) {
        req.session.role = 'manager';
        res.redirect('/manager/dashboard');
    } else {
        res.render('login', { error: 'Invalid credentials' });
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === credentials.cashier.username && password === credentials.cashier.password) {
        req.session.role = 'cashier';
        res.redirect('/cashier/menu');
    } else if (username === credentials.manager.username && password === credentials.manager.password) {
        req.session.role = 'manager';
        res.redirect('/manager/dashboard');
    } else {
        res.render('login', { error: 'Invalid credentials' });
    }
});

app.get('/kiosk', async (req, res) => {
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

app.post('/inventoryAdd', async (req, res) => {
    try {
        const item = req.body;

        await inventoryDao.createInventoryItem(item);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

app.post('/updateQuantityName', async (req, res) => {
    try {
        const { name, quantity } = req.body;

        await inventoryDao.updateInventoryQuantityByName(name, quantity);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

app.post('/deleteInventoryItem', async (req, res) => {
    try {
        const { name } = req.body;
console.log("Deleting:", name);
        const count = await inventoryDao.deactivateInventoryItemByName(name);

        if (count === 0) {
            return res.json({ success: false, message: "Item not found" });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

app.post('/insertIngredientReturningId', async (req, res) => {
    try {
        const { name } = req.body;

        const id = await inventoryDao.createInventoryItem(name);

        res.json({
            success: true,
            ingredient_id: id
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});


/*
app.get('/cashier', (req, res) => {
    if (req.session.role === 'cashier') {
        pool.query("SELECT * FROM employee WHERE role = 'CASHIER' ORDER BY employee_id;")
            .then(query_res => {
                res.render('cashier', { employees: query_res.rows });
            })
            .catch(err => {
                console.error('Error fetching employees:', err);
                res.status(500).send('Database error');
            });
    } else {
        res.redirect('/');
    }
});
*/

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/user', (req, res) => {
    let teammembers = []
    pool
        .query('SELECT * FROM teammembers;')
        .then(query_res => {
            for (let i = 0; i < query_res.rowCount; i++){
                teammembers.push(query_res.rows[i]);
            }
            const data = {teammembers: teammembers};
            console.log(teammembers);
            res.render('user', data);
        })
        .catch(err => {
            console.error('Error fetching teammembers:', err);
            res.status(500).send('Database error');
        });
});

app.get('/user', (req, res) => {
    res.render('user');
});

app.get('/login', (req, res) => {
    res.render('login');
});

/*
app.get('/cashiercheckout', (req, res) => {
    res.render('cashiercheckout');
});

app.get('/cashierconfirm', (req, res) => {
    res.render('cashierconfirm');
});

app.get('/cashiercustomize', (req, res) => {
    res.render('cashiercustomize');
});
*/

app.get('/loginCashier', (req, res) => {
    res.render('loginCashier');
});

app.get('/loginManager', (req, res) => {
    res.render('loginManager');

});


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
