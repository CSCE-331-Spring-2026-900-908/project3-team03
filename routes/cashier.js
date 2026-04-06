const express = require('express');
const router = express.Router();

router.get('/menu', (req, res) => {
    res.render('cashier/menu');
});

router.get('/checkout', (req, res) => {
    res.render('cashier/checkout');
});

router.get('/confirm', (req, res) => {
    res.render('cashier/confirm');
});

router.get('/customize', (req, res) => {
    res.render('cashier/customize');
});

module.exports = router;