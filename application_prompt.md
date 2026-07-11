Searched codebase for "Great now I have another appliction for finanical managament that I need to use the same idp ! I need you to give me a prompt that will be given to an AI agent so it can use the idp the same way ! I need to inlcude which urls to be called and the expected resposne and ask the agent to check if the application use cookies based auth system or local/session storage based so it donsn't take much time ! I need it to be cleand detiled and straight to the point please ! ", 28 results

Read changed files in [](file:///Users/admin/repos/pm_wujha)

# IdP SSO Integration Prompt for AI Agent

## Objective
Integrate this financial management application with the centralized Identity Provider (IdP) for Single Sign-On (SSO). The IdP is already running and tested with another application (PMO).

---

## Pre-Integration Assessment

**FIRST, check the current authentication system:**

1. **Identify current auth storage mechanism:**
   - Search for `localStorage.setItem('token'` or `localStorage.getItem('token'`
   - Search for `sessionStorage.setItem('token'` or `sessionStorage.getItem('token'`
   - Search for `document.cookie` or `cookies.set('auth`
   - Check axios/fetch configurations for `withCredentials` setting

2. **Locate authentication files:**
   - Find login page (likely login or `/pages/login`)
   - Find API authentication routes (likely auth or `/api/auth`)
   - Find middleware/auth guards (likely middleware.ts or auth utility files)
   - Find JWT verification logic (search for `jwtVerify`, `jwt.verify`, or `verifyToken`)

3. **Report findings:**
   ```
   Current Auth System:
   - Storage: [localStorage | sessionStorage | cookies]
   - Login Flow: [describe current flow]
   - Token Validation: [where and how tokens are validated]
   ```

---

## IdP Configuration

### Environment Variables Required
Add these to .env.local:

```env
# IdP Integration
NEXT_PUBLIC_IDP_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to your app's URL

# JWT Configuration (CRITICAL: Must match exactly)
JWT_SECRET=c7f79b1926e72189aca001c0cf8366ac2ca56c959c8075c29259b10ac54a8152b90b632aa5ef92a388f326f3d8cf626cec2dc100ad3f4eaf4ef7d5e658596fc8af9a4c3273bcc54112c910ee65a67d83fcb77fe93878da8870a9a34b6c250e9b9fc9311a67a2f34f6584492c7cfcbea9785e50192181a49e171d23fae6f90473deb27042dea50e23d8928039ef0c902f37a2ca51dc06b04213054d6c1bebb46483d9cc73ee044d006ce9f71e6b399ecddc786e795fe4482e6c503593a57153aaef6cd0c916f4fd4e9fea7a242af7b64d29d62e386baeaa511dbab09c1f59cbe2cd527b254f253577361ef65c64377f61a65d470b0092eb0efaaeb2d6ba5b095f
JWT_ISSUER=https://wujha-idp-production.up.railway.app
JWT_AUDIENCE=holding-internal-apps

# Environment
NODE_ENV=development
```

⚠️ **CRITICAL**: `JWT_SECRET` must be copied exactly (all 512 characters).

---

## IdP API Endpoints & Expected Responses

### 1. Login Redirect URL
**Redirect user to:**
```
{IDP_URL}/login?redirect_uri={YOUR_APP_URL}/auth/callback
```

Example:
```
http://localhost:3001/login?redirect_uri=http://localhost:3000/auth/callback
```

**User Experience:**
- User sees IdP login page
- After successful login, IdP redirects to your callback URL with `?code=xyz123`

---

### 2. Token Exchange Endpoint
**Endpoint:** `POST {IDP_URL}/auth/api/auth/token`

**Request:**
```json
{
  "grant_type": "authorization_code",
  "code": "xyz123"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "employee_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "finance",
    "department": "Finance"
  }
}
```

**JWT Token Payload (when decoded):**
```json
{
  "sub": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "finance",
  "iss": "https://wujha-idp-production.up.railway.app",
  "aud": "holding-internal-apps",
  "iat": 1643723400,
  "exp": 1643809800
}
```

---

### 3. Logout Endpoint
**Endpoint:** `GET {IDP_URL}/auth/api/auth/logout?redirect_uri={YOUR_APP_URL}/auth/login`

**Expected Behavior:**
- Clears IdP session
- Redirects user to specified `redirect_uri`

---

## Implementation Steps

### Step 1: Update Login Page
**Action:** Modify login page to redirect to IdP instead of showing login form.

```typescript
// app/auth/login/page.tsx (or equivalent)
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const IDP_URL = process.env.NEXT_PUBLIC_IDP_URL || 'http://localhost:3001';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default function LoginPage() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      console.error('Auth error:', error);
      // Show error message
      return;
    }

    // Redirect to IdP
    const redirectUri = `${APP_URL}/auth/callback`;
    const idpLoginUrl = `${IDP_URL}/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    window.location.href = idpLoginUrl;
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Redirecting to login...</div>
    </div>
  );
}
```

---

### Step 2: Create OAuth Callback Handler
**Action:** Create route.ts to handle IdP redirect.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { jwtVerify } from 'jose';

const IDP_URL = process.env.NEXT_PUBLIC_IDP_URL!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_ISSUER = process.env.JWT_ISSUER;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${APP_URL}/auth/login?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/auth/login?error=no_code`);
  }

  try {
    // Exchange code for token
    const tokenResponse = await axios.post(
      `${IDP_URL}/auth/api/auth/token`,
      { grant_type: 'authorization_code', code },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const { accessToken, success, user } = tokenResponse.data;
    
    if (!success || !accessToken) {
      throw new Error('Token exchange failed');
    }

    // Verify JWT
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(accessToken, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    console.log('User authenticated:', payload);

    // TODO: Sync user with local database if needed
    // await syncUserFromIdP(user);

    // Set HTTP-only cookie
    const response = NextResponse.redirect(`${APP_URL}/dashboard`);
    
    response.cookies.set('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Auth callback error:', error.message);
    return NextResponse.redirect(`${APP_URL}/auth/login?error=token_exchange_failed`);
  }
}
```

---

### Step 3: Update JWT Verification
**Action:** Update JWT verification to include issuer and audience validation.

```typescript
// lib/jwt.ts (or equivalent)
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });
    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// For Server Components
