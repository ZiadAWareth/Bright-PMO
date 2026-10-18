"use client";

import { useState, useEffect } from "react";
import axios from "axios";

function useNotifications(isClient: boolean) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);
    const [isNotificationModalOpen, setIsNotificationModalOpen] =
        useState(false);

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const response = await axios.get(
                    "/api/notifications?status=unread&limit=1"
                );
                setUnreadCount(response.data.unread_count || 0);
            } catch (error) {
                console.error("Failed to fetch unread count:", error);
            }
        };

        if (isClient) {
            fetchUnreadCount();
        }
    }, [isClient]);

    useEffect(() => {
        if (notificationsOpen) {
            setLoadingNotifications(true);
            axios
                .get("/api/notifications")
                .then((res) => {
                    setNotifications(res.data.notifications || []);
                    setUnreadCount(res.data.unread_count || 0);
                })
                .catch(() => setNotifications([]))
                .finally(() => setLoadingNotifications(false));
        }
    }, [notificationsOpen]);

    const handleNotificationClick = async (notification: any) => {
        setSelectedNotification(notification);
        setIsNotificationModalOpen(true);
        setNotificationsOpen(false);

        if (notification.status === "UNREAD") {
            try {
                await axios.patch(
                    `/api/notifications/${notification.notification_id}`,
                    { status: "READ" }
                );

                setNotifications((prev) =>
                    prev.map((n) =>
                        n.notification_id === notification.notification_id
                            ? {
                                  ...n,
                                  status: "READ",
                                  read_at: new Date().toISOString(),
                              }
                            : n
                    )
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            } catch (error) {
                console.error("Failed to mark notification as read:", error);
            }
        }
    };

    const handleNotificationDelete = async (notificationId: number) => {
        try {
            await axios.delete(`/api/notifications/${notificationId}`);

            const deletedNotification = notifications.find(
                (n) => n.notification_id === notificationId
            );
            setNotifications((prev) =>
                prev.filter((n) => n.notification_id !== notificationId)
            );

            if (deletedNotification?.status === "UNREAD") {
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error("Failed to delete notification:", error);
        }
    };

    const handleNotificationDeleteFromDropdown = async (
        e: React.MouseEvent,
        notificationId: number
    ) => {
        e.stopPropagation();
        await handleNotificationDelete(notificationId);
    };

    const handleMarkAsRead = async (notificationId: number) => {
        try {
            await axios.patch(`/api/notifications/${notificationId}`, {
                status: "READ",
            });

            setNotifications((prev) =>
                prev.map((n) =>
                    n.notification_id === notificationId
                        ? {
                              ...n,
                              status: "READ",
                              read_at: new Date().toISOString(),
                          }
                        : n
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };

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
