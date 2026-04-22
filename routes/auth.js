const express = require('express');
const passport = require('passport');
const router = express.Router();
const employeeDao = require('../dao/employeeDao');
const googleAuthEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

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
router.get('/google/cashier', (req, res, next) => {
    if (!googleAuthEnabled) {
        return res.redirect('/login?error=Google+login+is+not+configured');
    }

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: 'cashier'
    })(req, res, next);
});

// Initiate Google login for manager
router.get('/google/manager', (req, res, next) => {
    if (!googleAuthEnabled) {
        return res.redirect('/login?error=Google+login+is+not+configured');
    }

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: 'manager'
    })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback', (req, res, next) => {
    if (!googleAuthEnabled) {
        return res.redirect('/login?error=Google+login+is+not+configured');
    }

    passport.authenticate('google', {
        failureRedirect: '/login?error=Google+authentication+failed'
    })(req, res, next);
}, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const requestedRole = req.user.requestedRole || 'CASHIER';
        
        // Query database for employee with this email
        const employee = await employeeDao.findEmployeeByEmail(userEmail);
        
        if (!employee) {
            // Email not found in database
            req.logout((err) => {
                res.redirect(`/login?error=Email+${encodeURIComponent(userEmail)}+not+found+in+system`);
            });
            return;
        }
        
        // Check if employee is active
        if (!employee.active) {
            req.logout((err) => {
                res.redirect(`/login?error=Account+is+inactive`);
            });
            return;
        }
        
        // Verify the employee's role matches the requested role
        if (employee.role !== requestedRole) {
            req.logout((err) => {
                res.redirect(`/login?error=Your+role+is+${employee.role}+not+${requestedRole}`);
            });
            return;
        }
        
        // All checks passed - create session
        req.session.role = employee.role.toLowerCase();
        req.session.user = req.user;
        req.session.employeeId = employee.employee_id;
        
        if (employee.role === 'MANAGER') {
            res.redirect('/manager/dashboard');
        } else {
            res.redirect('/cashier/menu');
        }
    } catch (err) {
        console.error('Error in Google callback:', err);
        req.logout((err) => {
            res.redirect('/login?error=Authentication+error');
        });
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
