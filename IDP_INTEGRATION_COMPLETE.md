# PMO Application - IdP Integration

## Overview
This PMO application is now integrated with a centralized Identity Provider (IdP) for Single Sign-On (SSO). All authentication is handled by the IdP, and the PMO app redirects users there for login.

## ✅ Integration Complete

The following components have been successfully integrated:

### 1. **OAuth Callback Handler** (`app/auth/callback/route.ts`)
- Receives authorization codes from the IdP
- Exchanges codes for JWT tokens
- Verifies JWT tokens with proper issuer and audience validation
- Sets HTTP-only cookies for secure session management
- Redirects authenticated users to the dashboard

### 2. **Login Page** (`app/auth/login/page.tsx`)
- Automatically redirects users to IdP for authentication
- Displays loading state during redirect
- Handles authentication errors with user-friendly messages
- Provides retry functionality

### 3. **Authentication Middleware** (`middleware.ts`)
- Validates JWT tokens from IdP on every protected request
- Supports both cookie-based (IdP) and Bearer token authentication
- Extracts user information and adds to request headers
- Maintains backward compatibility with API key authentication for finance routes
- Public paths configured: `/auth/login`, `/auth/callback`, `/auth/logout`

### 4. **Logout Endpoint** (`app/auth/logout/route.ts`)
- Clears authentication cookies
- Redirects to IdP logout for complete session termination
- Supports both GET and POST methods

### 5. **JWT Helper Library** (`lib/jwt.ts`)
- Updated to support IdP token verification
- New helper functions:
  - `getAuthenticatedUser()` - For Server Components
  - `getAuthenticatedUserFromRequest()` - For API Routes
- Validates tokens with issuer and audience checks

### 6. **Dashboard Layout** (`components/layout/DashboardLayout.tsx`)
- Updated logout handler to use new IdP logout flow
- Clears local storage and redirects to logout endpoint

## Environment Configuration

The `.env.local` file has been created with the required configuration:

```env
# IdP Integration
NEXT_PUBLIC_IDP_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# JWT Configuration (CRITICAL: Must match IdP exactly)
JWT_SECRET=c7f79b1926e72189aca001c0cf8366ac2ca56c959c8075c29259b10ac54a8152b90b632aa5ef92a388f326f3d8cf626cec2dc100ad3f4eaf4ef7d5e658596fc8af9a4c3273bcc54112c910ee65a67d83fcb77fe93878da8870a9a34b6c250e9b9fc9311a67a2f34f6584492c7cfcbea9785e50192181a49e171d23fae6f90473deb27042dea50e23d8928039ef0c902f37a2ca51dc06b04213054d6c1bebb46483d9cc73ee044d006ce9f71e6b399ecddc786e795fe4482e6c503593a57153aaef6cd0c916f4fd4e9fea7a242af7b64d29d62e386baeaa511dbab09c1f59cbe2cd527b254f253577361ef65c64377f61a65d470b0092eb0efaaeb2d6ba5b095f
JWT_ISSUER=https://wujha-idp-production.up.railway.app
JWT_AUDIENCE=holding-internal-apps

# MongoDB
MONGODB_URI=mongodb://mongo:ZVqaXNBlFhirrwggRYjyuWykTnzetgqa@switchback.proxy.rlwy.net:44301

# Environment
NODE_ENV=development
```

**⚠️ CRITICAL:** The `JWT_SECRET` must match the IdP's secret exactly, character-for-character.

## How It Works

### Authentication Flow

1. **User visits PMO app** → Redirected to `/auth/login`
2. **Login page** → Automatically redirects to IdP: `http://localhost:3001/auth/authorize?redirect_uri=...`
3. **User logs in at IdP** → IdP validates credentials
4. **IdP redirects back** → To `http://localhost:3000/auth/callback?code=...`
5. **Callback handler**:
   - Exchanges authorization code for JWT token
   - Verifies token signature, issuer, and audience
   - Sets `auth-token` HTTP-only cookie
   - Redirects to `/dashboard`
6. **Middleware** → Validates token on every protected request
7. **Logout** → Clears cookie and redirects to IdP logout

### Token Validation

The middleware validates tokens on every protected API request:
- Checks for token in cookies (primary) or Authorization header (fallback)
- Verifies JWT signature using shared secret
- Validates issuer and audience claims
- Extracts user info and adds to request headers:
  - `x-user-id`: User ID
  - `x-user-role`: User role
  - `x-user-email`: User email

### Accessing User Data

#### In Server Components:
```typescript
import { getAuthenticatedUser } from '@/lib/jwt';

export default async function MyPage() {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  return <div>Welcome, {user.email}</div>;
}
```

#### In API Routes:
```typescript
import { getAuthenticatedUserFromRequest } from '@/lib/jwt';

export async function GET(request: Request) {
  const user = await getAuthenticatedUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Or access via headers (set by middleware)
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  
  // Your logic here
}
```

