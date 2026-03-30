const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const dotenv = require('dotenv').config();

// Create express app
const app = express();
const port = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'your-secret-key', // Change this to a secure key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Create pool
const pool = new Pool({
    user: process.env.PSQL_USER,
    host: process.env.PSQL_HOST,
    database: process.env.PSQL_DATABASE,
    password: process.env.PSQL_PASSWORD,
    port: process.env.PSQL_PORT,
    ssl: {rejectUnauthorized: false}
});

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

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === credentials.cashier.username && password === credentials.cashier.password) {
        req.session.role = 'cashier';
        res.redirect('/cashier');
    } else if (username === credentials.manager.username && password === credentials.manager.password) {
        req.session.role = 'manager';
        res.redirect('/manager/dashboard');
    } else {
        res.render('login', { error: 'Invalid credentials' });
    }
});

app.get('/kiosk', (req, res) => {
    res.render('kiosk');
});

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

app.get('/manager', (req, res) => {
    res.render('manager');
});

app.get('/login', (req, res) => {
    res.render('login');
});

// -------------------- MANAGER SCREENS --------------------
app.get('/manager/dashboard', (req, res) => {
    res.render('manager/dashboard', {
        salesToday: '245.50',
        ordersToday: 18,
        avgOrderToday: '13.64',
        
        // TEST: mock data
        recentOrders: [
        {
            order_id: 101,
            created_at: '10:25 AM',
            status: 'PAID',
            payment_method: 'CARD',
            total: '12.50'
        },
        {
            order_id: 102,
            created_at: '10:40 AM',
            status: 'SERVED',
            payment_method: 'CASH',
            total: '9.75'
        }
        ],

        // TEST: mock data
        lowStock: [
        { name: 'Boba Pearls', quantity: 5, reorder_point: 20 },
        { name: 'Milk', quantity: 8, reorder_point: 15 }
        ]
    });
});

app.get('/manager/reports', (req, res) => {
    res.render('manager/reports', {
        // TEST: mock data
        xReport: {
        date: '',
        beginHour: 8,
        endHour: 17,
        status: '',
        orders: 12,
        discards: 1,
        sales: '142.50',
        cardPayments: 8,
        cashPayments: 4,
        avgRevenue: '11.88'
        },

        // TEST: mock data
        salesReport: {
        startDate: '',
        endDate: '',
        status: '',
        items: [
            { name: 'Classic Milk Tea', qty: 8, revenue: '48.00' },
            { name: 'Taro Smoothie', qty: 4, revenue: '28.00' }
        ],
        totalRevenue: '76.00'
        },

        // TEST: mock data
        usageReport: {
        startDate: '',
        endDate: '',
        status: '',
        items: [
            { name: 'Milk', used: 12, unit: 'cups' },
            { name: 'Boba Pearls', used: 7, unit: 'scoops' }
        ]
        },

        // TEST: mock data
        zReport: {
        businessDay: 'today',
        closed: false,
        status: '',
        sales: '142.50',
        tax: '11.76',
        totalCash: '48.00',
        cardPayments: 8,
        cashPayments: 4,
        adjustments: '0.00',
        sig1: '',
        sig2: '',
        notes: ''
        }
    });
});

app.get('/manager/inventory', (req, res) => {
    res.render('manager/inventory', {
        statusMessage: '',
        inventoryItems: [
        { name: 'Boba Pearls', onHand: 25, parLevel: 20, reorder: 20 },
        { name: 'Milk', onHand: 12, parLevel: 15, reorder: 15 },
        { name: 'Brown Sugar Syrup', onHand: 18, parLevel: 10, reorder: 10 }
        ]
    });
});

// TEST: Mock post to add inventory item
app.post('/manager/inventory/add', (req, res) => {
    const { itemName, onHand, reorder } = req.body;

    res.render('manager/inventory', {
        statusMessage: `Added item: ${itemName}`,
        inventoryItems: [
        { name: itemName, onHand, parLevel: reorder, reorder },
        { name: 'Milk', onHand: 12, parLevel: 15, reorder: 15 }
        ]
    });
});

