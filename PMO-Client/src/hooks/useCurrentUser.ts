"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
    fetchCurrentUserOnce,
    getCachedUser,
    type CurrentUser,
} from "@/lib/current-user-cache";

const EMPTY: CurrentUser = {
    fullName: "",
    nameAbbreviation: "",
    userRole: null,
};

/**
 * The signed-in user, for the app shell.
 *
 * Backed by a module-scoped cache: the first screen of a session pays for the
 * `/api/auth/me` round trip, and every navigation after that renders the
 * sidebar and account menu immediately. Without it the shell remounts per route
 * and re-requests the user each time, which is what made the sidebar flash
 * "Loading navigation…" on every click.
 */
function useCurrentUser() {
    // Read the cache during the initial render so a remount after navigation
    // starts already populated instead of flashing an empty shell.
    const [user, setUser] = useState<CurrentUser>(() => getCachedUser() ?? EMPTY);
    const [roleLoading, setRoleLoading] = useState(() => getCachedUser() === null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return;

        const cachedUser = getCachedUser();
        if (cachedUser) {
            setUser(cachedUser);
            setRoleLoading(false);
            return;
        }

        let cancelled = false;

        void fetchCurrentUserOnce(async () => {
            try {
                const response = await axios.get("/api/auth/me", {});
                if (response.status !== 200) return null;

                const apiUser = response.data.user;
                const role =
                    apiUser?.role?.role_name ?? apiUser?.role?.name ?? null;

                const firstName = apiUser?.account?.first_name || "";
                const lastName = apiUser?.account?.last_name || "";
                const fullName = `${firstName} ${lastName}`.trim();
                const nameAbbreviation = fullName
                    ? fullName
                          .split(" ")
                          .map((name: string) => name.charAt(0))
                          .join("")
                          .toUpperCase()
                    : "";

                return { fullName, nameAbbreviation, userRole: role };
            } catch (error) {
                console.error("Failed to fetch user data:", error);
                return null;
            }
        }).then((result) => {
            if (cancelled) return;
            if (result) setUser(result);
            setRoleLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [isClient]);

    return {
        fullName: user.fullName,
        nameAbbreviation: user.nameAbbreviation,
        userRole: user.userRole,
        roleLoading,
        isClient,
    };
}

export { useCurrentUser };
export default useCurrentUser;
