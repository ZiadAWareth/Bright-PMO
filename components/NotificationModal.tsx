"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, X, Clock, User, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface NotificationModalProps {
  notification: {
    notification_id: number;
    type: string;
    title: string;
    message: string;
    priority: string;
    status: string;
    created_at: string;
    read_at?: string;
    metadata?: any;
    created_by?: {
      username: string;
      account?: {
        first_name: string;
        last_name: string;
      };
    };
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (notificationId: number) => void;
  onMarkAsRead?: (notificationId: number) => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  notification,
  isOpen,
  onClose,
  onDelete,
  onMarkAsRead,
}) => {
  const router = useRouter();
  const [navigationUrl, setNavigationUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  useEffect(() => {
    if (notification && isOpen) {
      getNavigationUrl();
    }
  }, [notification, isOpen]);

  const getNavigationUrl = async () => {
    // Always reset to null at the start
    setNavigationUrl(null);
    
    if (!notification?.metadata) {
      setIsLoadingUrl(false);
      return;
    }

    setIsLoadingUrl(true);
    const metadata = notification.metadata;
    const type = notification.type?.toUpperCase();
    let url: string | null = null;

    try {
      const token = localStorage.getItem('token');
      const fetchOptions: RequestInit = {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      };

      // Handle task comment mentions
      if (type === 'TASK_UPDATE' && metadata.task_id && metadata.comment_id) {
        // Fetch task to get wbs_id, then fetch wbs to get project_id
        const taskResponse = await fetch(`/api/tasks/${metadata.task_id}`, fetchOptions);
        
        if (taskResponse.ok) {
          const task = await taskResponse.json();
          const wbsId = task.wbs_id || task.wbs?.wbs_id;
          
          if (wbsId) {
            // Fetch WBS to get project_id
            const wbsResponse = await fetch(`/api/wbs/${wbsId}`, fetchOptions);
            if (wbsResponse.ok) {
              const wbs = await wbsResponse.json();
              if (wbs.project_id) {
                url = `/projects/${wbs.project_id}/tasks/${metadata.task_id}?comment=${metadata.comment_id}`;
              }
            }
          }
        }
      }
      // Handle task assignments/updates (but not if it's a comment mention, already handled above)
      else if ((type === 'TASK_ASSIGNMENT' || type === 'TASK_UPDATE') && metadata.task_id && !metadata.comment_id) {
        const taskResponse = await fetch(`/api/tasks/${metadata.task_id}`, fetchOptions);
        
        if (taskResponse.ok) {
          const task = await taskResponse.json();
          const wbsId = task.wbs_id || task.wbs?.wbs_id;
          
          if (wbsId) {
            const wbsResponse = await fetch(`/api/wbs/${wbsId}`, fetchOptions);
            if (wbsResponse.ok) {
              const wbs = await wbsResponse.json();
              if (wbs.project_id) {
                url = `/projects/${wbs.project_id}/tasks/${metadata.task_id}`;
              }
            }
          }
        }
      }
      // Handle project-related notifications
      else if (metadata.project_id && (type === 'PROJECT_CREATION' || type === 'PROJECT_UPDATE')) {
        url = `/projects/${metadata.project_id}`;
      }
      // Handle risk notifications
      else if (metadata.risk_id) {
        url = `/risk/${metadata.risk_id}`;
      }
      // Handle schedule notifications
      else if (metadata.schedule_id) {
        url = `/scheduler/${metadata.schedule_id}`;
      }
      
      // Only set URL if we have a valid one
      setNavigationUrl(url);
    } catch (error) {
      console.error('Error getting navigation URL:', error);
      setNavigationUrl(null);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleView = () => {
    if (navigationUrl) {
      onClose();
      router.push(navigationUrl);
    }
  };

  if (!notification) return null;

  const handleDelete = () => {
    onDelete(notification.notification_id);
    onClose();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'project_creation':
        return 'bg-blue-100 text-blue-800';
      case 'project_update':
        return 'bg-purple-100 text-purple-800';
      case 'task_assignment':
        return 'bg-green-100 text-green-800';
      case 'deadline_reminder':
        return 'bg-orange-100 text-orange-800';
      case 'budget_alert':
        return 'bg-red-100 text-red-800';
      case 'risk_alert':
        return 'bg-red-100 text-red-800';
      case 'document_update':
        return 'bg-indigo-100 text-indigo-800';
      case 'system_alert':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance_due':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const creatorName = notification.created_by?.account
    ? `${notification.created_by.account.first_name} ${notification.created_by.account.last_name}`
    : notification.created_by?.username || 'System';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold mb-2">
            {notification.title}
          </DialogTitle>
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className={getPriorityColor(notification.priority)}>
              {notification.priority}
            </Badge>
            <Badge variant="outline" className={getTypeColor(notification.type)}>
              {formatType(notification.type)}
            </Badge>
            <Badge variant={notification.status === 'READ' ? 'secondary' : 'default'}>
              {notification.status === 'read' ? 'Read' : 'Unread'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Content */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-800 leading-relaxed">{notification.message}</p>
          </div>

          {/* Description */}
          {notification.metadata?.description && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Description</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {notification.metadata.description}
                </p>
              </div>
            </div>
          )}

          {/* Notification Details */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium text-gray-900">Notification Details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">
                  {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>

              {notification.read_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Read:</span>
                  <span className="font-medium">
                    {format(new Date(notification.read_at), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">From:</span>
                <span className="font-medium">{creatorName}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {isLoadingUrl ? (
              <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading navigation...</span>
              </div>
            ) : navigationUrl ? (
              <Button
                onClick={handleView}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ExternalLink className="h-4 w-4" />
                View
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationModal;
