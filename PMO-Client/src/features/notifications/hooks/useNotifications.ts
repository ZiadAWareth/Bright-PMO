"use client";

import { useState } from "react";

/**
 * Notification panel state for the app shell.
 *
 * notConnected: notifications and the unread count would be loaded from the
 * backend. Until then the list starts empty; reading and deleting act on the
 * local list only.
 */
function useNotifications() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const loadingNotifications = false;
    const [unreadCount, setUnreadCount] = useState(0);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);
    const [isNotificationModalOpen, setIsNotificationModalOpen] =
        useState(false);

    const markRead = (notificationId: number) => {
        setNotifications((prev) =>
            prev.map((n) =>
                n.notification_id === notificationId
                    ? { ...n, status: "READ", read_at: new Date().toISOString() }
                    : n
            )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleNotificationClick = (notification: any) => {
        setSelectedNotification(notification);
        setIsNotificationModalOpen(true);
        setNotificationsOpen(false);
        if (notification.status === "UNREAD") markRead(notification.notification_id);
    };

    const handleNotificationDelete = (notificationId: number) => {
        const deleted = notifications.find((n) => n.notification_id === notificationId);
        setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));
        if (deleted?.status === "UNREAD") setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleNotificationDeleteFromDropdown = (
        e: React.MouseEvent,
        notificationId: number
    ) => {
        e.stopPropagation();
        handleNotificationDelete(notificationId);
    };

    const handleMarkAsRead = (notificationId: number) => markRead(notificationId);

    return {
        notifications,
        notificationsOpen,
        setNotificationsOpen,
        loadingNotifications,
        unreadCount,
        selectedNotification,
        setSelectedNotification,
        isNotificationModalOpen,
        setIsNotificationModalOpen,
        handleNotificationClick,
        handleNotificationDelete,
        handleNotificationDeleteFromDropdown,
        handleMarkAsRead,
    };
}

export { useNotifications };
export default useNotifications;
