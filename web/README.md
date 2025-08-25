# Regula Web Application

## Authentication Setup

This application uses Google OAuth for authentication. All routes under `/app` are protected and require authentication.

### Backend Environment Variables

Add these to your `api/.env` file:

```env
# Authentication
AUTH_JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
AUTH_MODE="full"  # "off", "key", "jwt", or "full"

# Google OAuth (required for login)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"

# UI Configuration
UI_ORIGIN="http://localhost:3000"

# Admin emails (comma-separated)
ADMIN_EMAILS="admin@example.com,anitha.ramaswamy.2015@gmail.com"
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set up OAuth consent screen
6. Create OAuth 2.0 Client ID for "Web application"
7. Add authorized redirect URIs:
   - `http://localhost:4000/auth/google/callback` (for development)
   - `https://yourdomain.com/auth/google/callback` (for production)
8. Copy the Client ID and Client Secret to your `.env` file

### Running the Application

1. Start the backend:
   ```bash
   cd api
   pnpm dev
   ```

2. Start the frontend:
   ```bash
   cd web
   pnpm dev
   ```

3. Visit `http://localhost:3000` and click "Try Regula" to access the login page

### Authentication Flow

1. User clicks "Try Regula" → redirected to `/login`
2. User clicks "Continue with Google" → redirected to Google OAuth
3. After Google authentication → redirected back to app with JWT cookie
4. User can now access all `/app` routes
5. User can logout using the "Sign Out" button in the sidebar

### Protected Routes

All routes under `/app/*` require authentication:
- `/app/dashboard`
- `/app/issuance`
- `/app/trustlines`
- `/app/balances`
- `/app/settings`
- `/app/help`

### Public Routes

These routes are accessible without authentication:
- `/` (main landing page)
- `/login`
- `/privacy`
- `/terms`
