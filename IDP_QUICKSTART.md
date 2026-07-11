# IdP Integration - Quick Start Guide

## 🚀 Quick Start (5 Minutes)

### 1. Environment Setup (Already Done ✅)
The `.env.local` file has been created with all required configuration.

### 2. Start the Servers

**Terminal 1 - Start IdP:**
```bash
cd holding-idp
PORT=3001 npm run dev
```

**Terminal 2 - Start PMO:**
```bash
cd pm_wujha
npm run dev
```

### 3. Test Login

1. Open browser: `http://localhost:3000`
2. You'll be redirected to IdP login at `http://localhost:3001`
3. Use test credentials:
   - **Admin**: `admin@holding.com` / `admin123`
   - **HR**: `hr@holding.com` / `hr123`
   - **Finance**: `finance@holding.com` / `finance123`
   - **User**: `user@holding.com` / `user123`
4. After login, you'll be redirected back to PMO dashboard

### 4. Verify Integration

✅ Check browser cookies (DevTools → Application → Cookies):
   - Should see `auth-token` cookie

✅ Test logout:
   - Click logout button
   - Should clear cookie and return to login

✅ Test protected routes:
   - Without cookie → 401 Unauthorized
   - With cookie → Access granted

## 📁 Files Changed

### New Files Created:
- `app/auth/callback/route.ts` - OAuth callback handler
- `app/auth/logout/route.ts` - Logout endpoint
- `.env.local` - Environment configuration
- `IDP_INTEGRATION_COMPLETE.md` - Full documentation
- `IDP_QUICKSTART.md` - This file

### Modified Files:
- `app/auth/login/page.tsx` - Now redirects to IdP
- `middleware.ts` - Validates IdP tokens
- `lib/jwt.ts` - Added IdP token verification
- `components/layout/DashboardLayout.tsx` - Updated logout handler

## 🔑 Key Features

1. **Single Sign-On (SSO)**: One login for all holding company apps
2. **Secure Sessions**: HTTP-only cookies prevent XSS attacks
3. **JWT Validation**: Tokens verified with signature, issuer, and audience
4. **Seamless Integration**: Works with existing PMO features
5. **Backward Compatible**: API key authentication still works for finance routes

## 🐛 Common Issues

### "Token exchange failed"
```bash
# Fix: Verify IdP is running
curl http://localhost:3001/health

# Check JWT_SECRET matches (first 20 chars)
grep JWT_SECRET .env.local | cut -c 1-40
```

### Infinite redirect loop
```bash
# Fix: Clear browser cookies and try again
# Or check middleware PUBLIC_PATHS includes:
# - /auth/login
# - /auth/callback  
# - /auth/logout
```

### Cookie not set
```bash
# Fix: Check callback handler logs in terminal
# Verify token is being received from IdP
# Check browser allows cookies (not in strict mode)
```

## 📊 Testing Checklist

- [ ] IdP starts on port 3001
- [ ] PMO starts on port 3000
- [ ] Login redirects to IdP
- [ ] Can log in with test credentials
- [ ] Redirects back to PMO dashboard
- [ ] Cookie is set in browser
- [ ] Can access protected pages
- [ ] Logout clears cookie
- [ ] Cannot access protected pages after logout

## 🎯 Next Steps

1. **Test all user roles**: Verify permissions work correctly
2. **Test API endpoints**: Ensure middleware validates tokens
3. **Update UI components**: Add user profile display from IdP
4. **Production setup**: Update environment variables for production
5. **Security audit**: Review token validation and cookie settings

## 📚 Full Documentation

See `IDP_INTEGRATION_COMPLETE.md` for comprehensive documentation including:
- Detailed architecture explanation
- Token validation flow
- Accessing user data in components
- Security considerations
- Production deployment guide
- Troubleshooting section

## ✅ Integration Status

**Status**: ✅ COMPLETE - Ready for testing

All authentication flows now use the centralized IdP. The integration is complete and ready for testing.

## 🆘 Need Help?

1. Check terminal logs for detailed error messages
2. Check browser console for client-side errors
3. Review `IDP_INTEGRATION_COMPLETE.md` for troubleshooting
4. Verify `.env.local` configuration matches IdP settings

---

**Last Updated**: Implementation completed with full SSO integration
