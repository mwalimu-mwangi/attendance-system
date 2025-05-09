import { IStorage } from "./storage";
import { db } from "./db";
import { 
  users, departments, levels, classes, lessons, attendance, systemSettings,
  type User, type Department, type Level, type Class, type Lesson, type Attendance, type SystemSettings,
  type InsertUser, type InsertDepartment, type InsertLevel, type InsertClass, type InsertLesson, type InsertAttendance, type UpdateSystemSettings
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql, count, lt, gt } from "drizzle-orm";
import { isToday } from "date-fns";
import connectPg from "connect-pg-simple";
import type * as sessionTypes from "express-session";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Session store type

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        departmentId: userData.departmentId ?? null,
        levelId: userData.levelId ?? null,
        classId: userData.classId ?? null
      })
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        departmentId: userData.departmentId ?? undefined,
        levelId: userData.levelId ?? undefined,
        classId: userData.classId ?? undefined
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return !!result;
  }

  async getAllUsers(): Promise<Omit<User, "password">[]> {
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        departmentId: users.departmentId,
        levelId: users.levelId,
        classId: users.classId,
        createdAt: users.createdAt
      })
      .from(users);
    return allUsers;
  }

  async getAllTeachers(): Promise<Omit<User, "password">[]> {
    const teachers = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        departmentId: users.departmentId,
        levelId: users.levelId,
        classId: users.classId,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.role, "teacher"));
    return teachers;
  }

  // Department methods
  async getAllDepartments(): Promise<Department[]> {
    return await db.select().from(departments);
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async createDepartment(departmentData: InsertDepartment): Promise<Department> {
    const [department] = await db
      .insert(departments)
      .values(departmentData)
      .returning();
    return department;
  }

  async updateDepartment(id: number, departmentData: InsertDepartment): Promise<Department | undefined> {
    const [department] = await db
      .update(departments)
      .set(departmentData)
      .where(eq(departments.id, id))
      .returning();
    return department;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    const result = await db.delete(departments).where(eq(departments.id, id));
    return !!result;
  }

  // Level methods
  async getAllLevels(): Promise<Level[]> {
    return await db.select().from(levels);
  }

  async getLevel(id: number): Promise<Level | undefined> {
    const [level] = await db.select().from(levels).where(eq(levels.id, id));
    return level;
  }

  async createLevel(levelData: InsertLevel): Promise<Level> {
    const [level] = await db
      .insert(levels)
      .values(levelData)
      .returning();
    return level;
  }

  async updateLevel(id: number, levelData: InsertLevel): Promise<Level | undefined> {
    const [level] = await db
      .update(levels)
      .set(levelData)
      .where(eq(levels.id, id))
      .returning();
    return level;
  }

  async deleteLevel(id: number): Promise<boolean> {
    const result = await db.delete(levels).where(eq(levels.id, id));
    return !!result;
  }

  // Class methods
  async getAllClasses(departmentId?: number, levelId?: number): Promise<Class[]> {
    let query = db.select().from(classes);
    
    if (departmentId) {
      query = query.where(eq(classes.departmentId, departmentId));
    }
    
    if (levelId) {
      query = query.where(eq(classes.levelId, levelId));
    }
    
    return await query;
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [class_] = await db.select().from(classes).where(eq(classes.id, id));
    return class_;
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const [class_] = await db
      .insert(classes)
      .values({
        ...classData,
        academicYear: classData.academicYear ?? null
      })
      .returning();
    return class_;
  }

  async updateClass(id: number, classData: InsertClass): Promise<Class | undefined> {
    const [class_] = await db
      .update(classes)
      .set({
        ...classData,
        academicYear: classData.academicYear ?? null
      })
      .where(eq(classes.id, id))
      .returning();
    return class_;
  }

  async deleteClass(id: number): Promise<boolean> {
    const result = await db.delete(classes).where(eq(classes.id, id));
    return !!result;
  }

  // Lesson methods
  async getAllLessons(classId?: number, teacherId?: number): Promise<Lesson[]> {
    let query = db.select().from(lessons);
    
    if (classId) {
      query = query.where(eq(lessons.classId, classId));
    }
    
    if (teacherId) {
      query = query.where(eq(lessons.teacherId, teacherId));
    }
    
    return await query;
  }

  async getLesson(id: number): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    return lesson;
  }

  async createLesson(lessonData: InsertLesson): Promise<Lesson> {
    // Calculate date objects for start_time and end_time
    const now = new Date();
    const dayDiff = lessonData.dayOfWeek - now.getDay();
    const nearestDate = new Date(now);
    nearestDate.setDate(now.getDate() + (dayDiff >= 0 ? dayDiff : dayDiff + 7));
    
    const hours = Math.floor(lessonData.startTimeMinutes / 60);
    const minutes = lessonData.startTimeMinutes % 60;
    
    const startTime = new Date(nearestDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + (lessonData.durationMinutes || 60));
    
    const [lesson] = await db
      .insert(lessons)
      .values({
        ...lessonData,
        location: lessonData.location ?? null,
        attendanceWindowMinutes: lessonData.attendanceWindowMinutes ?? 30,
        isActive: lessonData.isActive ?? true,
        start_time: startTime,
        end_time: endTime
      })
      .returning();
    return lesson;
  }

  async updateLesson(id: number, lessonData: Partial<InsertLesson>): Promise<Lesson | undefined> {
    // Fetch current lesson to get existing values
    const currentLesson = await this.getLesson(id);
    if (!currentLesson) return undefined;

    // Calculate start_time and end_time if needed
    let startTime = undefined;
    let endTime = undefined;
    
    if (lessonData.dayOfWeek !== undefined || lessonData.startTimeMinutes !== undefined) {
      // Get values to use (either new or existing)
      const dayOfWeek = lessonData.dayOfWeek ?? currentLesson.dayOfWeek;
      const startTimeMinutes = lessonData.startTimeMinutes ?? currentLesson.startTimeMinutes;
      const durationMinutes = lessonData.durationMinutes ?? currentLesson.durationMinutes;
      
      // Calculate date objects for start_time and end_time
      const now = new Date();
      const dayDiff = dayOfWeek - now.getDay();
      const nearestDate = new Date(now);
      nearestDate.setDate(now.getDate() + (dayDiff >= 0 ? dayDiff : dayDiff + 7));
      
      const hours = Math.floor(startTimeMinutes / 60);
      const minutes = startTimeMinutes % 60;
      
      startTime = new Date(nearestDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + durationMinutes);
    }
    
    const [lesson] = await db
      .update(lessons)
      .set({
        ...lessonData,
        location: lessonData.location === undefined ? undefined : (lessonData.location ?? null),
        isActive: lessonData.isActive === undefined ? undefined : (lessonData.isActive ?? null),
        start_time: startTime,
        end_time: endTime
      })
      .where(eq(lessons.id, id))
      .returning();
    return lesson;
  }

  async deleteLesson(id: number): Promise<boolean> {
    const result = await db.delete(lessons).where(eq(lessons.id, id));
    return !!result;
  }

  async getTodaysLessons(classId?: number, teacherId?: number): Promise<Lesson[]> {
    // Get the current day of week (0-6, where 0 is Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Base query - Filter lessons by the current day of week
    let query = db.select().from(lessons).where(eq(lessons.dayOfWeek, dayOfWeek));
    
    if (classId) {
      query = query.where(eq(lessons.classId, classId));
    }
    
    if (teacherId) {
      query = query.where(eq(lessons.teacherId, teacherId));
    }
    
    // Order by start time minutes
    return await query.orderBy(lessons.startTimeMinutes);
  }

  async getTodaysLessonsForTeacher(teacherId: number): Promise<Lesson[]> {
    return this.getTodaysLessons(undefined, teacherId);
  }

  // Attendance methods
  async getAttendanceByLesson(lessonId: number, studentId?: number): Promise<Attendance[]> {
    let query = db.select().from(attendance).where(eq(attendance.lessonId, lessonId));
    
    if (studentId) {
      query = query.where(eq(attendance.studentId, studentId));
    }
    
    return await query;
  }

  async getAttendanceByStudent(studentId: number, lessonId?: number): Promise<Attendance[]> {
    let query = db.select().from(attendance).where(eq(attendance.studentId, studentId));
    
    if (lessonId) {
      query = query.where(eq(attendance.lessonId, lessonId));
    }
    
    return await query;
  }
  
  async getAllAttendance(): Promise<Attendance[]> {
    return await db.select().from(attendance);
  }

  async markAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    // Check if attendance record already exists
    const [existingRecord] = await db
      .select()
      .from(attendance)
      .where(and(
        eq(attendance.lessonId, attendanceData.lessonId),
        eq(attendance.studentId, attendanceData.studentId)
      ));
    
    if (existingRecord) {
      // Update existing record
      const [updated] = await db
        .update(attendance)
        .set({
          status: attendanceData.status,
          markedAt: new Date()
        })
        .where(and(
          eq(attendance.lessonId, attendanceData.lessonId),
          eq(attendance.studentId, attendanceData.studentId)
        ))
        .returning();
      return updated;
    } else {
      // Create new record
      const [newRecord] = await db
        .insert(attendance)
        .values({
          ...attendanceData,
          markedAt: new Date()
        })
        .returning();
      return newRecord;
    }
  }

  async getStudentAttendanceHistory(studentId: number): Promise<any[]> {
    const result = await db
      .select({
        lessonId: lessons.id,
        subject: lessons.subject,
        dayOfWeek: lessons.dayOfWeek,
        startTimeMinutes: lessons.startTimeMinutes,
        durationMinutes: lessons.durationMinutes,
        location: lessons.location,
        status: attendance.status,
        markedAt: attendance.markedAt
      })
      .from(attendance)
      .innerJoin(lessons, eq(attendance.lessonId, lessons.id))
      .where(eq(attendance.studentId, studentId))
      .orderBy(desc(lessons.id)); // Order by lesson ID as a proxy for time
    
    return result;
  }

  async getStudentAttendanceStats(studentId: number): Promise<any> {
    // Get total lessons for the student's class
    const student = await this.getUser(studentId);
    if (!student || !student.classId) {
      return { present: 0, absent: 0, total: 0, presentPercentage: 0 };
    }
    
    const totalLessons = await db
      .select({ count: count() })
      .from(lessons)
      .where(eq(lessons.classId, student.classId))
      .then(result => result[0]?.count || 0);
    
    // Get student's attendance records
    const present = await db
      .select({ count: count() })
      .from(attendance)
      .where(and(
        eq(attendance.studentId, studentId),
        eq(attendance.status, "present")
      ))
      .then(result => result[0]?.count || 0);
    
    const absent = await db
      .select({ count: count() })
      .from(attendance)
      .where(and(
        eq(attendance.studentId, studentId),
        eq(attendance.status, "absent")
      ))
      .then(result => result[0]?.count || 0);
    
    const presentPercentage = totalLessons > 0 ? (present / totalLessons) * 100 : 0;
    
    return {
      present,
      absent,
      total: totalLessons,
      presentPercentage
    };
  }

  async getTeacherAttendanceStats(teacherId: number, classId?: number): Promise<any> {
    let lessonsQuery = db
      .select({
        lessonId: lessons.id,
        classId: lessons.classId
      })
      .from(lessons)
      .where(eq(lessons.teacherId, teacherId));
    
    if (classId) {
      lessonsQuery = lessonsQuery.where(eq(lessons.classId, classId));
    }
    
    const teacherLessons = await lessonsQuery;
    if (teacherLessons.length === 0) {
      return {
        totalStudents: 0,
        totalLessons: 0,
        attendanceRate: 0,
        presentCount: 0,
        absentCount: 0,
        lowAttendanceStudents: []
      };
    }
    
    const lessonIds = teacherLessons.map(lesson => lesson.lessonId);
    
    // Get attendance statistics
    const attendanceStats = await db
      .select({
        status: attendance.status,
        count: count()
      })
      .from(attendance)
      .where(sql`${attendance.lessonId} IN ${lessonIds}`)
      .groupBy(attendance.status);
    
    const presentCount = attendanceStats.find(stat => stat.status === "present")?.count || 0;
    const absentCount = attendanceStats.find(stat => stat.status === "absent")?.count || 0;
    const totalAttendance = presentCount + absentCount;
    const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;
    
    // Get number of students in the class(es)
    const classIds = [...new Set(teacherLessons.map(lesson => lesson.classId))];
    const totalStudents = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.role, "student"),
        sql`${users.classId} IN ${classIds}`
      ))
      .then(result => result[0]?.count || 0);
    
    // Find students with low attendance
    const studentAttendance = await db
      .select({
        studentId: attendance.studentId,
        status: attendance.status,
        count: count()
      })
      .from(attendance)
      .where(sql`${attendance.lessonId} IN ${lessonIds}`)
      .groupBy(attendance.studentId, attendance.status);
    
    const studentAttendanceMap = new Map();
    for (const record of studentAttendance) {
      if (!studentAttendanceMap.has(record.studentId)) {
        studentAttendanceMap.set(record.studentId, { present: 0, absent: 0 });
      }
      
      if (record.status === "present") {
        studentAttendanceMap.get(record.studentId).present = record.count;
      } else {
        studentAttendanceMap.get(record.studentId).absent = record.count;
      }
    }
    
    const lowAttendanceStudents = [];
    for (const [studentId, stats] of studentAttendanceMap.entries()) {
      const total = stats.present + stats.absent;
      const rate = total > 0 ? (stats.present / total) * 100 : 0;
      
      if (rate < 70 && total >= 3) {
        const student = await this.getUser(studentId);
        if (student) {
          lowAttendanceStudents.push({
            id: student.id,
            name: student.fullName,
            attendanceRate: rate,
            present: stats.present,
            absent: stats.absent
          });
        }
      }
    }
    
    return {
      totalStudents,
      totalLessons: teacherLessons.length,
      attendanceRate,
      presentCount,
      absentCount,
      lowAttendanceStudents
    };
  }

  async getOverallAttendanceStats(): Promise<any> {
    // Total students
    const totalStudents = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "student"))
      .then(result => result[0]?.count || 0);
    
    // Total lessons
    const totalLessons = await db
      .select({ count: count() })
      .from(lessons)
      .then(result => result[0]?.count || 0);
    
    // Attendance stats
    const attendanceStats = await db
      .select({
        status: attendance.status,
        count: count()
      })
      .from(attendance)
      .groupBy(attendance.status);
    
    const presentCount = attendanceStats.find(stat => stat.status === "present")?.count || 0;
    const absentCount = attendanceStats.find(stat => stat.status === "absent")?.count || 0;
    const totalAttendance = presentCount + absentCount;
    const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;
    
    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get today's lessons based on day of week
    const dayOfWeek = today.getDay();
    const todaysLessons = await db
      .select({ count: count() })
      .from(lessons)
      .where(eq(lessons.dayOfWeek, dayOfWeek))
      .then(result => result[0]?.count || 0);
    
    // Classes with lowest attendance
    const classAttendance = await db
      .select({
        classId: lessons.classId,
        status: attendance.status,
        count: count()
      })
      .from(attendance)
      .innerJoin(lessons, eq(attendance.lessonId, lessons.id))
      .groupBy(lessons.classId, attendance.status);
    
    const classAttendanceMap = new Map();
    for (const record of classAttendance) {
      if (!classAttendanceMap.has(record.classId)) {
        classAttendanceMap.set(record.classId, { present: 0, absent: 0 });
      }
      
      if (record.status === "present") {
        classAttendanceMap.get(record.classId).present = record.count;
      } else {
        classAttendanceMap.get(record.classId).absent = record.count;
      }
    }
    
    const classesWithStats = [];
    for (const [classId, stats] of classAttendanceMap.entries()) {
      const total = stats.present + stats.absent;
      if (total >= 10) {  // Only include classes with substantial data
        const class_ = await this.getClass(classId);
        if (class_) {
          classesWithStats.push({
            id: class_.id,
            name: class_.name,
            attendanceRate: (stats.present / total) * 100,
            present: stats.present,
            absent: stats.absent
          });
        }
      }
    }
    
    const lowestAttendanceClasses = classesWithStats
      .sort((a, b) => a.attendanceRate - b.attendanceRate)
      .slice(0, 5);
    
    return {
      totalStudents,
      totalLessons,
      todaysLessons,
      attendanceRate,
      presentCount,
      absentCount,
      lowestAttendanceClasses
    };
  }

  // System settings methods
  async getSystemSettings(): Promise<SystemSettings> {
    const [settings] = await db.select().from(systemSettings);
    if (!settings) {
      return this.initializeSystemSettings();
    }
    return settings;
  }

  async updateSystemSettings(settingsData: UpdateSystemSettings): Promise<SystemSettings> {
    // First check if settings exist
    const [existing] = await db.select().from(systemSettings);
    
    if (existing) {
      // Update existing settings
      const [updated] = await db
        .update(systemSettings)
        .set(settingsData)
        .where(eq(systemSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [created] = await db
        .insert(systemSettings)
        .values(settingsData)
        .returning();
      return created;
    }
  }

  async initializeSystemSettings(): Promise<SystemSettings> {
    const [existing] = await db.select().from(systemSettings);
    if (existing) {
      return existing;
    }
    
    const [settings] = await db
      .insert(systemSettings)
      .values({
        defaultAttendanceWindow: 30,
        autoDisableAttendance: true,
        allowTeacherOverride: true,
        emailNotifications: true,
        attendanceReminders: true,
        lowAttendanceAlerts: true,
        schoolName: "Student Attendance System",
        schoolLogo: "",
        letterhead: "",
        defaultLessonDuration: 60,  // 60 minutes default
        defaultLessonGap: 10        // 10 minutes gap between lessons
      })
      .returning();
    
    return settings;
  }
}