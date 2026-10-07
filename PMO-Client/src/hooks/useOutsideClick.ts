"use client";

import { useEffect, type RefObject } from "react";

function useOutsideClick(
    ref: RefObject<HTMLElement | null>,
    onOutsideClick: () => void,
    enabled: boolean = true
) {
    useEffect(() => {
        if (!enabled) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onOutsideClick();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref, onOutsideClick, enabled]);
}

export { useOutsideClick };
export default useOutsideClick;
