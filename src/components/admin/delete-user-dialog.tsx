"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteUserAccount } from "@/app/(app)/admin/team/actions";
import { toast } from "sonner";

export function DeleteUserDialog({
  user,
  disabled,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  hideTrigger = false,
}: {
  user: any;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setIsDeleting(true);
    setError("");

    try {
      await deleteUserAccount(user.id);
      toast.success("User deleted successfully");
      setOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger 
          render={
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
              disabled={disabled}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          } 
        />
      )}
      <DialogContent className="sm:max-w-[425px] bg-[#0c0c0e] border-border text-white">
        <DialogHeader>
          <DialogTitle className="text-rose-500">Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete <strong>{user.full_name}</strong>?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2">
          {error ? (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-md text-sm leading-relaxed">
              {error}
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-3 rounded-md text-sm leading-relaxed">
              <strong>Warning:</strong> Deleting a user completely removes them from the system. If they have created tasks, projects, or comments, the deletion will fail to protect historical data. Consider <strong>Deactivating</strong> them instead.
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            className="bg-rose-600 text-white hover:bg-rose-700"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
