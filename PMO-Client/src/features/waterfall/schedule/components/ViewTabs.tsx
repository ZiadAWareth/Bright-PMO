import React from "react";
import { Calendar, Building, Flag, Zap } from "lucide-react";
import { TabRow } from "@/components/ui/tab-row";

type ScheduleView = "calendar" | "phases" | "milestones" | "critical";

interface ViewTabsProps {
    activeView: ScheduleView;
    onViewChange: (view: ScheduleView) => void;
}

const views = [
    { id: "calendar", label: "Calendar", icon: <Calendar size={16} /> },
    { id: "phases", label: "Phases", icon: <Building size={16} /> },
    { id: "milestones", label: "Milestones", icon: <Flag size={16} /> },
    { id: "critical", label: "Critical Path", icon: <Zap size={16} /> },
];

/**
 * The project schedule's view switcher.
 *
 * Previously a hand-rolled pill row: four buttons on a `bg-surface-2/80`
 * backdrop-blurred track, with the active view lifting onto its own surface.
 * That is the pill treatment the house style rules out — every multi-tab view
 * uses the underline row, so the two ways of building a tabbed screen look
 * identical and brand colour stays with primary actions and active navigation.
 *
 * Delegating to `TabRow` rather than restyling in place also means this row
 * picks up the shared `role="tablist"` / `aria-selected` semantics, which the
 * hand-rolled version never had — a screen reader announced it as four
 * unrelated buttons.
 */
const ViewTabs: React.FC<ViewTabsProps> = ({ activeView, onViewChange }) => (
    <TabRow
        tabs={views}
        value={activeView}
        onChange={(id) => onViewChange(id as ScheduleView)}
    />
);

export default ViewTabs;
