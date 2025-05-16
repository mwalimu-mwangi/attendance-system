import { pgTable, text, serial, integer, boolean, timestamp, primaryKey, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// User related schemas
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ["admin", "teacher", "student"] }).notNull(),
  departmentId: integer("department_id"),  // Primary department for teachers/students
  levelId: integer("level_id"),
  classId: integer("class_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Teacher-Department relationships (for multiple departments)
export const teacherDepartments = pgTable("teacher_departments", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  departmentId: integer("department_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    // Ensure each teacher-department combination is unique
    uniqTeacherDepartment: unique().on(table.teacherId, table.departmentId)
  };
});

export const insertTeacherDepartmentSchema = createInsertSchema(teacherDepartments).omit({
  id: true,
  createdAt: true,
});

export type InsertTeacherDepartment = z.infer<typeof insertTeacherDepartmentSchema>;
export type TeacherDepartment = typeof teacherDepartments.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Department schema
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
});

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

// Level schema
export const levels = pgTable("levels", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLevelSchema = createInsertSchema(levels).omit({
  id: true,
  createdAt: true,
});

export type InsertLevel = z.infer<typeof insertLevelSchema>;
export type Level = typeof levels.$inferSelect;

// Class schema
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  departmentId: integer("department_id").notNull(),
  levelId: integer("level_id").notNull(),
  academicYear: text("academic_year"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
});

export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classes.$inferSelect;

// Lesson schema
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  classId: integer("class_id").notNull(),
  teacherId: integer("teacher_id").notNull(),
  // Day of week (0-6, where 0 is Sunday)
  dayOfWeek: integer("day_of_week").notNull(),
  // Times stored as minutes from midnight (e.g., 9:30 AM = 9*60 + 30 = 570)
  startTimeMinutes: integer("start_time_minutes").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  // Number of consecutive lessons (1 = single, 2 = double, 3 = triple, etc.)
  lessonCount: integer("lesson_count").notNull().default(1),
  location: text("location"),
  attendanceWindowMinutes: integer("attendance_window_minutes").notNull().default(30),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
});

// Enhanced lesson validation schema
export const lessonValidationSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(100, "Subject is too long"),
  classId: z.number().int().positive("Class is required"),
  teacherId: z.number().int().positive("Teacher is required"),
  dayOfWeek: z.number().int().min(0).max(6, "Day of week must be between 0 (Sunday) and 6 (Saturday)"),
  startTimeMinutes: z.number().int().min(0).max(1439, "Start time must be between 0 and 1439 minutes"),
  durationMinutes: z.number().int().min(15, "Duration must be at least 15 minutes").max(480, "Duration cannot exceed 8 hours"),
  lessonCount: z.number().int().min(1, "Lesson count must be at least 1").max(5, "Lesson count cannot exceed 5"),
  location: z.string().optional(),
  attendanceWindowMinutes: z.number().int().min(5, "Attendance window must be at least 5 minutes"),
  isActive: z.boolean().default(true),
});

// Helper schemas for the UI
export const dayOfWeekSchema = z.enum([
  "0", "1", "2", "3", "4", "5", "6"
]).transform((val) => parseInt(val));

export const timeMinutesSchema = z.object({
  hours: z.number().int().min(0).max(23),
  minutes: z.number().int().min(0).max(59),
}).transform(({ hours, minutes }) => hours * 60 + minutes);

export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type LessonValidation = z.infer<typeof lessonValidationSchema>;

// Attendance schema
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull(),
  studentId: integer("student_id").notNull(),
  status: text("status", { enum: ["present", "absent"] }).notNull().default("absent"),
  markedAt: timestamp("marked_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    // Use a unique constraint instead of a second primary key
    uniqueIdx: unique("lesson_student_idx").on(table.lessonId, table.studentId),
  };
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
  markedAt: true,
});

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

