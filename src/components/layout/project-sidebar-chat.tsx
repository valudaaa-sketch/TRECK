"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Hash, Send } from "lucide-react"
import { sendMessage, getInitialMessages } from "@/app/(app)/chat/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type ChatMessage = {
  id: string
  content: string
  created_at: string
  sender_id: string
  sender: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

export function ProjectSidebarChat({ 
  currentUserId, 
  initialProjectId,
  projects = []
}: { 
  currentUserId: string, 
  initialProjectId?: string,
  projects?: { id: string, name: string }[]
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  const projectIdParam = searchParams.get('projectId')
  const projectMatch = pathname.match(/\/projects\/([^/]+)/)
  const currentProjectId = projectIdParam || projectMatch?.[1] || initialProjectId || ""
  const activeProject = projects?.find(p => p.id === currentProjectId)
  
  if (!activeProject) {
    return null;
  }
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentProjectId) {
      setMessages([])
      return
    }

    setIsInitializing(true)
    
    // 1. Fetch initial messages for general chat
    getInitialMessages(currentProjectId, 'general').then((data) => {
      setMessages(data as any)
      setIsInitializing(false)
      scrollToBottom()
    })

    // 2. Subscribe to realtime updates
    const supabase = createClient()
    const channel = supabase.channel(`chat_${currentProjectId}_general`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `project_id=eq.${currentProjectId}`
        },
        async (payload) => {
          const newMsg = payload.new
          // Only general messages
          if (newMsg.receiver_id != null) return
          
          const { data: sender } = await supabase.from('users').select('id, full_name, avatar_url').eq('id', newMsg.sender_id).single()
          
          if (sender) {
            setMessages(prev => [...prev, { ...newMsg, sender } as any])
            scrollToBottom()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentProjectId, currentUserId])

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  async function handleSend() {
    if (!text.trim() || !currentProjectId) return
    setIsLoading(true)
    const content = text
    setText("")
    
    try {
      await sendMessage(currentProjectId, content, 'general')
    } catch(e: any) {
      console.error(e)
    } finally {
      setIsLoading(false)
      scrollToBottom()
    }
  }

  if (!currentProjectId) return null

  function getInitials(name: string) {
    if (!name) return "U"
    const parts = name.split(" ")
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div className="flex flex-col flex-1 bg-[#0F0F0F] shrink-0 overflow-hidden group-data-[state=closed]/sidebar:hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-y border-border/50 shrink-0 bg-[#0F0F0F]">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-[#858ce9]" />
          <span className="text-[13px] font-semibold text-white tracking-wide">
            {activeProject ? activeProject.name : 'General Discussion'}
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground opacity-50 font-mono" title={currentProjectId}>
          {currentProjectId.slice(0, 8)}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#0A0A0A]">
        {isInitializing ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
              <Hash className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-white/80">{activeProject ? activeProject.name : 'General Discussion'}</p>
              <p className="text-[10px] text-muted-foreground max-w-[160px] mx-auto mt-1">Start of the general discussion for this project.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUserId
              const showAvatar = idx === messages.length - 1 || messages[idx + 1].sender_id !== msg.sender_id
              
              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className="w-6 shrink-0 flex flex-col justify-end">
                    {showAvatar && (
                      msg.sender.avatar_url ? (
                        <img src={msg.sender.avatar_url} alt="" className="w-6 h-6 rounded-md object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-[#222] flex items-center justify-center border border-white/5 text-[9px] font-bold text-white/50">
                          {getInitials(msg.sender.full_name)}
                        </div>
                      )
                    )}
                  </div>
                  
                  {/* Message bubble */}
                  <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-1.5 mb-1 px-1">
                      {!isMe && <span className="text-[10px] font-medium text-white/70">{msg.sender.full_name}</span>}
                      <span className="text-[8px] text-white/40">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`px-2.5 py-1.5 rounded-xl text-[12px] leading-relaxed ${
                      isMe 
                        ? 'bg-[#858ce9] text-white rounded-br-sm' 
                        : 'bg-[#1A1A1C] border border-white/5 text-white/90 rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-[#0F0F0F] border-t border-border/50 shrink-0">
        <div className="relative flex items-center bg-[#1A1A1C] border border-white/5 rounded-xl focus-within:border-[#858ce9]/50 focus-within:ring-1 focus-within:ring-[#858ce9]/20 transition-all">
          <Textarea 
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Send a message..."
            className="min-h-[36px] max-h-[80px] bg-transparent border-none focus-visible:ring-0 resize-none py-2 px-2.5 text-[12px] leading-snug"
            rows={1}
          />
          <div className="pr-1.5 self-end pb-1 shrink-0">
            <Button 
              size="icon" 
              variant="ghost" 
              className={`w-6 h-6 rounded-lg transition-colors ${
                text.trim() 
                  ? 'bg-[#858ce9] text-white hover:bg-[#7a81d4]' 
                  : 'text-muted-foreground hover:bg-white/10 hover:text-white'
              }`}
              onClick={handleSend}
              disabled={isLoading || !text.trim()}
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
