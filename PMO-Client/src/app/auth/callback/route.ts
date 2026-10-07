import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { jwtVerify } from 'jose';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const IDP_URL = process.env.NEXT_PUBLIC_IDP_URL || 'http://localhost:3001';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const HR_URL = process.env.NEXT_PUBLIC_HR_URL || 'http://localhost:3002';
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE;

// Helper function to map IdP role to local role_id
async function getRoleIdByName(roleName: string): Promise<number> {
  const roleMap: { [key: string]: string } = {
    'admin': 'ADMIN',
    'manager': 'PJM',
    'hr': 'HR',
    'employee': 'EMP',
    'finance': 'FIN',
    'pmo': 'PMO',
  };

  const mappedRole = roleMap[roleName.toLowerCase()] || 'EMP';
  
  const role = await prisma.role.findFirst({
    where: { name: { equals: mappedRole, mode: 'insensitive' } }
  });

  if (!role) {
    // Fallback: find any role or return 1
    const defaultRole = await prisma.role.findFirst({
      orderBy: { role_id: 'asc' }
    });
    
    return defaultRole?.role_id || 1;
  }

  return role.role_id;
}

// Helper: update one user with full IdP data (IdP is source of truth).
// If another user holds the IdP email (duplicate row), free it with a placeholder so we can assign it to the canonical user.
async function updateUserFromIdP(
  user: {
    user_id: number;
    role_id?: number;
    account: { user_id: number; first_name: string; last_name: string } | null;
  },
  idpUser: any,
  roleId: number
) {
  const { email, firstName, lastName, role } = idpUser;
  const shouldUpdateRole = role.toLowerCase() === 'admin' && (user.role_id ?? 0) !== roleId;

  // Avoid unique constraint on email: if another user has this email, free it first (duplicate row)
  const otherWithEmail = await prisma.user.findFirst({
    where: { email, user_id: { not: user.user_id } },
    select: { user_id: true },
  });
  if (otherWithEmail) {
    const placeholder = `_deprecated_${otherWithEmail.user_id}_${Date.now()}@pmo.local`;
    await prisma.user.update({
      where: { user_id: otherWithEmail.user_id },
      data: { email: placeholder },
    });
    console.log('[Callback] Freed duplicate email for user_id=%d (placeholder: %s)', otherWithEmail.user_id, placeholder);
  }

  return prisma.user.update({
    where: { user_id: user.user_id },
    data: {
      email,
      idp_user_id: (idpUser.employee_id || idpUser.id).toString(),
      ...(shouldUpdateRole && { role_id: roleId }),
      status: 'active',
      account: user.account
        ? {
            update: {
              first_name: firstName || user.account.first_name,
              last_name: lastName || user.account.last_name,
              is_active: true,
            }
          }
        : {
            create: {
              first_name: firstName || 'Unknown',
              last_name: lastName || 'User',
              department: 'General',
              phone_number: null,
              is_active: true,
            }
          },
    },
    include: { account: true, role: true },
  });
}

