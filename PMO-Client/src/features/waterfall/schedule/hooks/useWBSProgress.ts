interface UseWBSProgressProps {
    projectId: string;
}

/**
 * Progress roll-ups for the schedule screen.
 *
 * notConnected: after a task changes, these recalculated the WBS item's
 * progress and its parents', and marked a task complete once its hours were
 * met, on the backend. They do nothing until the integration (roll-ups belong
 * in the backend anyway).
 */
export const useWBSProgress = (_props: UseWBSProgressProps) => {
    const updateWBSProgressAndParents = async (_wbsId: number) => {};

    const checkAndUpdateTaskCompletion = async (_taskId: number) => {};

    return {
        updateWBSProgressAndParents,
        checkAndUpdateTaskCompletion,
    };
};
