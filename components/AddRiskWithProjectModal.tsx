import AddRiskModal from "./AddRiskModal";

interface ProjectOption {
    project_id: number;
    name: string;
}

interface AddRiskWithProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    projects: ProjectOption[];
}

export default function AddRiskWithProjectModal(props: AddRiskWithProjectModalProps) {
    return <AddRiskModal {...props} />;
}
