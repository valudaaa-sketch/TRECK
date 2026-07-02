-- Fix infinite recursion on project_members

DROP POLICY IF EXISTS "Users can view members of their projects" ON public.project_members;
DROP POLICY IF EXISTS "Admins can manage project members" ON public.project_members;

-- 1. Allow any authenticated user to view project members
CREATE POLICY "Users can view project members" 
ON public.project_members FOR SELECT 
USING (auth.role() = 'authenticated');

-- 2. Allow Admins to manage project members (Insert, Update, Delete)
CREATE POLICY "Admins can insert project members" 
ON public.project_members FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'::user_role)
);

CREATE POLICY "Admins can delete project members" 
ON public.project_members FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'::user_role)
);
