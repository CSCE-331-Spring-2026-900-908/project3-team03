# Google OAuth Integration Setup Guide

## Overview
Your application has been successfully configured with Google OAuth 2.0 authentication. This guide will help you set up the Google credentials to make it fully functional.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project:
   - Click on the project selector at the top
   - Click "NEW PROJECT"
   - Enter a project name (e.g., "Tea Shop POS")
   - Click "CREATE"

## Step 2: Enable Required APIs

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for and enable:
   - **Google+ API** (or **Google Identity Service API**)
   - Note: Click "ENABLE" button for each

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. If prompted to create a consent screen first:
   - Click **"CONFIGURE CONSENT SCREEN"**
   - Choose **"External"** (unless you have a Google Workspace account)
   - Click **"CREATE"**
   - Fill in the required fields:
     - **App name**: Your app name (e.g., "Tea Shop POS")
     - **User support email**: Your email
     - **Developer contact**: Your email
   - Click **"SAVE AND CONTINUE"**
   - Skip scopes for now, click **"SAVE AND CONTINUE"**
   - Skip test users for now, click **"SAVE AND CONTINUE"**
   - Review and click **"BACK TO DASHBOARD"**

5. Now create the OAuth client:
   - Go back to **Credentials**
   - Click **"+ CREATE CREDENTIALS"** again
   - Select **"OAuth client ID"**
   - Choose **"Web application"** as the application type
   - For **Name**, enter something like "Web Client"
   - Under **Authorized redirect URIs**, add:
     - `http://localhost:3000/auth/google/callback` (for development)
     - Add your production URL when deploying (e.g., `https://yourdomain.com/auth/google/callback`)
   - Click **"CREATE"**

6. A dialog will appear with your credentials:
   - Copy your **Client ID**
   - Copy your **Client Secret**
   - Click "OK"

## Step 4: Update Environment Variables

1. Open `.env` file in your project root
2. Replace the placeholder values with your credentials:
   ```
   GOOGLE_CLIENT_ID=your_actual_client_id_here
   GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
   ```
3. **IMPORTANT**: Never commit `.env` file to version control (it should be in `.gitignore`)

## Step 5: Restart Your Application

After updating the `.env` file, restart your Node.js application:
```bash
npm start
```

## Usage

### For Users
- Navigate to `/login` (or the main page)
- You'll see two authentication options:
  1. **Traditional login** with username/password
  2. **Google Sign In** button

### For Cashiers
- Click on the "Cashier" tab (if on the main login page)
- Click "Sign in with Google" or use username/password
- You'll be directed to the cashier menu after successful authentication

### For Managers
- Click on the "Manager" tab (if on the main login page)
- Click "Sign in with Google" or use username/password
- You'll be directed to the manager dashboard after successful authentication

## How It Works

### Authentication Flow

1. User clicks "Sign in with Google" button
2. User is redirected to Google's login page
3. Upon successful Google authentication, user is redirected back to: `/auth/google/callback`
4. The application creates a session with the user's Google profile information
5. User is automatically logged in and redirected to their role's dashboard

### Role Assignment

**Current Implementation:**
- The role (cashier/manager) is determined by the URL path the user accessed:
  - `/auth/google/cashier` → sets role as "cashier"
  - `/auth/google/manager` → sets role as "manager"

**For Production - Email-Based Role Assignment:**
To improve security, you should modify the `config/passportConfig.js` file to query your database and assign roles based on user email:

```javascript
// In config/passportConfig.js, update the Google callback:
passport.use('google', new GoogleStrategy({...}, async (accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value;
    
    // Query database to determine user's role based on email
    const user = await db.query(
        'SELECT * FROM employees WHERE email = $1',
        [email]
    );
    
    // Assign role from database
    const userData = {
        id: profile.id,
        email: email,
        name: profile.displayName,
        role: user.rows?.[0]?.role || 'cashier' // default to cashier
    };
    
    return done(null, userData);
}));
```

## Logout

Users can logout by:
- Navigating to `/auth/logout`
- This will clear the session and redirect to home page

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID | `YOUR_CLIENT_ID.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client Secret | `GOCSPX-...` |
| `GOOGLE_CALLBACK_URL` | URL where Google redirects after auth | `https://project3-team03-mkg4.onrender.com/auth/google/callback` |

For deployment, set `GOOGLE_CALLBACK_URL` to your live site callback URL. If it is omitted on Render, the app now falls back to `RENDER_EXTERNAL_URL/auth/google/callback`.
| `SESSION_SECRET` | Secret for encrypting sessions | `change-me-in-production` |

## Troubleshooting

### Issue: "redirect_uri_mismatch"
**Solution:** Ensure the callback URL in your `.env` file exactly matches what you registered in Google Cloud Console (including protocol, domain, and path).

### Issue: Client ID or Client Secret not working
**Solution:** 
1. Verify credentials in Google Cloud Console
2. Check that APIs are enabled
3. Restart the application after updating `.env`

### Issue: User cannot access manager dashboard with Google login
**Solution:** Check the role assignment logic in `config/passportConfig.js`. You may need to implement email-based role checking against your database.

## Security Recommendations

1. **Never share** your `.env` file or credentials
2. Use **environment variables** for all sensitive data
3. Change `SESSION_SECRET` in production to a strong random string
4. Keep `node_modules` and `.env` out of version control
5. Use HTTPS in production
6. Regularly rotate your Google OAuth credentials
7. Implement proper role verification in your database

## Testing

To test the OAuth flow:

1. Start the application: `npm start`
2. Visit: `http://localhost:3000/`
3. Click "Sign in with Google"
4. Use a test Gmail account
5. Verify you're redirected to the appropriate dashboard

## Additional Resources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [Express Session Documentation](https://github.com/expressjs/session)

## File Structure

New files and modifications:
- `/config/passportConfig.js` - Passport configuration
- `/routes/auth.js` - OAuth and authentication routes
- `/index.js` - Updated with Passport middleware
- `/views/login.ejs` - Updated with Google OAuth button
- `/views/loginCashier.ejs` - Updated with Google OAuth button
- `/views/loginManager.ejs` - Updated with Google OAuth button
- `/.env` - Updated with OAuth variables

## Next Steps

1. Add user database table to track OAuth users (optional):
   ```sql
   CREATE TABLE oauth_users (
       id SERIAL PRIMARY KEY,
       google_id VARCHAR(255) UNIQUE NOT NULL,
       email VARCHAR(255) UNIQUE NOT NULL,
       name VARCHAR(255),
       role VARCHAR(50) DEFAULT 'cashier',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. Implement email-based role assignment
3. Add "Remember me" functionality
4. Set up refresh token handling for long-term sessions
