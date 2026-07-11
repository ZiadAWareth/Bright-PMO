import { useState, useEffect } from "react";
import axios from "axios";

interface User {
    user_id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: {
        role_id: number;
        name: string;
    };
}

export const usePermissions = () => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const token =
                typeof window !== "undefined" ? localStorage.getItem("token") : null;
            if (!token) {
                setUser(null);
                return;
            }

            const response = await axios.get(`/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUser(response.data.user);
        } catch (error) {
            console.error("Error fetching user data:", error);
            setUser(null);
        }
    };

    const canEditSchedule = () => {
        if (!user || !user.role) return false;
        const allowedRoles = ["PMO", "PJM", "ADMIN", "DIR"];
        return allowedRoles.includes(user.role.name);
    };

    const canViewLockedTasks = () => {
        if (!user || !user.role) return false;
        const viewAllowedRoles = ["PMO", "PJM", "ADMIN", "IT", "DIR"];
        return viewAllowedRoles.includes(user.role.name);
    };

    return {
        user,
        setUser,
        canEditSchedule,
        canViewLockedTasks,
        fetchUserData,
    };
};