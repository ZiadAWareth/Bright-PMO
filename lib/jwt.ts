import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function createToken(payload: any) {
  try {
    const issuer = process.env.JWT_ISSUER?.trim() || undefined;
    const audience = process.env.JWT_AUDIENCE?.trim() || undefined;

    let builder = new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h');

    if (issuer) builder = builder.setIssuer(issuer);
    if (audience) builder = builder.setAudience(audience);

    const token = await builder.sign(secret);

    return token;
  } catch (error) {
    console.error('Error creating token:', error);
    throw new Error('Failed to create token');
  }
}

export async function verifyToken(token: string) {
  try {
    if (!token) {
      return null;
    }

    const verifyOpts: { issuer?: string; audience?: string } = {};
    const iss = process.env.JWT_ISSUER?.trim();
    const aud = process.env.JWT_AUDIENCE?.trim();
    if (iss) verifyOpts.issuer = iss;
    if (aud) verifyOpts.audience = aud;

    const { payload } = await jwtVerify(token, secret, verifyOpts);
    return payload;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// This function should be used in API routes or Server Components
export function getTokenFromRequest(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  } catch (error) {
    console.error('Error getting token from request:', error);
    return null;
  }
}

// Get authenticated user from cookies (for Server Components)
export async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }
    
    const payload = await verifyToken(token);
    return payload;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

// Get authenticated user from request (for API routes)
export async function getAuthenticatedUserFromRequest(request: Request) {
  try {
    // Try cookie first
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      const token = cookies['auth-token'];
      if (token) {
        const payload = await verifyToken(token);
        return payload;
      }
    }
    
    // Fall back to Authorization header
    const token = getTokenFromRequest(request);
    if (token) {
      const payload = await verifyToken(token);
      return payload;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting authenticated user from request:', error);
    return null;
  }
} 