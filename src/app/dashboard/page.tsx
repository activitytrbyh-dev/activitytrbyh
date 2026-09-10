import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  formatNumber,
  getStatusLabel,
  getStatusColor,
  levelProgress,
  pointsToNextLevel,
} from "@/lib/utils";
import {
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  Trophy,
  Award,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "teacher";

  // Teacher dashboard
  if (role === "teacher") {
    const { data: teacher } = await supabase
      .from("teachers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!teacher) {
      return (
        <div className="text-center py-20">
          <p className="text-gray-500">جاري إعداد حساب المعلم...</p>
        </div>
      );
    }

    const { data: activities } = await supabase
      .from("activities")
      .select("status")
      .eq("teacher_id", teacher.id);

    const total = activities?.length || 0;
    const approved = activities?.filter((a) => a.status === "approved").length || 0;
    const pending = activities?.filter((a) => a.status === "pending").length || 0;
    const rejected = activities?.filter((a) => a.status === "rejected").length || 0;

    // Rank
    const { count: rank } = await supabase
      .from("teachers")
      .select("*", { count: "exact", head: true })
      .gt("total_points", teacher.total_points);

    const myRank = (rank || 0) + 1;

    // Badges
    const { data: teacherBadges } = await supabase
      .from("teacher_badges")
      .select("*, badge:badges(*)")
      .eq("teacher_id", teacher.id);

    const progress = levelProgress(teacher.total_points);
    const toNext = pointsToNextLevel(teacher.total_points);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            مرحباً، {teacher.name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            إليك ملخص أدائك في الأنشطة الصفية
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي النقاط"
            value={formatNumber(teacher.total_points)}
            icon={<Trophy className="w-5 h-5 text-yellow-500" />}
            color="bg-yellow-50 dark:bg-yellow-900/20"
          />
          <StatCard
            title="الأنشطة"
            value={formatNumber(total)}
            icon={<Activity className="w-5 h-5 text-blue-500" />}
            color="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            title="المعتمدة"
            value={formatNumber(approved)}
            icon={<CheckCircle className="w-5 h-5 text-green-500" />}
            color="bg-green-50 dark:bg-green-900/20"
          />
          <StatCard
            title="الترتيب"
            value={`#${myRank}`}
            icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
            color="bg-purple-50 dark:bg-purple-900/20"
          />
        </div>

        {/* Level Progress */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                المستوى {teacher.level}
              </h3>
              <p className="text-sm text-gray-500">
                {toNext} نقطة للمستوى التالي
              </p>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {teacher.level}
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status breakdown + Badges */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              حالة الأنشطة
            </h3>
            <div className="space-y-3">
              <StatusRow label="قيد المراجعة" count={pending} color="bg-yellow-500" />
              <StatusRow label="معتمد" count={approved} color="bg-green-500" />
              <StatusRow label="مرفوض" count={rejected} color="bg-red-500" />
            </div>
            <Link
              href="/activities"
              className="mt-4 inline-block text-sm text-blue-600 hover:underline"
            >
              عرض جميع الأنشطة ←
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              الشارات
            </h3>
            {teacherBadges && teacherBadges.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {teacherBadges.map((tb: any) => (
                  <div
                    key={tb.badge_id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                    title={tb.badge?.description}
                  >
                    <span className="text-2xl">{tb.badge?.icon}</span>
                    <span className="text-sm font-medium">{tb.badge?.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                لم تحصل على شارات بعد. استمر في إضافة الأنشطة!
              </p>
            )}
            <Link
              href="/badges"
              className="mt-4 inline-block text-sm text-blue-600 hover:underline"
            >
              عرض جميع الشارات ←
            </Link>
          </div>
        </div>

        {/* Quick Action */}
        <div className="bg-gradient-to-l from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">أضف نشاطاً جديداً</h3>
          <p className="text-blue-100 text-sm mb-4">
            سجل أنشطتك الصفية واحصل على نقاط وشارات
          </p>
          <Link
            href="/activities/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition"
          >
            <Activity className="w-4 h-4" />
            إضافة نشاط
          </Link>
        </div>
      </div>
    );
  }

  // Admin / Supervisor dashboard
  const { count: totalTeachers } = await supabase
    .from("teachers")
    .select("*", { count: "exact", head: true });

  const { count: totalActivities } = await supabase
    .from("activities")
    .select("*", { count: "exact", head: true });

  const { count: approvedActivities } = await supabase
    .from("activities")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");

  const { count: pendingActivities } = await supabase
    .from("activities")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { data: topTeachers } = await supabase
    .from("teachers")
    .select("name, total_points, level, department")
    .order("total_points", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          لوحة التحكم
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          نظرة عامة على المنصة
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="المعلمين"
          value={formatNumber(totalTeachers || 0)}
          icon={<Trophy className="w-5 h-5 text-blue-500" />}
          color="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          title="إجمالي الأنشطة"
          value={formatNumber(totalActivities || 0)}
          icon={<Activity className="w-5 h-5 text-indigo-500" />}
          color="bg-indigo-50 dark:bg-indigo-900/20"
        />
        <StatCard
          title="المعتمدة"
          value={formatNumber(approvedActivities || 0)}
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          color="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          title="قيد المراجعة"
          value={formatNumber(pendingActivities || 0)}
          icon={<Clock className="w-5 h-5 text-yellow-500" />}
          color="bg-yellow-50 dark:bg-yellow-900/20"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          أكثر المعلمين نشاطاً
        </h3>
        <div className="space-y-3">
          {topTeachers?.map((t, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {t.name}
                  </p>
                  <p className="text-xs text-gray-500">{t.department || "—"}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-bold text-blue-600">
                  {formatNumber(t.total_points)} نقطة
                </p>
                <p className="text-xs text-gray-500">المستوى {t.level}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
        <div className={`p-2 rounded-xl ${color}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function StatusRow({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
    </div>
  );
}
