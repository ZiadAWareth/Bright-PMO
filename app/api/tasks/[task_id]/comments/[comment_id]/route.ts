import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Helper function to extract mentions from message
function extractMentions(message: string): string[] {
  // Updated regex to include hyphens, dots, and other common username characters
  const mentionRegex = /@([\w\-\.]+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(message)) !== null) {
    mentions.push(match[1]); // username
  }

  return [...new Set(mentions)]; // Remove duplicates
}

// Helper function to convert usernames to user IDs
async function getUserIdsByUsernames(usernames: string[]): Promise<number[]> {
  if (usernames.length === 0) return [];
  
  const users = await prisma.user.findMany({
    where: {
      username: {
        in: usernames
      }
    },
    select: {
      user_id: true
    }
  });

  return users.map(user => user.user_id);
}

// GET individual comment
export async function GET(
  request: Request,
  context: { params: Promise<{ task_id: string; comment_id: string }> }
) {
  const resolvedParams = await context.params;
  const { task_id: taskIdString, comment_id: commentIdString } = resolvedParams;
  const taskId = parseInt(taskIdString);
  const commentId = parseInt(commentIdString);

  try {
    const comment = await prisma.taskComment.findFirst({
      where: {
        comment_id: commentId,
        task_id: taskId
      },
      include: {
        author: {
          select: {
            user_id: true,
            username: true,
            email: true,
            account: {
              select: {
                first_name: true,
                last_name: true
              }
            }
          }
        },
        mentions: {
          include: {
            mentioned_user: {
              select: {
                user_id: true,
                username: true,
                email: true,
                account: {
                  select: {
                    first_name: true,
                    last_name: true
                  }
                }
              }
            }
          }
        },
        replies: {
          include: {
            author: {
              select: {
                user_id: true,
                username: true,
                email: true,
                account: {
                  select: {
                    first_name: true,
                    last_name: true
                  }
                }
              }
            }
          },
          orderBy: { created_at: 'asc' }
        }
      }
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
    }

    return NextResponse.json(comment, { status: 200 });
  } catch (error) {
    console.error('Error fetching comment:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// UPDATE comment
export async function PUT(
  request: Request,
  context: { params: Promise<{ task_id: string; comment_id: string }> }
) {
  const requestHeaders = request.headers;
  const userId = requestHeaders.get('x-user-id');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID not provided in headers.' }, { status: 400 });
  }

  const resolvedParams = await context.params;
  const { task_id: taskIdString, comment_id: commentIdString } = resolvedParams;
  const taskId = parseInt(taskIdString);
  const commentId = parseInt(commentIdString);
  const body = await request.json();

  if (!body.message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  try {
    // Check if comment exists and user owns it
    const existingComment = await prisma.taskComment.findFirst({
      where: {
        comment_id: commentId,
        task_id: taskId,
        author_id: parseInt(userId)
      }
    });

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found or you do not have permission to edit it.' }, { status: 404 });
    }

    // Extract mentions from the updated message
    const mentionUsernames = extractMentions(body.message);
    const mentionUserIds = await getUserIdsByUsernames(mentionUsernames);

    // Update the comment
    const updatedComment = await prisma.taskComment.update({
      where: { comment_id: commentId },
      data: {
        message: body.message,
        mentioned_users: mentionUserIds,
        is_edited: true
      },
      include: {
        author: {
          select: {
            user_id: true,
            username: true,
            email: true,
            account: {
              select: {
                first_name: true,
                last_name: true
              }
            }
          }
        }
      }
    });

    // Delete old mentions and create new ones
    await prisma.commentMention.deleteMany({
      where: { comment_id: commentId }
    });

    if (mentionUserIds.length > 0) {
      await prisma.commentMention.createMany({
        data: mentionUserIds.map(mentionedUserId => ({
          comment_id: commentId,
          mentioned_user_id: mentionedUserId
        }))
      });

      // Create notifications for newly mentioned users
      await prisma.notification.createMany({
        data: mentionUserIds.map(mentionedUserId => ({
          user_id: mentionedUserId,
          type: 'TASK_UPDATE',
          title: 'You were mentioned in an updated comment',
          message: `${updatedComment.author.username} mentioned you in an updated task comment`,
          priority: 'MEDIUM',
          metadata: {
            task_id: taskId,
            comment_id: commentId,
            author_id: parseInt(userId),
            message_preview: body.message.substring(0, 100)
          },
          created_by_id: parseInt(userId)
        }))
      });
    }

    return NextResponse.json(updatedComment, { status: 200 });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE comment
export async function DELETE(
  request: Request,
  context: { params: Promise<{ task_id: string; comment_id: string }> }
) {
  const requestHeaders = request.headers;
  const userId = requestHeaders.get('x-user-id');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID not provided in headers.' }, { status: 400 });
  }

  const resolvedParams = await context.params;
  const { task_id: taskIdString, comment_id: commentIdString } = resolvedParams;
  const taskId = parseInt(taskIdString);
  const commentId = parseInt(commentIdString);

  try {
    // Check if comment exists and user owns it
    const existingComment = await prisma.taskComment.findFirst({
      where: {
        comment_id: commentId,
        task_id: taskId,
        author_id: parseInt(userId)
      }
    });

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found or you do not have permission to delete it.' }, { status: 404 });
    }

    // Delete the comment (mentions will be cascade deleted)
    await prisma.taskComment.delete({
      where: { comment_id: commentId }
    });

    return NextResponse.json({ message: 'Comment deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 