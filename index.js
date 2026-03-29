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
        res.redirect('/manager_dashboard');
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

app.get('/manager_dashboard', (req, res) => {
  res.render('manager_dashboard', {
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

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
