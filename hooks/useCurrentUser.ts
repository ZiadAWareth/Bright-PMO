"use client";

import { useState, useEffect } from "react";
import axios from "axios";

function useCurrentUser() {
    const [fullName, setFullName] = useState("");
    const [nameAbbreviation, setNameAbbreviation] = useState("");
    const [userRole, setUserRole] = useState<string | null>(null);
    const [roleLoading, setRoleLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await axios.get("/api/auth/me", {});

                if (response.status === 200) {
                    const user = response.data.user;

                    if (user?.role?.role_name) {
                        setUserRole(user.role.role_name);
                    } else if (user?.role?.name) {
                        setUserRole(user.role.name);
                    }

                    if (user && user.account) {
                        const firstName = user.account.first_name || "";
                        const lastName = user.account.last_name || "";
                        const fullUserName = `${firstName} ${lastName}`.trim();

                        if (fullUserName) {
                            setFullName(fullUserName);
                            const names = fullUserName.split(" ");
                            const abbreviation = names
                                .map((name: string) => name.charAt(0))
                                .join("")
                                .toUpperCase();
                            setNameAbbreviation(abbreviation);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            } finally {
                setRoleLoading(false);
            }
        };

        if (isClient) {
            fetchUser();
        }
    }, [isClient]);

    return { fullName, nameAbbreviation, userRole, roleLoading, isClient };
}

export { useCurrentUser };
export default useCurrentUser;
