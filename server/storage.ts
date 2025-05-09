import { users, type User, type InsertUser, departments, type Department, type InsertDepartment, levels, type Level, type InsertLevel, classes, type Class, type InsertClass, lessons, type Lesson, type InsertLesson, attendance, type Attendance, type InsertAttendance, systemSettings, type SystemSettings, type UpdateSystemSettings } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { isPast, isFuture, isToday, addMinutes, format } from "date-fns";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllTeachers(): Promise<Omit<User, "password">[]>;
  getAllUsers(): Promise<Omit<User, "password">[]>;

  // Department methods
  getAllDepartments(): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, departmentData: InsertDepartment): Promise<Department | undefined>;
  deleteDepartment(id: number): Promise<boolean>;

  // Level methods
  getAllLevels(): Promise<Level[]>;
  getLevel(id: number): Promise<Level | undefined>;
  createLevel(level: InsertLevel): Promise<Level>;
  updateLevel(id: number, levelData: InsertLevel): Promise<Level | undefined>;
  deleteLevel(id: number): Promise<boolean>;

  // Class methods
  getAllClasses(departmentId?: number, levelId?: number): Promise<Class[]>;
  getClass(id: number): Promise<Class | undefined>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: number, classData: InsertClass): Promise<Class | undefined>;
  deleteClass(id: number): Promise<boolean>;

  // Lesson methods
  getAllLessons(classId?: number, teacherId?: number): Promise<Lesson[]>;
  getLesson(id: number): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: number, lessonData: Partial<InsertLesson>): Promise<Lesson | undefined>;
  deleteLesson(id: number): Promise<boolean>;
  getTodaysLessons(classId?: number, teacherId?: number): Promise<Lesson[]>;
  getTodaysLessonsForTeacher(teacherId: number): Promise<Lesson[]>;

  // Attendance methods
  getAttendanceByLesson(lessonId: number, studentId?: number): Promise<Attendance[]>;
  getAttendanceByStudent(studentId: number, lessonId?: number): Promise<Attendance[]>;
  markAttendance(attendanceData: InsertAttendance): Promise<Attendance>;
  getStudentAttendanceHistory(studentId: number): Promise<any[]>;
  getStudentAttendanceStats(studentId: number): Promise<any>;
  getTeacherAttendanceStats(teacherId: number, classId?: number): Promise<any>;
  getOverallAttendanceStats(): Promise<any>;
  getAllAttendance(): Promise<Attendance[]>;

  // System settings methods
  getSystemSettings(): Promise<SystemSettings>;
  updateSystemSettings(settings: UpdateSystemSettings): Promise<SystemSettings>;
  initializeSystemSettings(): Promise<SystemSettings>;

  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private departments: Map<number, Department>;
  private levels: Map<number, Level>;
  private classes: Map<number, Class>;
  private lessons: Map<number, Lesson>;
  private attendanceRecords: Map<number, Attendance>;
  private settings: SystemSettings | null;
  
  sessionStore: any;
  
  private userIdCounter: number;
  private departmentIdCounter: number;
  private levelIdCounter: number;
  private classIdCounter: number;
  private lessonIdCounter: number;
  private attendanceIdCounter: number;

  constructor() {
    this.users = new Map();
    this.departments = new Map();
    this.levels = new Map();
    this.classes = new Map();
    this.lessons = new Map();
    this.attendanceRecords = new Map();
    this.settings = null;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    this.userIdCounter = 1;
    this.departmentIdCounter = 1;
    this.levelIdCounter = 1;
    this.classIdCounter = 1;
    this.lessonIdCounter = 1;
    this.attendanceIdCounter = 1;

    // Initialize default data
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Create admin user if it doesn't exist
    const adminUser = await this.getUserByUsername("admin");
    if (!adminUser) {
      // Create a password hash consistent with our hashing function
      const hashedPassword = "24fe4a8a1c96d7ae0dc5054f49b11dfde35a3aefd753c3799ed941ce3244947c.707cf8b5f0f55e0e82bc1d69aabafadf";
      
      await this.createUser({
        username: "admin",
        password: hashedPassword,
        fullName: "System Administrator",
        role: "admin",
      });
    }
    
    // Create a teacher user if it doesn't exist
    const teacherUser = await this.getUserByUsername("teacher");
    if (!teacherUser) {
      const hashedPassword = "24fe4a8a1c96d7ae0dc5054f49b11dfde35a3aefd753c3799ed941ce3244947c.707cf8b5f0f55e0e82bc1d69aabafadf";
      
      await this.createUser({
        username: "teacher",
        password: hashedPassword,
        fullName: "John Smith",
        role: "teacher",
      });
    }
    
    // Create a student user if it doesn't exist
    const studentUser = await this.getUserByUsername("student");
    if (!studentUser) {
      const hashedPassword = "24fe4a8a1c96d7ae0dc5054f49b11dfde35a3aefd753c3799ed941ce3244947c.707cf8b5f0f55e0e82bc1d69aabafadf";
      
      // Get the CS class ID
      const csClass = Array.from(this.classes.values()).find(c => c.name === "CS-101");
      
      if (csClass) {
        await this.createUser({
          username: "student",
          password: hashedPassword,
          fullName: "Jane Doe",
          role: "student",
          departmentId: csClass.departmentId,
          levelId: csClass.levelId,
          classId: csClass.id,
        });
      }
    }

    // Initialize default levels
    const defaultLevels = [
      { number: 3, name: "Entry" },
      { number: 4, name: "Artisan" },
      { number: 5, name: "Craft/Certificate" },
      { number: 6, name: "Diploma" },
    ];

    for (const level of defaultLevels) {
      const existingLevel = Array.from(this.levels.values()).find(l => l.number === level.number);
      if (!existingLevel) {
        await this.createLevel(level);
      }
    }
    
    // Initialize default departments
    const defaultDepartments = [
      { name: "Computer Science" },
      { name: "Business Administration" },
      { name: "Engineering" }
    ];
    
    for (const dept of defaultDepartments) {
      const existingDept = Array.from(this.departments.values()).find(d => d.name === dept.name);
      if (!existingDept) {
        await this.createDepartment(dept);
      }
    }
    
    // Create a default class
    const compSciDept = Array.from(this.departments.values()).find(d => d.name === "Computer Science");
    const entryLevel = Array.from(this.levels.values()).find(l => l.number === 3);
    
    if (compSciDept && entryLevel) {
      const existingClass = Array.from(this.classes.values()).find(
        c => c.departmentId === compSciDept.id && c.levelId === entryLevel.id && c.name === "CS-101"
      );
      
      let csClass;
      if (!existingClass) {
        csClass = await this.createClass({
          name: "CS-101",
          departmentId: compSciDept.id,
          levelId: entryLevel.id,
          academicYear: "2025"
        });
      } else {
        csClass = existingClass;
      }
      
      // Create a teacher for the demo lesson
      const teacher = Array.from(this.users.values()).find(u => u.role === "teacher");
      
      if (teacher && csClass) {
        // Add some demo lessons
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Morning class today
        const morningClass = Array.from(this.lessons.values()).find(
          l => l.classId === csClass.id && l.subject === "Introduction to Programming" && isToday(new Date(l.startTime))
        );
        
        if (!morningClass) {
          const startTime = new Date(today);
          startTime.setHours(9, 0, 0, 0);
          const endTime = new Date(today);
          endTime.setHours(11, 0, 0, 0);
          
          await this.createLesson({
            classId: csClass.id,
            subject: "Introduction to Programming",
            teacherId: teacher.id,
            startTime,
            endTime,
            location: "Room 101",
            isDoubleSession: false,
            attendanceWindowMinutes: 30,
            isActive: true
          });
        }
        
        // Afternoon class today
        const afternoonClass = Array.from(this.lessons.values()).find(
          l => l.classId === csClass.id && l.subject === "Data Structures" && isToday(new Date(l.startTime))
        );
        
        if (!afternoonClass) {
          const startTime = new Date(today);
          startTime.setHours(14, 0, 0, 0);
          const endTime = new Date(today);
          endTime.setHours(16, 0, 0, 0);
          
          await this.createLesson({
            classId: csClass.id,
            subject: "Data Structures",
            teacherId: teacher.id,
            startTime,
            endTime,
            location: "Lab 2",
            isDoubleSession: false,
            attendanceWindowMinutes: 30,
            isActive: true
          });
        }
      }
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = { ...userData, id, createdAt };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllTeachers(): Promise<Omit<User, "password">[]> {
    return Array.from(this.users.values())
      .filter(user => user.role === "teacher")
      .map(({ password, ...user }) => user);
  }
  
  async getAllUsers(): Promise<Omit<User, "password">[]> {
    return Array.from(this.users.values())
      .map(({ password, ...user }) => user);
  }

  // Department methods
  async getAllDepartments(): Promise<Department[]> {
    return Array.from(this.departments.values());
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    return this.departments.get(id);
  }

  async createDepartment(departmentData: InsertDepartment): Promise<Department> {
    const id = this.departmentIdCounter++;
    const createdAt = new Date();
    const department: Department = { ...departmentData, id, createdAt };
    this.departments.set(id, department);
    return department;
  }

  async updateDepartment(id: number, departmentData: InsertDepartment): Promise<Department | undefined> {
    const department = this.departments.get(id);
    if (!department) return undefined;

    const updatedDepartment: Department = { ...department, ...departmentData };
    this.departments.set(id, updatedDepartment);
    return updatedDepartment;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    return this.departments.delete(id);
  }

  // Level methods
  async getAllLevels(): Promise<Level[]> {
    return Array.from(this.levels.values());
  }

  async getLevel(id: number): Promise<Level | undefined> {
    return this.levels.get(id);
  }

  async createLevel(levelData: InsertLevel): Promise<Level> {
    const id = this.levelIdCounter++;
    const createdAt = new Date();
    const level: Level = { ...levelData, id, createdAt };
    this.levels.set(id, level);
    return level;
  }

  async updateLevel(id: number, levelData: InsertLevel): Promise<Level | undefined> {
    const level = this.levels.get(id);
    if (!level) return undefined;

    const updatedLevel: Level = { ...level, ...levelData };
    this.levels.set(id, updatedLevel);
    return updatedLevel;
  }

  async deleteLevel(id: number): Promise<boolean> {
    return this.levels.delete(id);
  }

  // Class methods
  async getAllClasses(departmentId?: number, levelId?: number): Promise<Class[]> {
    let classes = Array.from(this.classes.values());
    
    if (departmentId) {
      classes = classes.filter(cls => cls.departmentId === departmentId);
    }
    
    if (levelId) {
      classes = classes.filter(cls => cls.levelId === levelId);
    }
    
    return classes;
  }

  async getClass(id: number): Promise<Class | undefined> {
    return this.classes.get(id);
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const id = this.classIdCounter++;
    const createdAt = new Date();
    const newClass: Class = { ...classData, id, createdAt };
    this.classes.set(id, newClass);
    return newClass;
  }

  async updateClass(id: number, classData: InsertClass): Promise<Class | undefined> {
    const existingClass = this.classes.get(id);
    if (!existingClass) return undefined;

    const updatedClass: Class = { ...existingClass, ...classData };
    this.classes.set(id, updatedClass);
    return updatedClass;
  }

  async deleteClass(id: number): Promise<boolean> {
    return this.classes.delete(id);
  }

  // Lesson methods
  async getAllLessons(classId?: number, teacherId?: number): Promise<Lesson[]> {
    let allLessons = Array.from(this.lessons.values());
    
    if (classId) {
      allLessons = allLessons.filter(lesson => lesson.classId === classId);
    }
    
    if (teacherId) {
      allLessons = allLessons.filter(lesson => lesson.teacherId === teacherId);
    }
    
    return allLessons;
  }

  async getLesson(id: number): Promise<Lesson | undefined> {
    return this.lessons.get(id);
  }

  async createLesson(lessonData: InsertLesson): Promise<Lesson> {
    const id = this.lessonIdCounter++;
    const createdAt = new Date();
    const lesson: Lesson = { ...lessonData, id, createdAt };
    this.lessons.set(id, lesson);
    return lesson;
  }

  async updateLesson(id: number, lessonData: Partial<InsertLesson>): Promise<Lesson | undefined> {
    const lesson = this.lessons.get(id);
    if (!lesson) return undefined;

    const updatedLesson: Lesson = { ...lesson, ...lessonData };
    this.lessons.set(id, updatedLesson);
    return updatedLesson;
  }

  async deleteLesson(id: number): Promise<boolean> {
    return this.lessons.delete(id);
  }

  async getTodaysLessons(classId?: number, teacherId?: number): Promise<Lesson[]> {
    return Array.from(this.lessons.values())
      .filter(lesson => {
        const lessonDate = new Date(lesson.startTime);
        const isMatchingClass = !classId || lesson.classId === classId;
        const isMatchingTeacher = !teacherId || lesson.teacherId === teacherId;
        return isToday(lessonDate) && isMatchingClass && isMatchingTeacher;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  async getTodaysLessonsForTeacher(teacherId: number): Promise<Lesson[]> {
    return this.getTodaysLessons(undefined, teacherId);
  }

  // Attendance methods
  async getAttendanceByLesson(lessonId: number, studentId?: number): Promise<Attendance[]> {
    return Array.from(this.attendanceRecords.values())
      .filter(record => 
        record.lessonId === lessonId && 
        (!studentId || record.studentId === studentId)
      );
  }

  async getAttendanceByStudent(studentId: number, lessonId?: number): Promise<Attendance[]> {
    return Array.from(this.attendanceRecords.values())
      .filter(record => 
        record.studentId === studentId && 
        (!lessonId || record.lessonId === lessonId)
      );
  }

  async markAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    // Check if attendance already exists for this student and lesson
    const existingAttendance = Array.from(this.attendanceRecords.values())
      .find(record => 
        record.lessonId === attendanceData.lessonId && 
        record.studentId === attendanceData.studentId
      );

    if (existingAttendance) {
      // Update existing attendance
      const updatedAttendance: Attendance = {
        ...existingAttendance,
        status: attendanceData.status,
        markedAt: new Date(),
      };
      this.attendanceRecords.set(existingAttendance.id, updatedAttendance);
      return updatedAttendance;
    } else {
      // Create new attendance record
      const id = this.attendanceIdCounter++;
      const createdAt = new Date();
      const markedAt = new Date();
      const attendance: Attendance = {
        ...attendanceData,
        id,
        markedAt,
        createdAt,
      };
      this.attendanceRecords.set(id, attendance);
      return attendance;
    }
  }

  async getStudentAttendanceHistory(studentId: number): Promise<any[]> {
    const attendanceRecords = Array.from(this.attendanceRecords.values())
      .filter(record => record.studentId === studentId);
    
    const history = [];
    
    for (const record of attendanceRecords) {
      const lesson = this.lessons.get(record.lessonId);
      if (lesson) {
        history.push({
          id: record.id,
          date: format(new Date(lesson.startTime), 'MMMM dd, yyyy'),
          subject: lesson.subject,
          status: record.status,
          markedAt: record.markedAt,
        });
      }
    }
    
    // Sort by date descending
    return history.sort((a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime());
  }

  async getStudentAttendanceStats(studentId: number): Promise<any> {
    const studentAttendance = Array.from(this.attendanceRecords.values())
      .filter(record => record.studentId === studentId);
    
    // Today's lessons count
    const todaysLessons = await this.getTodaysLessons();
    const studentClassId = (await this.getUser(studentId))?.classId;
    const todaysLessonsForStudent = studentClassId 
      ? todaysLessons.filter(lesson => lesson.classId === studentClassId)
      : [];
    
    // Weekly attendance percentage
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyLessons = Array.from(this.lessons.values())
      .filter(lesson => {
        const lessonDate = new Date(lesson.startTime);
        return lessonDate >= oneWeekAgo && 
               (!studentClassId || lesson.classId === studentClassId);
      });
    
    const weeklyAttendance = studentAttendance.filter(record => {
      const lesson = this.lessons.get(record.lessonId);
      if (!lesson) return false;
      
      const lessonDate = new Date(lesson.startTime);
      return lessonDate >= oneWeekAgo;
    });
    
    const weeklyAttendancePercentage = weeklyLessons.length > 0 
      ? Math.round((weeklyAttendance.filter(a => a.status === "present").length / weeklyLessons.length) * 100)
      : 0;
    
    // Overall attendance percentage
    const allLessonsForStudent = Array.from(this.lessons.values())
      .filter(lesson => {
        const lessonDate = new Date(lesson.startTime);
        return isPast(lessonDate) && 
               (!studentClassId || lesson.classId === studentClassId);
      });
    
    const overallAttendancePercentage = allLessonsForStudent.length > 0 
      ? Math.round((studentAttendance.filter(a => a.status === "present").length / allLessonsForStudent.length) * 100)
      : 0;
    
    return {
      todaysLessonsCount: todaysLessonsForStudent.length,
      weeklyAttendancePercentage,
      overallAttendancePercentage,
    };
  }

  async getAllAttendance(): Promise<Attendance[]> {
    return Array.from(this.attendanceRecords.values());
  }
  
  async getTeacherAttendanceStats(teacherId: number, classId?: number): Promise<any> {
    // Get lessons taught by this teacher
    const teacherLessons = Array.from(this.lessons.values())
      .filter(lesson => lesson.teacherId === teacherId && (!classId || lesson.classId === classId));
    
    // Get attendance for these lessons
    const attendanceRecords = Array.from(this.attendanceRecords.values())
      .filter(record => {
        const lesson = teacherLessons.find(l => l.id === record.lessonId);
        return !!lesson;
      });
    
    // Today's lessons count
    const todaysLessons = await this.getTodaysLessonsForTeacher(teacherId);
    
    // Students with low attendance
    const studentAttendanceMap = new Map<number, { present: number; total: number }>();
    
    for (const lesson of teacherLessons) {
      const lessonAttendance = attendanceRecords.filter(record => record.lessonId === lesson.id);
      
      // Get all students in this class
      const studentsInClass = Array.from(this.users.values())
        .filter(user => user.role === "student" && user.classId === lesson.classId)
        .map(user => user.id);
      
      for (const studentId of studentsInClass) {
        const studentRecord = studentAttendanceMap.get(studentId) || { present: 0, total: 0 };
        studentRecord.total += 1;
        
        const isPresent = lessonAttendance.some(
          record => record.studentId === studentId && record.status === "present"
        );
        
        if (isPresent) {
          studentRecord.present += 1;
        }
        
        studentAttendanceMap.set(studentId, studentRecord);
      }
    }
    
    // Find students with less than 75% attendance
    const lowAttendanceStudents = Array.from(studentAttendanceMap.entries())
      .filter(([_, stats]) => stats.total > 0 && (stats.present / stats.total) < 0.75)
      .map(([studentId, _]) => studentId);
    
    return {
      todaysLessonsCount: todaysLessons.length,
      totalClassesCount: teacherLessons.length,
      lowAttendanceStudentsCount: lowAttendanceStudents.length,
    };
  }

  async getOverallAttendanceStats(): Promise<any> {
    const teachers = await this.getAllTeachers();
    const departments = await this.getAllDepartments();
    const studentsCount = Array.from(this.users.values())
      .filter(user => user.role === "student").length;
    const classesCount = this.classes.size;
    
    return {
      teachersCount: teachers.length,
      studentsCount,
      departmentsCount: departments.length,
      classesCount,
    };
  }

  // System settings methods
  async getSystemSettings(): Promise<SystemSettings> {
    if (!this.settings) {
      await this.initializeSystemSettings();
    }
    return this.settings!;
  }

  async updateSystemSettings(settingsData: UpdateSystemSettings): Promise<SystemSettings> {
    if (!this.settings) {
      await this.initializeSystemSettings();
    }
    
    this.settings = {
      ...this.settings!,
      ...settingsData,
      updatedAt: new Date(),
    };
    
    return this.settings;
  }

  async initializeSystemSettings(): Promise<SystemSettings> {
    if (!this.settings) {
      this.settings = {
        id: 1,
        defaultAttendanceWindow: 30,
        autoDisableAttendance: true,
        allowTeacherOverride: true,
        emailNotifications: true,
        attendanceReminders: true,
        lowAttendanceAlerts: true,
        updatedAt: new Date(),
      };
    }
    
    return this.settings;
  }
}

import { DatabaseStorage } from "./databaseStorage";

// Export database storage as the main storage implementation
export const storage = new DatabaseStorage();
