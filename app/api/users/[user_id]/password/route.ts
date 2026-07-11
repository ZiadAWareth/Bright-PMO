import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// Update user password
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  try {
    const { userId, role } = await getUserFromHeaders();
    const resolvedParams = await context.params;
    const { user_id } = resolvedParams;

    // Ensure user can only update their own password
    if (userId !== parseInt(user_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { currentPassword, newPassword } = await request.json();
    
    // Get the user with their current password hash
    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(user_id) },
      select: { password_hash: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid current password' }, { status: 401 });
    }
    
    // Hash and update the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { user_id: parseInt(user_id) },
      data: { password_hash: hashedPassword }
    });

    return NextResponse.json({ message: 'Password updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    );
  }
} 