-- =============================================
-- منصة الأنشطة الصفية - Database Schema
-- Classroom Activities Platform Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'teacher')) DEFAULT 'teacher',
  school TEXT,
  department TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teachers table
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  employee_number TEXT UNIQUE,
  department TEXT,
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL,
  grade TEXT,
  activity_date DATE NOT NULL,
  objectives TEXT,
  students_count INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  points INTEGER DEFAULT 0,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Images table
CREATE TABLE IF NOT EXISTS public.activity_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Points table (history of points awarded)
CREATE TABLE IF NOT EXISTS public.points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL,
  required_points INTEGER DEFAULT 0,
  required_activities INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher Badges junction table
CREATE TABLE IF NOT EXISTS public.teacher_badges (
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (teacher_id, badge_id)
);

-- Points Settings (configurable by admin)
CREATE TABLE IF NOT EXISTS public.points_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value INTEGER NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_total_points ON public.teachers(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_activities_teacher_id ON public.activities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_activity_date ON public.activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_activity_images_activity_id ON public.activity_images(activity_id);
CREATE INDEX IF NOT EXISTS idx_points_teacher_id ON public.points(teacher_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_teacher_badges_teacher_id ON public.teacher_badges(teacher_id);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update teacher total_points
CREATE OR REPLACE FUNCTION update_teacher_points()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.teachers
    SET total_points = total_points + NEW.points,
        level = GREATEST(1, FLOOR((total_points + NEW.points) / 100) + 1)
    WHERE id = NEW.teacher_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.teachers
    SET total_points = GREATEST(0, total_points - OLD.points),
        level = GREATEST(1, FLOOR(GREATEST(0, total_points - OLD.points) / 100) + 1)
    WHERE id = OLD.teacher_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_points_change
  AFTER INSERT OR DELETE ON public.points
  FOR EACH ROW EXECUTE FUNCTION update_teacher_points();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'teacher')
  );
  
  -- If teacher role, create teacher record
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'teacher') = 'teacher' THEN
    INSERT INTO public.teachers (user_id, name, department)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.raw_user_meta_data->>'department'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_settings ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage users"
  ON public.users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Teachers policies
CREATE POLICY "Teachers can view all teachers (for leaderboard)"
  ON public.teachers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can update their own record"
  ON public.teachers FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins and supervisors can manage teachers"
  ON public.teachers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- Activities policies
CREATE POLICY "Teachers can view their own activities"
  ON public.activities FOR SELECT
  USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Teachers can insert their own activities"
  ON public.activities FOR INSERT
  WITH CHECK (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
  );

CREATE POLICY "Teachers can update their pending activities"
  ON public.activities FOR UPDATE
  USING (
    (teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()) AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins and supervisors can manage all activities"
  ON public.activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- Activity Images policies
CREATE POLICY "Anyone authenticated can view activity images"
  ON public.activity_images FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can insert images for their activities"
  ON public.activity_images FOR INSERT
  WITH CHECK (
    activity_id IN (
      SELECT a.id FROM public.activities a
      JOIN public.teachers t ON a.teacher_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete images of their pending activities"
  ON public.activity_images FOR DELETE
  USING (
    activity_id IN (
      SELECT a.id FROM public.activities a
      JOIN public.teachers t ON a.teacher_id = t.id
      WHERE t.user_id = auth.uid() AND a.status = 'pending'
    )
  );

-- Points policies
CREATE POLICY "Teachers can view their own points"
  ON public.points FOR SELECT
  USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins and supervisors can manage points"
  ON public.points FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Badges policies
CREATE POLICY "Everyone can view badges"
  ON public.badges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage badges"
  ON public.badges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Teacher Badges policies
CREATE POLICY "Everyone can view teacher badges"
  ON public.teacher_badges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can award badges"
  ON public.teacher_badges FOR INSERT
  WITH CHECK (true);

-- Points Settings policies
CREATE POLICY "Everyone can view points settings"
  ON public.points_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage points settings"
  ON public.points_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- SEED DATA
-- =============================================

-- Default points settings
INSERT INTO public.points_settings (key, value, description) VALUES
  ('activity_submit', 10, 'نقاط إضافة نشاط'),
  ('activity_approve', 20, 'نقاط اعتماد النشاط'),
  ('activity_excellent', 30, 'نقاط نشاط متميز'),
  ('activity_images', 5, 'نقاط رفع صور النشاط')
ON CONFLICT (key) DO NOTHING;

-- Default badges
INSERT INTO public.badges (name, description, icon, required_points, required_activities) VALUES
  ('المعلم المتميز', 'حصل على 500 نقطة', '🏆', 500, 0),
  ('نجم الأنشطة', 'نفذ 20 نشاطاً', '⭐', 0, 20),
  ('صاحب الهمة', 'حصل على 200 نقطة', '🔥', 200, 0),
  ('المعلم المبادر', 'نفذ 10 أنشطة', '📚', 0, 10),
  ('صانع الأثر', 'حصل على 1000 نقطة', '🚀', 1000, 0)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- STORAGE BUCKET
-- =============================================
-- Run this in Supabase Dashboard > Storage:
-- Create a bucket named "activity-images" with public access for reading
-- and authenticated upload.

-- Storage policies (run in SQL editor after creating bucket):
/*
INSERT INTO storage.buckets (id, name, public) VALUES ('activity-images', 'activity-images', true);

CREATE POLICY "Authenticated users can upload activity images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'activity-images');

CREATE POLICY "Anyone can view activity images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'activity-images');

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'activity-images' AND auth.uid()::text = (storage.foldername(name))[1]);
*/