// System settings schema
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  defaultAttendanceWindow: integer("default_attendance_window").notNull().default(30),
  autoDisableAttendance: boolean("auto_disable_attendance").notNull().default(true),
  allowTeacherOverride: boolean("allow_teacher_override").notNull().default(true),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  attendanceReminders: boolean("attendance_reminders").notNull().default(true),
  lowAttendanceAlerts: boolean("low_attendance_alerts").notNull().default(true),
  // School branding
  schoolName: text("school_name").default(""),
  schoolLogo: text("school_logo").default(""),
  letterhead: text("letterhead").default(""),
  // Lesson duration settings
  defaultLessonDuration: integer("default_lesson_duration").notNull().default(60), // in minutes
  defaultLessonGap: integer("default_lesson_gap").notNull().default(10), // in minutes
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const updateSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export type UpdateSystemSettings = z.infer<typeof updateSystemSettingsSchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;

// Login schema with enhanced validation
export const loginSchema = z.object({
  username: z.string()
    .min(1, "Username is required")
    .max(50, "Username cannot exceed 50 characters")
    .trim(),
  password: z.string()
    .min(1, "Password is required")
    .max(100, "Password is too long"),
})
.refine(data => data.username.length > 0, {
  message: "Username cannot be empty",
  path: ["username"]
});

export type LoginData = z.infer<typeof loginSchema>;

// Student registration schema with enhanced validation
export const studentRegistrationSchema = z.object({
  fullName: z.string()
    .min(1, "Full name is required")
    .max(100, "Full name cannot exceed 100 characters")
    .trim()
    .refine(name => name.length > 0, {
      message: "Full name cannot be empty",
    }),
  username: z.string()
    .min(1, "Admission number is required")
    .max(50, "Admission number cannot exceed 50 characters")
    .trim()
    .refine(username => /^[a-zA-Z0-9_.-]+$/.test(username), {
      message: "Admission number can only contain letters, numbers, and the symbols _.-",
    }),
  departmentId: z.number()
    .int("Department ID must be an integer")
    .positive("Please select a valid department"),
  levelId: z.number()
    .int("Level ID must be an integer")
    .positive("Please select a valid level"),
  classId: z.number()
    .int("Class ID must be an integer")
    .positive("Please select a valid class"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long")
    .refine(password => {
      // At least one letter and one number
      return /^(?=.*[A-Za-z])(?=.*\d).+$/.test(password);
    }, {
      message: "Password must contain at least one letter and one number",
    }),
  confirmPassword: z.string()
    .min(1, "Confirm password is required"),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type StudentRegistration = z.infer<typeof studentRegistrationSchema>;

// Define relations
export const usersRelations = relations(users, ({ one, many }) => ({
  // Primary department
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  level: one(levels, {
    fields: [users.levelId],
    references: [levels.id],
  }),
  class: one(classes, {
    fields: [users.classId],
    references: [classes.id],
  }),
  // For teachers who serve multiple departments
  teacherDepartments: many(teacherDepartments, { relationName: "teacherToDepartments" }),
}));

export const teacherDepartmentsRelations = relations(teacherDepartments, ({ one }) => ({
  teacher: one(users, {
    fields: [teacherDepartments.teacherId],
    references: [users.id],
    relationName: "teacherToDepartments",
  }),
  department: one(departments, {
    fields: [teacherDepartments.departmentId],
    references: [departments.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
  classes: many(classes),
  teacherDepartments: many(teacherDepartments),
}));

export const levelsRelations = relations(levels, ({ many }) => ({
  users: many(users),
  classes: many(classes),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  department: one(departments, {
    fields: [classes.departmentId],
    references: [departments.id],
  }),
  level: one(levels, {
    fields: [classes.levelId],
    references: [levels.id],
  }),
  users: many(users),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  class: one(classes, {
    fields: [lessons.classId],
    references: [classes.id],
  }),
  teacher: one(users, {
    fields: [lessons.teacherId],
    references: [users.id],
  }),
  attendanceRecords: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  lesson: one(lessons, {
    fields: [attendance.lessonId],
    references: [lessons.id],
  }),
  student: one(users, {
    fields: [attendance.studentId],
    references: [users.id],
  }),
}));
