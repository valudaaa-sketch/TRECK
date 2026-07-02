"use client"

import { useState, useEffect, useRef } from "react"
import { Search, FileText, CheckSquare, MessageSquare, File, Loader2, X } from "lucide-react"
import { searchProject, SearchResult } from "@/app/(app)/projects/search-actions"
import { useRouter } from "next/navigation"

export function ProjectSearchDialog({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  
  const wrapperRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      setShowDropdown(query.trim().length > 0)
      return
    }

    setShowDropdown(true)
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchProject(projectId, query)
        setResults(data)
        setSelectedIndex(0)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, projectId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showDropdown) return
      
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex(i => (i + 1) % (results.length || 1) || 0)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex(i => (i - 1 + results.length) % (results.length || 1) || 0)
      } else if (e.key === "Enter" && results.length > 0) {
        e.preventDefault()
        handleSelect(results[selectedIndex])
      } else if (e.key === "Escape") {
        setShowDropdown(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showDropdown, results, selectedIndex])

  const handleSelect = (result: SearchResult) => {
    setShowDropdown(false)
    setQuery("")
    router.push(result.url)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return <CheckSquare className="w-4 h-4 text-[#858ce9]" />
      case 'document': return <FileText className="w-4 h-4 text-[#10b981]" />
      case 'file': return <File className="w-4 h-4 text-[#f59e0b]" />
      case 'comment': return <MessageSquare className="w-4 h-4 text-[#f97316]" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  return (
    <div className="relative z-50 sm:ml-2" ref={wrapperRef}>
      <div className="flex items-center bg-card border border-border rounded-lg px-2 sm:px-3 py-1.5 w-9 sm:w-64 focus-within:w-48 sm:focus-within:w-64 overflow-hidden transition-all duration-300">
        <Search className="w-4 h-4 text-muted-foreground mr-2" />
        <input 
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (query.length > 0) setShowDropdown(true) }}
          placeholder="Search project..."
          className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 text-xs placeholder:text-muted-foreground min-w-0"
        />
        {loading ? (
          <Loader2 className="w-3 h-3 text-muted-foreground animate-spin ml-2 shrink-0" />
        ) : query.length > 0 ? (
          <button onClick={() => { setQuery(''); setShowDropdown(false); }} className="text-muted-foreground hover:text-white ml-2 shrink-0 outline-none">
            <X className="w-3 h-3" />
          </button>
        ) : null}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-background border border-border shadow-2xl rounded-lg overflow-hidden flex flex-col">
          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {query.length > 0 && query.length < 2 && (
              <div className="p-3 text-xs text-muted-foreground text-center">Type at least 2 characters...</div>
            )}
            
            {query.length >= 2 && !loading && results.length === 0 && (
              <div className="p-4 text-xs text-muted-foreground text-center">No results found for "{query}"</div>
            )}

            {results.length > 0 && (
              <div className="space-y-0.5">
                {results.map((result, idx) => {
                  const isSelected = selectedIndex === idx
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => handleSelect(result)}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-md text-left transition-colors ${isSelected ? 'bg-[#1a1b3b]/30' : 'hover:bg-card'}`}
                    >
                      <div className={`mt-0.5 p-1 rounded ${isSelected ? 'bg-[#858ce9]/10' : 'bg-card'}`}>
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-[13px] font-medium truncate ${isSelected ? 'text-white' : 'text-foreground'}`}>
                            {result.title}
                          </h4>
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
                            {result.type}
                          </span>
                        </div>
                        {result.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {result.description}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
