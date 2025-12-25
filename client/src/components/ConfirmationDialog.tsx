import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
}

/**
 * Reusable confirmation dialog for important actions like delete
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  loading = false,
}: ConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    // Don't close dialog here - let the onConfirm handler manage it
  };

  console.log("ConfirmationDialog render", { open, title, description });
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              variant === "destructive" 
                ? "bg-red-100 dark:bg-red-900/20" 
                : "bg-blue-100 dark:bg-blue-900/20"
            }`}>
              <AlertTriangle className={`h-5 w-5 ${
                variant === "destructive" 
                  ? "text-red-600 dark:text-red-400" 
                  : "text-blue-600 dark:text-blue-400"
              }`} />
            </div>
            <DialogTitle className="text-left">{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-left">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "default" : "default"}
            className={variant === "destructive" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

