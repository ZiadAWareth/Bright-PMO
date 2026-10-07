import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromHeaders } from "@/lib/auth-helpers";

// Helper function to extract mentions from message
function extractMentions(message: string): string[] {
  const mentions: string[] = [];
  
  // First, try to extract from @[DisplayName](username) format
  const formattedMentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = formattedMentionRegex.exec(message)) !== null) {
    mentions.push(match[2]); // username is in the second capture group
  }
  
  // Also extract simple @username mentions (fallback for manually typed mentions)
  const simpleMentionRegex = /@([\w\-\.]+)/g;
  while ((match = simpleMentionRegex.exec(message)) !== null) {
    // Only add if not already in mentions and not part of formatted mention
    const username = match[1];
    const beforeMatch = message.substring(0, match.index);
    const afterMatch = message.substring(match.index + match[0].length);
    
    // Check if this is part of a formatted mention
    const isFormatted = beforeMatch.endsWith('[') || afterMatch.startsWith('](');
    
    if (!isFormatted && !mentions.includes(username)) {
      mentions.push(username);
    }
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

// Helper function to build comment tree
function buildCommentTree(comments: any[]): any[] {
  const commentMap = new Map<number, any>();
  const rootComments: any[] = [];

  // First pass: create a map of all comments
  comments.forEach(comment => {
    commentMap.set(comment.comment_id, {
      ...comment,
      replies: []
    });
  });

  // Second pass: build the tree structure
  comments.forEach(comment => {
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies.push(commentMap.get(comment.comment_id));
      }
    } else {
      rootComments.push(commentMap.get(comment.comment_id));
    }
  });

  return rootComments;
}

export async function GET(
  request: Request,  
  context: { params: Promise<{ task_id: string }> }
) {
  const resolvedParams = await context.params;
  const { task_id: taskIdString } = resolvedParams;
  const taskId = parseInt(taskIdString);

  try {
    const comments = await prisma.taskComment.findMany({
      where: { task_id: taskId },
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
        }
      },
      orderBy: { created_at: 'asc' }
    });

    if (!comments || comments.length === 0) {
      return NextResponse.json({ comments: [], total: 0 }, { status: 200 });
    }

    const commentTree = buildCommentTree(comments);

    return NextResponse.json({
      comments: commentTree,
      total: comments.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ task_id: string }> }
) {
  let userId: number;
  try {
    const authUser = await getUserFromHeaders();
    userId = authUser.userId;
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await context.params;
  const { task_id: taskIdString } = resolvedParams;
  const taskId = parseInt(taskIdString);
  const body = await request.json();

  if (!body.message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  try {
    // Extract mentions from the message
    const mentionUsernames = extractMentions(body.message);
    const mentionUserIds = await getUserIdsByUsernames(mentionUsernames);

    // Create the comment
    const newComment = await prisma.taskComment.create({
      data: {
        task_id: taskId,
        author_id: userId,
        parent_id: body.parent_id || null,
        message: body.message,
        mentioned_users: mentionUserIds
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

    // Create mention records
    if (mentionUserIds.length > 0) {
      await prisma.commentMention.createMany({
        data: mentionUserIds.map(mentionedUserId => ({
          comment_id: newComment.comment_id,
          mentioned_user_id: mentionedUserId
        }))
      });

      // Create notifications for mentioned users
      await prisma.notification.createMany({
        data: mentionUserIds.map(mentionedUserId => ({
          user_id: mentionedUserId,
          type: 'TASK_UPDATE',
          title: 'You were mentioned in a comment',
          message: `${newComment.author.username} mentioned you in a task comment`,
          priority: 'MEDIUM',
          metadata: {
            task_id: taskId,
            comment_id: newComment.comment_id,
            author_id: userId,
            message_preview: body.message.substring(0, 100)
          },
          created_by_id: userId
        }))
      });
    }

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 