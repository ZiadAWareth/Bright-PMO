import { headers } from 'next/headers';

/**
 * Extracts user information from middleware headers
 * Must be used in API routes that are protected by middleware
 */
export async function getUserFromHeaders() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userRole = headersList.get('x-user-role');

  if (!userId) {
    throw new Error('User ID not found in headers - ensure route is protected by middleware');
  }

  return {
    userId: parseInt(userId),
    role: (userRole || 'unknown').toUpperCase()
  };
}

/**
 * Type for user information extracted from headers
 */
export interface AuthUser {
  userId: number;
  role: string;
} 