# TRECK - AI Context & Architecture Guide

Welcome to the TRECK project! This document is designed to give future AI assistants immediate context on the tech stack, architecture, and design principles used in this application so development can resume seamlessly.

## 1. Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL, Authentication, Storage, Realtime)
- **Deployment**: Vercel
- **Icons**: Lucide React
- **Language**: TypeScript (Strict Mode)

## 2. Core Architecture & Routing
The app uses the Next.js App Router paradigm. 
- **`(auth)` Route Group**: Contains `/login` and `/register`. Uses Supabase Auth helpers to manage sessions.
- **`(app)` Route Group**: Contains the main authenticated application, wrapped by the `AppLayout` which includes the `AppSidebar` and `GlobalProjectHeader`.
- **Project Routing**: Project views are driven by the URL structure `/projects/[projectId]/[tab]`, where `[tab]` can be `details`, `tasks`, or `activity`.
- **Task Deep Linking**: Tasks have dedicated modal/page views at `/projects/[projectId]/tasks/[taskId]`.

## 3. Database Schema & RLS (Row Level Security)
This project heavily utilizes Supabase RLS. Any server-side queries MUST be made using the authenticated user's client (`createClient()` from `@/utils/supabase/server`) to respect permissions.
- **Projects**: Core entity. Has many Tasks, Members, and Files. 
- **Project Members**: Junction table mapping `users` to `projects` with specific roles (`Admin` or `Member`).
- **Tasks**: Has a `current_owner`, `status_id`, and `priority`.
- **Archive System**: We DO NOT hard-delete most records (projects, tasks, documents). We implement a "soft delete" by setting the `archived_at` timestamp. Global queries must always include `.is("archived_at", null)` or use `.inner()` joins to filter out archived parent records.

## 4. UI / UX Design Principles
- **Aesthetic**: Premium, sleek, modern dark mode. 
- **Colors**: Background is deep black (`#000000`) or very dark gray (`#111111`). Accents use vibrant, harmonious HSL colors (often indigo/purple). 
- **Components**: The UI relies on custom headless components and standard HTML/Tailwind styling rather than heavy UI libraries. Micro-animations (hover states, slight translations) are required to make the app feel dynamic.

## 5. Performance Optimizations (Crucial)
- **No Waterfalls**: Server Components should fetch data concurrently using `Promise.all` arrays rather than awaiting queries sequentially.
- **Realtime**: Supabase realtime subscriptions (in `GlobalRealtimeProvider`) MUST be filtered by the active `project_id` to prevent the entire app from refreshing when unrelated projects are updated.

## 6. How to Start a New Task
When starting a new session with an AI, point it to this file first. 
Instruct the AI: *"Read AI_CONTEXT.md to understand the stack and rules, then help me build [New Feature]."*
