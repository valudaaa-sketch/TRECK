-- Add tasks.current_owner to project visibility

DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;

CREATE POLICY "Users can view accessible projects" 
ON public.projects FOR SELECT 
USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin') OR
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.tasks WHERE project_id = id AND current_owner = auth.uid())
);
