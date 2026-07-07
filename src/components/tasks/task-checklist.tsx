"use client"

import { useState } from "react"
import { Plus, Check, Trash2, CheckSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type ChecklistItem = { id: string; item_text: string; is_completed: boolean }

export function TaskChecklist({
  taskId,
  initialItems,
}: {
  taskId: string
  initialItems: ChecklistItem[]
}) {
  const [items, setItems] = useState(initialItems)
  const [newItem, setNewItem] = useState("")
  const [adding, setAdding] = useState(false)
  const router = useRouter()

  async function toggleItem(id: string, current: boolean) {
    const supabase = createClient()
    const { error } = await supabase.from("task_checklists").update({ is_completed: !current }).eq("id", id)
    if (!error) {
      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const itemText = items.find(i => i.id === id)?.item_text || ""
        await supabase.from("activity_logs").insert({
          entity_type: "task",
          entity_id: taskId,
          user_id: user.id,
          action: !current ? "checklist_checked" : "checklist_unchecked",
          new_value: !current ? { item_text: itemText } : null,
          previous_value: current ? { item_text: itemText } : null
        })
      }
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_completed: !current } : i)))
    }
  }

  async function addItem() {
    if (!newItem.trim()) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from("task_checklists")
      .insert({ task_id: taskId, item_text: newItem.trim() })
      .select()
      .single()
    if (!error && data) {
      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("activity_logs").insert({
          entity_type: "task",
          entity_id: taskId,
          user_id: user.id,
          action: "checklist_added",
          new_value: { item_text: newItem.trim() }
        })
      }

      setItems((prev) => [...prev, data])
      setNewItem("")
    }
  }

  async function deleteItem(e: React.MouseEvent, id: string, text: string) {
    e.stopPropagation()
    const supabase = createClient()
    const { error } = await supabase.from("task_checklists").delete().eq("id", id)
    if (!error) {
      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("activity_logs").insert({
          entity_type: "task",
          entity_id: taskId,
          user_id: user.id,
          action: "checklist_deleted",
          previous_value: { item_text: text }
        })
      }
      setItems((prev) => prev.filter(i => i.id !== id))
    }
  }

  const completed = items.filter((i) => i.is_completed).length

  return (
    <div className="w-full">
      <div className="p-4 border border-dashed border-border rounded-xl bg-background flex flex-col gap-3">
        {/* Inline Add Item (Moved to top) */}
        <div className="flex items-center gap-3 opacity-60 focus-within:opacity-100 transition-opacity mb-2">
          <div className="h-5 w-5 rounded-[4px] border border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add new item..."
            className="h-6 p-0 text-[14px] bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
          />
        </div>

        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 group transition-colors cursor-pointer"
            onClick={() => toggleItem(item.id, item.is_completed)}
          >
            <button
              className={`h-5 w-5 rounded-[4px] flex items-center justify-center shrink-0 transition-colors ${
                item.is_completed
                  ? "bg-[#00c896] text-[#0a0a0a]" // green like the image reference
                  : "bg-white"
              }`}
            >
              {item.is_completed && <Check strokeWidth={3} className="h-3.5 w-3.5" />}
            </button>
            <span className={`text-[14px] select-none flex-1 transition-colors ${item.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {item.item_text}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-rose-400 hover:bg-transparent transition-all shrink-0 -mr-2"
              onClick={(e) => deleteItem(e, item.id, item.item_text)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
