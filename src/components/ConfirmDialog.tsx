import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Excluir",
  cancelText = "Cancelar",
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center space-y-4 py-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2 shadow-inner">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-secondary font-medium text-sm md:text-base">{description}</p>
        <div className="flex gap-3 w-full mt-8">
          <Button variant="secondary" onClick={onClose} className="flex-1 border-surface-border">
            {cancelText}
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className="flex-1 !bg-red-500 hover:!bg-red-600 !text-white !border-red-600 shadow-lg shadow-red-500/20"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