export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  if (!token) return null;
  
  return await verifyToken(token);
}

// For API Routes
export async function getAuthenticatedUserFromRequest(request: Request) {
  // Try cookie first
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, value] = c.trim().split('=');
        return [key, value];
      })
    );
    
    const token = cookies['auth-token'];
    if (token) {
      return await verifyToken(token);
    }
  }
  
  // Fallback to Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return await verifyToken(token);
  }
  
  return null;
}
```

---

### Step 4: Update Middleware
**Action:** Modify middleware to validate IdP tokens.

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/auth/login', '/auth/callback', '/auth/logout'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get token from cookie or Authorization header
  let token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET!;
    const secret = new TextEncoder().encode(JWT_SECRET);
    
    const { payload } = await jwtVerify(token, secret, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });

    // Add user info to request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub?.toString() || '');
    requestHeaders.set('x-user-role', payload.role as string || '');
    requestHeaders.set('x-user-email', payload.email as string || '');

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    // Add your protected routes here
  ],
};
```

---

### Step 5: Update Logout Handler
**Action:** Create logout page that clears cookies and redirects to IdP logout.

```typescript
// app/auth/logout/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const IDP_URL = process.env.NEXT_PUBLIC_IDP_URL || 'http://localhost:3001';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default function LogoutPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const globalLogout = searchParams.get('global') === 'true';
    
    // Clear localStorage/sessionStorage if used
    localStorage.removeItem('token');
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    if (globalLogout) {
      // Redirect to IdP logout
      const idpLogoutUrl = `${IDP_URL}/auth/api/auth/logout?redirect_uri=${encodeURIComponent(`${APP_URL}/auth/login`)}`;
      window.location.href = idpLogoutUrl;
    } else {
      // Local logout only
      window.location.href = '/auth/login';
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Logging out...</div>
    </div>
  );
}
```

---

### Step 6: Configure Axios (if applicable)
**Action:** Update axios to send cookies automatically.

```typescript
// lib/axios-config.ts
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || '';

// Handle 401 errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/auth/')) {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axios;
```

**Then import in root layout:**
```typescript
// app/layout.tsx
import '@/lib/axios-config';
```

---

## Testing Checklist

After implementation, verify:

- [ ] User redirects to IdP on visiting `/auth/login`
- [ ] After IdP login, user redirects back to your app
- [ ] Cookie `auth-token` is set in browser (check DevTools → Application → Cookies)
- [ ] Protected routes are accessible with valid cookie
- [ ] Protected routes return 401 without cookie
- [ ] Logout clears cookie and redirects to IdP logout
- [ ] Token validation includes issuer and audience checks
- [ ] User data is accessible in API routes via `getAuthenticatedUserFromRequest()`

---

## Test Credentials

Use these credentials to test login at IdP:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@holding.com` | `admin123` |
| Finance | `finance@holding.com` | `finance123` |
| HR | `hr@holding.com` | `hr123` |
| Employee | `user@holding.com` | `user123` |

---

## Common Issues & Solutions

### Issue: "Invalid signature" error
**Solution:** Verify `JWT_SECRET` matches exactly (all 512 characters, no spaces/newlines).

### Issue: Infinite redirect loop
**Solution:** Ensure middleware `PUBLIC_PATHS` includes `/auth/login`, `/auth/callback`, `/auth/logout`.

### Issue: Cookie not set
**Solution:** Check callback handler logs. Verify `secure: false` for local development.

### Issue: 401 on API calls
**Solution:** Ensure axios has `withCredentials: true` configured.

---

## Database User Sync (Optional)

If your app needs to sync IdP users to a local database:

```typescript
async function syncUserFromIdP(idpUser: any) {
  const { id, email, firstName, lastName, role } = idpUser;
  
  // Check if user exists
  let user = await db.user.findFirst({
    where: {
      OR: [
        { idp_user_id: id },
        { email: email }
      ]
    }
  });

  if (!user) {
    // Create new user
    user = await db.user.create({
      data: {
        idp_user_id: id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: role,
        status: 'active',
      }
    });
  } else {
    // Update existing user
    user = await db.user.update({
      where: { id: user.id },
      data: {
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: role,
        idp_user_id: id,
      }
    });
  }

  return user;
}
```

Call this function in the callback handler after token verification.

---

## Success Criteria

Integration is complete when:

1. ✅ Users authenticate via IdP (no local login form)
2. ✅ JWT tokens are validated with issuer + audience checks
3. ✅ Tokens stored in HTTP-only cookies (secure)
4. ✅ Middleware protects all routes correctly
5. ✅ Logout clears session both locally and at IdP
6. ✅ All test credentials work correctly
7. ✅ No more references to old localStorage/sessionStorage auth

---

## Deliverables

Provide:

1. **Summary of changes made** (which files modified/created)
2. **Current auth mechanism** (localStorage → cookies migration)
3. **Test results** (all checklist items passing)
4. **Any issues encountered** and how they were resolved

---

**Remember:** The IdP is already running and tested. Focus on modifying your financial app to integrate with it correctly. The JWT_SECRET, JWT_ISSUER, and JWT_AUDIENCE values are final and should not be changed.