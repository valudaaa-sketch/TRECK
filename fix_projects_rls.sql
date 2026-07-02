-- TRECK Database Fix: Resolve ambiguous column in projects RLS policy
-- Run this script in the Supabase SQL Editor

DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;

CREATE POLICY "Users can view accessible projects" 
ON public.projects FOR SELECT 
USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin') OR
  EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.project_id = projects.id AND t.current_owner = auth.uid())
);
