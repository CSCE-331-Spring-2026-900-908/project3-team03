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
// Determine callback URL based on environment
const isProduction = process.env.NODE_ENV === 'production';
const callbackURL = isProduction 
  ? 'https://project3-team03-mkg4.onrender.com/auth/google/callback'
  : 'http://localhost:3000/auth/google/callback';

const hasGoogleOAuthConfig = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

if (hasGoogleOAuthConfig) {
    passport.use('google', new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: callbackURL,
        passReqToCallback: true
    }, (req, accessToken, refreshToken, profile, done) => {
        // Create user object from Google profile
        // Store the requested role from the query parameter
        const user = {
            id: profile.id,
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
            // Store the role from the initial request
            requestedRole: req.query.state ? (req.query.state.toUpperCase()) : 'CASHIER'
        };
        
        return done(null, user);
    }));
}

// Serialize user to session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
    done(null, user);
});

module.exports = passport;
