export type UserRole = "admin" | "supervisor" | "teacher";

export type ActivityStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  school: string | null;
  department: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Teacher {
  id: string;
  user_id: string;
  name: string;
  employee_number: string | null;
  department: string | null;
  total_points: number;
  level: number;
  created_at: string;
  updated_at?: string;
}

export interface Activity {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  activity_type: string;
  grade: string | null;
  activity_date: string;
  objectives: string | null;
  students_count: number;
  status: ActivityStatus;
  points: number;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at?: string;
  // Joined fields
  teacher?: Teacher;
  images?: ActivityImage[];
}

export interface ActivityImage {
  id: string;
  activity_id: string;
  image_url: string;
  storage_path: string | null;
  created_at: string;
}

export interface Point {
  id: string;
  teacher_id: string;
  activity_id: string | null;
  points: number;
  reason: string;
  created_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  required_points: number;
  required_activities: number;
  created_at: string;
}

export interface TeacherBadge {
  teacher_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export interface PointsSetting {
  id: string;
  key: string;
  value: number;
  description: string | null;
  updated_at: string;
}

export interface DashboardStats {
  totalTeachers: number;
  totalActivities: number;
  approvedActivities: number;
  pendingActivities: number;
  totalPoints: number;
  topTeachers: Teacher[];
}
