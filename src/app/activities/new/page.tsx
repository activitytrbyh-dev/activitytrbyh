"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Upload,
  X,
  Loader2,
  ImagePlus,
  Send,
} from "lucide-react";

const ACTIVITY_TYPES = [
  "نشاط صفي",
  "نشاط لاصفي",
  "مشروع",
  "ورشة عمل",
  "مسابقة",
  "رحلة تعليمية",
  "تجربة علمية",
  "أخرى",
];

const GRADES = [
  "الأول الابتدائي",
  "الثاني الابتدائي",
  "الثالث الابتدائي",
  "الرابع الابتدائي",
  "الخامس الابتدائي",
  "السادس الابتدائي",
  "الأول المتوسط",
  "الثاني المتوسط",
  "الثالث المتوسط",
  "الأول الثانوي",
  "الثاني الثانوي",
  "الثالث الثانوي",
];

export default function NewActivityPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState("");
  const [grade, setGrade] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [objectives, setObjectives] = useState("");
  const [studentsCount, setStudentsCount] = useState(0);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newImages = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 10 - images.length)
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !activityType || !activityDate) {
      toast.error("يرجى تعبئة الحقول المطلوبة");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل الدخول");

      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!teacher) throw new Error("حساب المعلم غير موجود");

      // Get points settings
      const { data: settings } = await supabase
        .from("points_settings")
        .select("key, value");

      const pointsMap: Record<string, number> = {};
      settings?.forEach((s) => {
        pointsMap[s.key] = s.value;
      });

      const submitPoints = pointsMap["activity_submit"] || 10;
      const imagePoints =
        images.length > 0 ? pointsMap["activity_images"] || 5 : 0;

      // Create activity
      const { data: activity, error: actError } = await supabase
        .from("activities")
        .insert({
          teacher_id: teacher.id,
          title,
          description,
          activity_type: activityType,
          grade: grade || null,
          activity_date: activityDate,
          objectives: objectives || null,
          students_count: studentsCount,
          status: "pending",
          points: submitPoints + imagePoints,
        })
        .select()
        .single();

      if (actError) throw actError;

      // Upload images
      if (images.length > 0) {
        for (const img of images) {
          const ext = img.file.name.split(".").pop();
          const path = `${user.id}/${activity.id}/${Date.now()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("activity-images")
            .upload(path, img.file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("activity-images").getPublicUrl(path);

          await supabase.from("activity_images").insert({
            activity_id: activity.id,
            image_url: publicUrl,
            storage_path: path,
          });
        }
      }

      // Add points record
      await supabase.from("points").insert({
        teacher_id: teacher.id,
        activity_id: activity.id,
        points: submitPoints + imagePoints,
        reason: "إضافة نشاط جديد" + (images.length > 0 ? " مع صور" : ""),
        created_by: user.id,
      });

      // Notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "تم إرسال النشاط",
        message: `تم إرسال نشاط "${title}" للمراجعة بنجاح.`,
        type: "info",
        link: `/activities/${activity.id}`,
      });

      toast.success("تم إرسال النشاط للمراجعة بنجاح");
      router.push("/activities");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          إضافة نشاط جديد
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          املأ البيانات وأرسل النشاط للمراجعة
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              اسم النشاط <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="مثال: تجربة علمية عن الطاقة المتجددة"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">وصف النشاط</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="وصف مختصر للنشاط..."
            />
          </div>

          {/* Type + Grade */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                نوع النشاط <span className="text-red-500">*</span>
              </label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر النوع</option>
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">الصف</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر الصف</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Students */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                تاريخ التنفيذ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                عدد الطلاب المشاركين
              </label>
              <input
                type="number"
                min={0}
                value={studentsCount}
                onChange={(e) => setStudentsCount(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Objectives */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              أهداف النشاط
            </label>
            <textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="أهداف النشاط التعليمية..."
            />
          </div>

          {/* Images Upload */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              صور النشاط
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                dragOver
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
              }`}
            >
              <ImagePlus className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-500">
                اسحب الصور هنا أو اضغط للاختيار
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG حتى 10 صور
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                {images.map((img, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img
                      src={img.preview}
                      alt=""
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 left-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                إرسال للمراجعة
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