// Helper function to sync/create user from IdP data.
// Lookup order: 1) by idp_user_id (canonical), 2) by email (then set idp if no conflict), 3) create new.
// IdP is source of truth; duplicate rows are avoided by preferring the user that already has this idp_user_id.
async function syncUserFromIdP(idpUser: any) {
  const { id, employee_id, email, firstName, lastName, role } = idpUser;
  const idpUserId = (employee_id || id).toString();
  const roleId = await getRoleIdByName(role);

  // 1) Find by idp_user_id first (canonical IdP-linked user)
  let user = await prisma.user.findFirst({
    where: { idp_user_id: idpUserId },
    include: { account: true, role: true },
  });

  if (user) {
    // Safeguard: idp_user_id might be on the wrong row (e.g. data corruption or [object Object]).
    // If this user's email doesn't match IdP and another user has the IdP email, use the email-matched user instead.
    const idpEmail = email;
    const userWithIdpEmail = await prisma.user.findFirst({
      where: { email: idpEmail, user_id: { not: user.user_id } },
      include: { account: true, role: true },
    });
    if (userWithIdpEmail && user.email !== idpEmail) {
      console.log(
        '[Callback] idp_user_id on wrong row: user_id=%d (%s) has idp id but IdP email belongs to user_id=%d (%s). Clearing wrong row and using email-matched user.',
        user.user_id,
        user.email,
        userWithIdpEmail.user_id,
        userWithIdpEmail.email
      );
      await prisma.user.update({
        where: { user_id: user.user_id },
        data: { idp_user_id: null },
      });
      user = userWithIdpEmail;
      // Fall through to "found by email" path: link idp_user_id and sync (below we'll set idp_user_id on user)
    } else {
      // Normal case: idp_user_id is on the correct row
      console.log('[Callback] User found by idp_user_id, syncing from IdP:', user.user_id);
      const needsUpdate =
        user.email !== email ||
        user.idp_user_id !== idpUserId ||
        user.status !== 'active' ||
        (user.account &&
          (user.account.first_name !== firstName || user.account.last_name !== lastName)) ||
        (role.toLowerCase() === 'admin' && user.role_id !== roleId);

      if (needsUpdate) {
        user = await updateUserFromIdP(user as any, idpUser, roleId);
        console.log('[Callback] User updated from IdP:', user.user_id);
      }
      return user;
    }
  }

  // 2) Not found by idp_user_id: try by email
  user = await prisma.user.findFirst({
    where: { email },
    include: { account: true, role: true },
  });

  if (user) {
    // Another user might already have this idp_user_id (duplicate row from the past)
    const existingByIdp = await prisma.user.findFirst({
      where: { idp_user_id: idpUserId, user_id: { not: user.user_id } },
    });

    if (existingByIdp) {
      console.log(
        '[Callback] Duplicate: user by email (user_id=%d) vs user by idp_user_id (user_id=%d); using canonical IdP user',
        user.user_id,
        existingByIdp.user_id
      );
      // Use the canonical user (the one that already has this idp_user_id) and sync IdP data to them
      const canonical = await prisma.user.findFirst({
        where: { idp_user_id: idpUserId },
        include: { account: true, role: true },
      });
      if (canonical) {
        const updated = await updateUserFromIdP(canonical as any, idpUser, roleId);
        console.log('[Callback] Canonical user updated from IdP. Consider merging/deleting duplicate user_id=%d', user.user_id);
        return updated;
      }
    }

    // Safe to link this user to IdP and sync
    console.log('[Callback] User found by email, linking idp_user_id and syncing:', user.user_id);
    user = await updateUserFromIdP(user as any, idpUser, roleId);
    return user;
  }

  // 3) Create new user
  console.log('[Callback] Creating new user from IdP:', email);
  const baseUsername = email.split('@')[0];
  let username = baseUsername;
  const existingUsername = await prisma.user.findUnique({
    where: { username: baseUsername },
  });
  if (existingUsername) {
    username = `${baseUsername}_${Date.now()}`;
  }

  user = await prisma.user.create({
    data: {
      username,
      email,
      password_hash: 'SSO_USER',
      role_id: roleId,
      status: 'active',
      idp_user_id: idpUserId,
      account: {
        create: {
          first_name: firstName || 'Unknown',
          last_name: lastName || 'User',
          department: 'General',
          phone_number: null,
          is_active: true,
        },
      },
    },
    include: { account: true, role: true },
  });
  console.log('[Callback] User created:', user.user_id, 'IdP ID:', idpUserId);
  return user;
}

