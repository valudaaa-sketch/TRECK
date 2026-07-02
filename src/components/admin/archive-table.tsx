"use client";

import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RotateCcw, Trash2 } from "lucide-react";
import { bulkDeleteItems } from "@/app/(app)/admin/archives/actions";
import { ArchiveType } from "@/app/(app)/admin/archives/actions";
import { toast } from "sonner";

export interface ArchivedItem {
  id: string;
  name?: string;
  title?: string;
  content?: string;
  archived_at: string;
  days_until_deletion: number;
  project_name?: string | null;
}

interface ArchiveTableProps {
  items: ArchivedItem[];
  type: string;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ArchiveTable({ items: initialItems, type, onRestore, onDelete }: ArchiveTableProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [items, setItems] = useState(initialItems);

  // Sync items when props change, but filter out permanently deleted ones
  if (items.length !== initialItems.length && !isPending) {
    setItems(initialItems.filter(item => !deletedIds.has(item.id)));
  }

  const handleRestore = (id: string) => {
    startTransition(async () => {
      await onRestore(id);
      setItems(items.filter(item => item.id !== id));
      toast.success("Item restored");
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await onDelete(deleteId);
        setItems(items.filter(item => item.id !== deleteId));
        setDeletedIds(prev => new Set(prev).add(deleteId));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(deleteId);
          return next;
        });
        setDeleteId(null);
        toast.success("Item permanently deleted");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete item");
        setDeleteId(null);
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    
    // Map UI type label to ArchiveType string
    const typeMapping: Record<string, ArchiveType> = {
      'Projects': 'projects',
      'Tasks': 'tasks',
      'Comments': 'comments',
      'Documents': 'project_documents',
      'Shared Notes': 'shared_notes',
      'Files': 'files'
    };
    
    const dbType = typeMapping[type];
    if (!dbType) return;
    
    startTransition(async () => {
      try {
        await bulkDeleteItems(dbType, Array.from(selectedIds));
        setItems(items.filter(item => !selectedIds.has(item.id)));
        setDeletedIds(prev => {
          const next = new Set(prev);
          selectedIds.forEach(id => next.add(id));
          return next;
        });
        setSelectedIds(new Set());
        toast.success(`Deleted ${selectedIds.size} items permanently`);
      } catch (err: any) {
        toast.error("Failed to delete items: " + err.message);
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-[32px] p-6 overflow-hidden">
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl p-3 px-4">
          <span className="text-sm font-medium text-primary">
            {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => {
              if (confirm(`Permanently delete ${selectedIds.size} items? This cannot be undone.`)) {
                handleBulkDelete();
              }
            }}
            disabled={isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}
      <div className="border border-border rounded-xl overflow-hidden bg-[#0F0F0F]">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="w-[50px] text-center">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all"
                  className="rounded border-input bg-card text-white focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
              </TableHead>
              <TableHead className="text-[#888] font-medium text-[12px] h-12">Identifier</TableHead>
              {type !== 'Projects' && type !== 'Shared Notes' && (
                <TableHead className="text-[#888] font-medium text-[12px] h-12">Project</TableHead>
              )}
              <TableHead className="text-[#888] font-medium text-[12px] h-12">Archived Date</TableHead>
              <TableHead className="text-[#888] font-medium text-[12px] h-12">Days Until Deletion</TableHead>
              <TableHead className="text-right text-[#888] font-medium text-[12px] h-12 pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow className="border-none hover:bg-transparent">
                <TableCell colSpan={type !== 'Projects' && type !== 'Shared Notes' ? 6 : 5} className="h-32 text-center text-[#888] text-[13px]">
                  No archived {type.toLowerCase()} found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="border-b border-border hover:bg-[#151515] transition-colors group">
                  <TableCell className="text-center w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      aria-label="Select item"
                      className="rounded border-input bg-card text-white focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-white text-[13px]">
                    {item.name || item.title || item.content?.substring(0, 50) || "Untitled"}
                  </TableCell>
                  {type !== 'Projects' && type !== 'Shared Notes' && (
                    <TableCell className="text-[#888] text-[13px]">
                      {item.project_name ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-[4px] text-[11px] font-medium bg-muted border border-input text-[#AAA]">
                          {item.project_name}
                        </span>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-[#888] text-[13px]">
                    {new Date(item.archived_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className={`text-[13px] ${item.days_until_deletion <= 3 ? "text-red-400 font-medium" : "text-[#888]"}`}>
                      {item.days_until_deletion} days
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-3 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRestore(item.id)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 text-[12px] font-medium text-[#888] hover:text-white transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                      <button
                        onClick={() => setDeleteId(item.id)}
                        disabled={isPending}
                        className="text-[#888] hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[425px] bg-black border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Permanently Delete Item</DialogTitle>
            <DialogDescription className="text-white/60">
              Are you sure you want to permanently delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setDeleteId(null)} disabled={isPending} className="hover:bg-white/5 text-white/70">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
