"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { updateUserCredentials } from "@/app/(app)/admin/team/actions";
import { toast } from "sonner";

export function EditUserDialog({
  user,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  hideTrigger = false,
}: {
  user: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email && !password) {
      setError("Please provide a new email or password to update.");
      setIsSubmitting(false);
      return;
    }

    try {
      await updateUserCredentials(user.id, email, password);
      toast.success("Credentials updated successfully");
      setOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to update credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger 
          render={
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 text-xs">
              <KeyRound className="w-3 h-3" />
              Edit Credentials
            </Button>
          } 
        />
      )}
      <DialogContent className="sm:max-w-[425px] bg-[#0c0c0e] border-border text-white">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Update Credentials</DialogTitle>
            <DialogDescription>
              Update email or set a new password for {user.full_name}. Note: For security reasons, existing passwords cannot be viewed, only reset.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email}
                placeholder="Leave blank to keep current"
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                name="password"
                type="text"
                placeholder="Leave blank to keep current"
                minLength={6}
                className="bg-background border-border font-mono text-sm"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-[#858CE9] text-white hover:bg-[#858CE9]/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Update Credentials"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
