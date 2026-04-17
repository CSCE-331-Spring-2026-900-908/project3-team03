const express = require('express');
const passport = require('passport');
const router = express.Router();

// ================== LOCAL LOGIN ==================

// Cashier local login
router.post('/login-cashier-local', passport.authenticate('local-cashier', {
    failureRedirect: '/login?error=Invalid+credentials',
    failureMessage: true
}), (req, res) => {
    req.session.role = 'cashier';
    res.redirect('/cashier/menu');
});

// Manager local login
router.post('/login-manager-local', passport.authenticate('local-manager', {
    failureRedirect: '/login?error=Invalid+credentials',
    failureMessage: true
}), (req, res) => {
    req.session.role = 'manager';
    res.redirect('/manager/dashboard');
});

// ================== GOOGLE OAUTH ==================

// Initiate Google login for cashier
router.get('/google/cashier', passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: 'cashier'
}));

// Initiate Google login for manager
router.get('/google/manager', passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: 'manager'
}));

// Google OAuth callback
router.get('/google/callback', passport.authenticate('google', {
    failureRedirect: '/login?error=Google+authentication+failed'
}), (req, res) => {
    // Determine role from state or request
    // In production, verify user email against a database of authorized users
    const state = req.query.state || 'cashier';
    req.session.role = state; // Set role from state
    req.session.user = req.user;
    
    if (state === 'manager') {
        res.redirect('/manager/dashboard');
    } else {
        res.redirect('/cashier/menu');
    }
});

// ================== LOGOUT ==================

router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.session.destroy((err) => {
            if (err) {
                return next(err);
            }
            res.redirect('/');
        });
    });
});

module.exports = router;
