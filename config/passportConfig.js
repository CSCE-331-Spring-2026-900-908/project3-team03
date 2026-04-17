const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Hardcoded credentials for local authentication
const credentials = {
    cashier: { username: 'cashier', password: 'cashier123' },
    manager: { username: 'manager', password: 'manager456' }
};

// Configure Local Strategy (Username/Password)
passport.use('local-cashier', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
}, (username, password, done) => {
    if (username === credentials.cashier.username && password === credentials.cashier.password) {
        return done(null, { id: 'cashier_local', role: 'cashier', name: 'Cashier' });
    }
    return done(null, false, { message: 'Invalid credentials' });
}));

passport.use('local-manager', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
}, (username, password, done) => {
    if (username === credentials.manager.username && password === credentials.manager.password) {
        return done(null, { id: 'manager_local', role: 'manager', name: 'Manager' });
    }
    return done(null, false, { message: 'Invalid credentials' });
}));

// Configure Google Strategy
passport.use('google', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
    // Create user object from Google profile
    // In a real application, you would:
    // 1. Check database for existing user
    // 2. Create new user if not exists
    // 3. Map Google email to a role (cashier/manager)
    
    const user = {
        id: profile.id,
        googleId: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value,
        // Default role - in production, query database to determine role
        role: 'cashier' // Default to cashier, should be determined by email/DB
    };
    
    return done(null, user);
}));

// Serialize user to session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
    done(null, user);
});

module.exports = passport;
