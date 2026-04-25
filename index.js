const express = require('express');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');

const pool = require('./db/pool');
const MenuItemDao = require('./dao/MenuItemDao');
const orderDao = require('./dao/orderDao');
const inventoryDao = require('./dao/inventoryDao');

// Load Passport configuration
require('./config/passportConfig');

// Create express app
const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);

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
const kioskRoutes = require('./routes/kiosk');
const authRoutes = require('./routes/auth');

app.use('/manager', managerRoutes);
app.use('/cashier', cashierRoutes);
app.use('/kiosk', kioskRoutes);
app.use('/auth', authRoutes);

// Add process hook to shutdown pool
process.on('SIGINT', function() {
    pool.end();
    console.log('Application successfully shutdown');
    process.exit(0);
});
	 	 	 	
app.set("view engine", "ejs");

// TODO: Get rid of hardcoded credentials
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

app.get('/loginCashier', (req, res) => {
    res.render('loginCashier');
});

app.get('/loginManager', (req, res) => {
    res.render('loginManager');

});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