export async function GET(request: NextRequest) {
  console.log('[Callback] Request received');
  
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('[Callback] Error from IdP:', error);
    return NextResponse.redirect(
      `${APP_URL}/auth/login?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    console.error('[Callback] No authorization code received');
    return NextResponse.redirect(
      `${APP_URL}/auth/login?error=no_code`
    );
  }

  try {
    console.log('[Callback] Exchanging code for token...');
    
    // Exchange authorization code for JWT token
    // The IdP uses /auth/api/auth/token with grant_type parameter
    const tokenResponse = await axios.post(
      `${IDP_URL}/auth/api/auth/token`,
      {
        grant_type: 'authorization_code',
        code: code,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const { accessToken, success, user: idpUser } = tokenResponse.data;
    
    if (!success || !accessToken) {
      throw new Error('Token exchange failed: No access token received');
    }

    console.log('[Callback] Token received, user data:', idpUser ? 'present' : 'missing');
    console.log('[Callback] Verifying token...');

    // Verify the JWT token
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(accessToken, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    console.log('[Callback] Token verified successfully:', {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    });

    const userData = await axios.get(`${HR_URL}/users?search=${payload?.email}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const {success: successHR, data: raw} = userData.data;
    const hrUser = Array.isArray(raw) ? raw[0] : raw;
    console.log('[Callback] HR user data:', hrUser);

    // Sync/Create user in local database
    let syncedUser;
    try {
      // Try to get user data from response first, fallback to JWT payload
      const userData = {
        id: hrUser?._id ?? payload.sub,
        employee_id: hrUser?.employee_id ?? hrUser?._id ?? payload.sub,
        email: hrUser?.email ?? payload.email,
        firstName: hrUser?.firstName ?? (payload as any)?.firstName ?? (typeof payload?.name === 'string' && payload.name ? (payload.name as string).split(' ')[0] : 'Unknown'),
        lastName: hrUser?.lastName ?? (payload as any)?.lastName ?? (typeof payload?.name === 'string' && payload.name ? (payload.name as string).split(' ').slice(1).join(' ') : 'User'),
        role: hrUser?.role ?? payload?.role ?? 'employee',
      };
      
      await syncUserFromIdP(userData);
      console.log('[Callback] User synced successfully');

      // Get the user_id (same order as sync: idp_user_id first, then email)
      const idpSub = payload.sub?.toString();
      syncedUser = await prisma.user.findFirst({
        where: idpSub ? { idp_user_id: idpSub } : { email: payload.email as string },
        select: { user_id: true },
      });
      if (!syncedUser && payload.email) {
        syncedUser = await prisma.user.findFirst({
          where: { email: payload.email as string },
          select: { user_id: true },
        });
      }
      
      if (!syncedUser) {
        throw new Error('User sync succeeded but user not found in database');
      }
      
      console.log('[Callback] User ID from DB:', syncedUser.user_id);
    } catch (syncError: any) {
      console.error('[Callback] User sync failed:', syncError.message);
      console.error('[Callback] Sync error details:', syncError);
      // If sync fails, we can't proceed without user_id
      return NextResponse.redirect(
        `${APP_URL}/auth/login?error=user_sync_failed`
      );
    }

    // Redirect to client page with token in URL parameter
    // The client page will store it in localStorage
    const completeUrl = new URL('/auth/callback/complete', APP_URL);
    completeUrl.searchParams.set('token', accessToken);
    
    const response = NextResponse.redirect(completeUrl.toString());
    
    // Also set cookies as backup (optional but recommended for security)
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      ...(isProduction && process.env.COOKIE_DOMAIN && {
        domain: process.env.COOKIE_DOMAIN
      })
    };
    
    response.cookies.set('auth-token', accessToken, cookieOptions);
    response.cookies.set('pmo-user-id', syncedUser.user_id.toString(), cookieOptions);

    console.log('[Callback] Redirecting to complete page with token');
    
    return response;
  } catch (error: any) {
    console.error('[Callback] Token exchange failed:', error.response?.data || error.message);
    return NextResponse.redirect(
      `${APP_URL}/auth/login?error=token_exchange_failed`
    );
  } finally {
    await prisma.$disconnect();
  }
}