// TEST: Mock post to update quantity of an item
app.post('/manager/inventory/update-quantity', (req, res) => {
    const { itemName, onHand } = req.body;

    res.render('manager/inventory', {
        statusMessage: `Updated quantity for ${itemName} to ${onHand}`,
        inventoryItems: [
        { name: itemName, onHand, parLevel: 20, reorder: 20 },
        { name: 'Milk', onHand: 12, parLevel: 15, reorder: 15 }
        ]
    });
});

// TEST: Mock post to delete an inventory item
app.post('/manager/inventory/delete', (req, res) => {
    const { deleteName } = req.body;

    res.render('manager/inventory', {
        statusMessage: `Deleted item: ${deleteName}`,
        inventoryItems: [
        { name: 'Milk', onHand: 12, parLevel: 15, reorder: 15 }
        ]
    });
});

app.get('/manager/menu', (req, res) => {
    // TEST: mock data
    res.render('manager/menu', {
        statusMessage: '',
        selectedItem: {
        menu_item_id: 1,
        name: 'Classic Milk Tea'
        },
        categories: ['Milk Tea', 'Tea', 'Fruit Tea', 'Smoothie', 'Matcha', 'Energy', 'Sour', 'ADDON', 'SEASONAL'],
        ingredients: [
        { ingredient_id: 1, name: 'Milk' },
        { ingredient_id: 2, name: 'Boba Pearls' },
        { ingredient_id: 3, name: 'Brown Sugar Syrup' }
        ],
        recipeLines: ['Milk (200)', 'Boba Pearls (50)', 'Brown Sugar Syrup (20)'],
        menuItems: [
        { menu_item_id: 1, name: 'Classic Milk Tea', category: 'Milk Tea', base_price: '6.00', active: true },
        { menu_item_id: 2, name: 'Taro Smoothie', category: 'Smoothie', base_price: '6.50', active: true },
        { menu_item_id: 3, name: 'Sakura Seasonal Tea', category: 'SEASONAL', base_price: '6.75', active: false }
        ]
    });
});

// TODO: Add POST requests for every button on manager menu

app.get('/manager/employees', (req, res) => {
    // TEST: mock data
    res.render('manager/employees', {
    statusMessage: '',
    roles: ['CASHIER', 'MANAGER'],
    selectedEmployee: {
        employee_id: 1,
        first_name: 'Ed',
        last_name: 'D'
    },
    employees: [
        {
        employee_id: 1,
        first_name: 'Ed',
        last_name: 'D',
        username: 'ed',
        role: 'MANAGER',
        hourly_wage: '13.00',
        active: true,
        join_date: '2026-02-25'
        },
        {
        employee_id: 2,
        first_name: 'kilroy',
        last_name: 'kilroy',
        username: 'kilroy',
        role: 'MANAGER',
        hourly_wage: '12.50',
        active: true,
        join_date: '2026-03-04'
        }
    ]
  });
});

// TODO: Add update-role logic
app.post('/manager/employees/update-role', (req, res) => {
  const { employeeId, role } = req.body;

  res.render('manager/employees', {
    
  });
});

// TODO: Add update-wage logic
app.post('/manager/employees/update-wage', (req, res) => {
  const { employeeId, hourlyWage } = req.body;

  res.render('manager_employees', {

  });
});

// TODO: Add toggle-active logic
app.post('/manager/employees/toggle-active', (req, res) => {
  const { employeeId } = req.body;

  res.render('manager/employees', {

  });
});

// TODO: Add add employee logic
app.post('/manager/employees/add', (req, res) => {
  const { firstName, lastName, username, role, joinDate, hourlyWage, active } = req.body;

  res.render('manager/employees', {

  });
});


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
