"use client";

import React from "react";
import { Reply } from "lucide-react";
import MentionTextarea from "@/components/MentionTextarea";
import type { Comment } from "./types";
import { Spinner } from "@/components/ui/spinner";

export const renderCommentContent = (message: string, mentions: any[]) => {
  return message
    .replace(/@\[([^\]]+)\]\(([^)]+)\)/g, (match, display, username) => {
      const cleanDisplay = display.trim();
      return `<span class="text-info font-medium">@${cleanDisplay}</span>`;
    })
    .replace(/@([A-Za-z0-9_-]+)/g, (match, username) => {
      if (mentions) {
        const mentionedUser = mentions.find(
          (mention) => mention.mentioned_user.username === username
        );
        if (mentionedUser && mentionedUser.mentioned_user.account) {
          const firstName = mentionedUser.mentioned_user.account.first_name || '';
          const lastName = mentionedUser.mentioned_user.account.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          if (fullName) {
            return `<span class="text-info font-medium">@${fullName}</span>`;
          }
        }
      }

      return `<span class="text-info font-medium">@${username}</span>`;
    });
};

const CommentThread = ({
  comment,
  onReply,
  replyingTo,
  replyText,
  setReplyText,
  onAddReply,
  onCancelReply,
  isAddingReply,
  projectId,
  currentUserId,
}: {
  comment: Comment;
  onReply: (commentId: number) => void;
  replyingTo: number | null;
  replyText: string;
  setReplyText: (text: string) => void;
  onAddReply: (parentId: number) => void;
  onCancelReply: () => void;
  isAddingReply: boolean;
  projectId: string;
  currentUserId: number | null;
}) => {
  const getAuthorInitials = (author: any) => {
    if (author.account && author.account.first_name && author.account.last_name) {
      const firstInitial = author.account.first_name[0] || '';
      const lastInitial = author.account.last_name[0] || '';
      if (firstInitial && lastInitial) {
        return `${firstInitial}${lastInitial}`.toUpperCase();
      }
    }
    if (author.username) {
      return author.username.substring(0, 2).toUpperCase();
    }
    return '??';
  };

  const getAuthorName = (author: any) => {
    if (author.account) {
      const firstName = author.account.first_name || '';
      const lastName = author.account.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName) {
        return fullName;
      }
    }
    return author.username || 'Unknown User';
  };

  return (
    <div className="border border-line rounded-lg p-4">
      {/* Main Comment */}
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 rounded-full bg-info flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
          {getAuthorInitials(comment.author)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-ink">
                {getAuthorName(comment.author)}
              </span>
              {comment.is_edited && (
                <span className="text-xs text-muted">(edited)</span>
              )}
            </div>
            <span className="text-sm text-muted">
              {new Date(comment.created_at).toLocaleDateString()}{" "}
              {new Date(comment.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div
            className="text-ink-3 mb-2"
            dangerouslySetInnerHTML={{
              __html: renderCommentContent(
                comment.message,
                comment.mentions || []
              ),
            }}
          />

          {/* Reply Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onReply(comment.comment_id)}
              className="flex items-center space-x-1 text-xs text-muted hover:text-info transition-colors"
            >
              <Reply size={12} />
              <span>Reply</span>
            </button>
            {comment.replies && comment.replies.length > 0 && (
              <span className="text-xs text-muted">
                {comment.replies.length}{" "}
                {comment.replies.length === 1 ? "reply" : "replies"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reply Form */}
      {replyingTo === comment.comment_id && (
        <div className="mt-4 ml-11">
          <MentionTextarea
            value={replyText}
            onChange={setReplyText}
            onSubmit={() => onAddReply(comment.comment_id)}
            placeholder="Write a reply... Type @ to mention team members"
            projectId={projectId}
            disabled={isAddingReply}
            rows={2}
          />
          <div className="flex items-center justify-end space-x-2 mt-2">
            <button
              onClick={onCancelReply}
              className="px-3 py-1 text-sm text-muted hover:text-ink-3 transition-colors"
              disabled={isAddingReply}
            >
              Cancel
            </button>
            <button
              onClick={() => onAddReply(comment.comment_id)}
              disabled={!replyText.trim() || isAddingReply}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-info text-white rounded hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddingReply && (
                <Spinner size={12} />
              )}
              <Reply size={12} />
              <span>Reply</span>
            </button>
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 ml-11 space-y-3">
          {comment.replies.map((reply) => (
            <div
              key={reply.comment_id}
              className="flex items-start space-x-3 bg-surface-2 rounded-lg p-3"
            >
              <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {getAuthorInitials(reply.author)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-ink">
                      {getAuthorName(reply.author)}
                    </span>
                    {reply.is_edited && (
                      <span className="text-xs text-muted">(edited)</span>
                    )}
                  </div>
                  <span className="text-xs text-muted">
                    {new Date(reply.created_at).toLocaleDateString()}{" "}
                    {new Date(reply.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  className="text-sm text-muted"
                  dangerouslySetInnerHTML={{
                    __html: renderCommentContent(
                      reply.message,
                      reply.mentions || []
                    ),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentThread;
