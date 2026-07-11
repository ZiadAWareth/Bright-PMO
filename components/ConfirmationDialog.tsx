import React from "react";
import { Trash2, AlertTriangle, CheckCircle } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  iconType?: "warning" | "delete" | "success";
  onConfirm?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  error?: string | null;
}

const iconMap = {
  warning: <AlertTriangle className="text-yellow-500 w-8 h-8" />,
  delete: <Trash2 className="text-red-500 w-8 h-8" />,
  success: <CheckCircle className="text-green-500 w-8 h-8" />,
};

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  iconType = "warning",
  onConfirm,
  onCancel,
  loading = false,
  error = null,
}) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    if (loading) return; // Prevent closing while loading
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onCancel?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onCancel, loading]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div
        ref={dialogRef}
        className="bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center border border-gray-200 dark:border-gray-700 relative"
        style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }}
      >
        <div className="flex flex-col items-center w-full">
          <div className="mb-3 flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30">
            {iconType === 'delete' && <Trash2 className="w-8 h-8 text-red-500" />}
            {iconType === 'warning' && <AlertTriangle className="w-8 h-8 text-yellow-500" />}
            {iconType === 'success' && <CheckCircle className="w-8 h-8 text-green-500" />}
          </div>
          <h2 className="text-xl font-bold mb-2 text-center text-gray-900 dark:text-gray-100">{title}</h2>
          <p className="text-base text-gray-700 dark:text-gray-300 mb-6 text-center">{message}</p>
          <div className="flex gap-3 w-full justify-center">
            <button
              className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 font-medium border border-gray-300 dark:border-gray-600 transition"
              onClick={loading ? undefined : (onCancel || (() => {}))}
              autoFocus
              disabled={loading}
              tabIndex={loading ? -1 : 0}
            >
              {cancelText}
            </button>
            <button
              className={`px-5 py-2 rounded-lg font-medium text-white transition flex items-center justify-center ${iconType === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              onClick={onConfirm || (() => {})}
              disabled={loading}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              ) : null}
              {loading ? 'Processing...' : confirmText}
            </button>
          </div>
          {error && (
            <div className="mt-4 text-sm text-red-600 dark:text-red-400 text-center w-full">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