#### In Client Components:
```typescript
// User data is available via the dashboard layout
// The middleware ensures authentication before rendering
```

## Testing Instructions

### 1. Start the IdP Server
```bash
cd holding-idp
PORT=3001 npm run dev
```

### 2. Start the PMO Application
```bash
cd pm_wujha
npm run dev
```

### 3. Test Login Flow
1. Visit `http://localhost:3000`
2. You should be redirected to the IdP login page at `http://localhost:3001`
3. Log in with one of the test credentials:
   - **Admin**: `admin@holding.com` / `admin123`
   - **HR**: `hr@holding.com` / `hr123`
   - **Manager**: `finance@holding.com` / `finance123`
   - **Employee**: `user@holding.com` / `user123`
4. After successful login, you should be redirected back to the PMO dashboard

### 4. Verify Token in Cookies
1. Open browser DevTools
2. Go to Application → Cookies → `http://localhost:3000`
3. You should see an `auth-token` cookie (HTTP-only)

### 5. Test Logout
1. Click the logout button in the dashboard
2. You should be redirected to IdP logout
3. Then redirected back to login page
4. Cookie should be cleared

### 6. Test Token Validation
1. Try accessing API endpoints directly
2. Without valid cookie, you should get 401 Unauthorized
3. With valid cookie, requests should succeed

## Troubleshooting

### Error: "Token exchange failed"
- ✅ Verify IdP is running on port 3001
- ✅ Check `JWT_SECRET` matches exactly between IdP and PMO
- ✅ Check browser console for detailed error messages
- ✅ Verify `JWT_ISSUER` and `JWT_AUDIENCE` are correct

### Infinite redirect loop
- ✅ Check middleware `PUBLIC_PATHS` includes `/auth/login` and `/auth/callback`
- ✅ Verify cookies are being set (DevTools → Application → Cookies)
- ✅ Clear browser cookies and try again

### "Invalid signature" error
- ✅ `JWT_SECRET` doesn't match between IdP and PMO
- ✅ Copy the secret again carefully (all 512 characters)
- ✅ No extra spaces or newlines in `.env.local`

### User data not available
- ✅ Check middleware is adding headers (`x-user-id`, `x-user-role`)
- ✅ Verify token payload contains expected fields
- ✅ Check console logs for token verification details

### Cookie not being set
- ✅ Verify callback handler is executing successfully
- ✅ Check if `secure: true` needs to be `false` in development
- ✅ Verify `sameSite: 'lax'` is appropriate for your setup

## What Was Removed

The following old authentication components are no longer used:
- ❌ Old login form with password input fields
- ❌ Password hashing/validation logic
- ❌ Local user authentication endpoints (can be kept for backward compatibility)
- ❌ Session creation logic (replaced by JWT cookies)
- ❌ localStorage token management (replaced by HTTP-only cookies)

## What Was Kept

The following components remain in the PMO app:
- ✅ Authorization logic (roles, permissions)
- ✅ User profile pages
- ✅ App-specific user data and settings
- ✅ Database queries for PMO-specific data
- ✅ Resource management
- ✅ Project management features
- ✅ All business logic

## Security Considerations

1. **HTTP-only Cookies**: Tokens are stored in HTTP-only cookies to prevent XSS attacks
2. **JWT Verification**: All tokens are verified with signature, issuer, and audience checks
3. **Secure Flag**: In production, cookies should use `secure: true` (HTTPS only)
4. **Token Expiration**: Tokens expire after 24 hours
5. **CORS**: Ensure proper CORS configuration between IdP and PMO app
6. **Secret Management**: Never commit the JWT_SECRET to version control

## Production Deployment

For production deployment, update `.env.local` (or use environment variables):

```env
NEXT_PUBLIC_IDP_URL=https://your-idp-domain.com
NEXT_PUBLIC_APP_URL=https://your-pmo-domain.com
JWT_SECRET=<same-as-idp>
JWT_ISSUER=https://wujha-idp-production.up.railway.app
JWT_AUDIENCE=holding-internal-apps
MONGODB_URI=<your-production-mongodb-uri>
NODE_ENV=production
```

Also update the cookie settings in `app/auth/callback/route.ts`:
```typescript
response.cookies.set('auth-token', token, {
  httpOnly: true,
  secure: true, // Enable for production
  sameSite: 'lax',
  maxAge: 60 * 60 * 24,
  path: '/',
});
```

## Support

If you encounter any issues:
1. Check the browser console for client-side errors
2. Check the terminal/server logs for server-side errors
3. Verify all environment variables are set correctly
4. Ensure IdP and PMO are both running
5. Test with different browsers or in incognito mode

## Summary

✅ IdP integration is complete and ready for testing
✅ All authentication flows use the centralized IdP
✅ HTTP-only cookies provide secure session management
✅ Middleware validates tokens on all protected routes
✅ Backward compatibility maintained for API keys
✅ User data is accessible in both server and client components
