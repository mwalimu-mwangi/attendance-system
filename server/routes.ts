import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAdmin, isTeacher, isAuthenticated, isStudent } from "./auth";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import {
  insertDepartmentSchema,
  insertLevelSchema,
  insertClassSchema,
  insertLessonSchema,
  insertAttendanceSchema,
  updateSystemSettingsSchema
} from "@shared/schema";
import { addMinutes, isPast } from "date-fns";
import { seedDatabase } from "./seed";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Initialize default system settings if not exists
  await storage.initializeSystemSettings();
  
  // Seed the database with initial data
  await seedDatabase();

  // ==== ADMIN ROUTES ====

  // Department routes
  app.get("/api/departments", async (req, res) => {
    const departments = await storage.getAllDepartments();
    res.json(departments);
  });
  
  app.get("/api/departments/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const department = await storage.getDepartment(id);
    
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }
    
    res.json(department);
  });

  app.post("/api/departments", isAdmin, async (req, res, next) => {
    try {
      const departmentData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(departmentData);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.put("/api/departments/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const departmentData = insertDepartmentSchema.parse(req.body);
      const department = await storage.updateDepartment(id, departmentData);
      
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      res.json(department);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.delete("/api/departments/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDepartment(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Level routes
  app.get("/api/levels", async (req, res) => {
    const levels = await storage.getAllLevels();
    res.json(levels);
  });
  
  app.get("/api/levels/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const level = await storage.getLevel(id);
    
    if (!level) {
      return res.status(404).json({ message: "Level not found" });
    }
    
    res.json(level);
  });

  app.post("/api/levels", isAdmin, async (req, res, next) => {
    try {
      const levelData = insertLevelSchema.parse(req.body);
      const level = await storage.createLevel(levelData);
      res.status(201).json(level);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.put("/api/levels/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const levelData = insertLevelSchema.parse(req.body);
      const level = await storage.updateLevel(id, levelData);
      
      if (!level) {
        return res.status(404).json({ message: "Level not found" });
      }
      
      res.json(level);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.delete("/api/levels/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteLevel(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Level not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Class routes
  app.get("/api/classes", async (req, res) => {
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
    const levelId = req.query.levelId ? parseInt(req.query.levelId as string) : undefined;
    
    const classes = await storage.getAllClasses(departmentId, levelId);
    res.json(classes);
  });
  
  app.get("/api/classes/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const classItem = await storage.getClass(id);
    
    if (!classItem) {
      return res.status(404).json({ message: "Class not found" });
    }
    
    res.json(classItem);
  });

  app.post("/api/classes", isAdmin, async (req, res, next) => {
    try {
      const classData = insertClassSchema.parse(req.body);
      const newClass = await storage.createClass(classData);
      res.status(201).json(newClass);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.put("/api/classes/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const classData = insertClassSchema.parse(req.body);
      const updatedClass = await storage.updateClass(id, classData);
      
      if (!updatedClass) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      res.json(updatedClass);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.delete("/api/classes/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteClass(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // User/Teacher management routes
  app.get("/api/teachers", isAdmin, async (req, res) => {
    const teachers = await storage.getAllTeachers();
    res.json(teachers);
  });
  
  app.get("/api/teachers/:id", isAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const teacher = await storage.getUser(id);
    
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ message: "Teacher not found" });
    }
    
    // Remove password from response
    const { password, ...teacherResponse } = teacher;
    res.json(teacherResponse);
  });

  app.post("/api/teachers", isAdmin, async (req, res, next) => {
    try {
      const teacherData = { ...req.body, role: "teacher" };
      const teacher = await storage.createUser(teacherData);
      
      // Remove password from response
      const { password, ...teacherResponse } = teacher;
      res.status(201).json(teacherResponse);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.put("/api/teachers/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const teacherData = { ...req.body, role: "teacher" };
      const teacher = await storage.updateUser(id, teacherData);
      
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      
      // Remove password from response
      const { password, ...teacherResponse } = teacher;
      res.json(teacherResponse);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.delete("/api/teachers/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // System settings routes
  app.get("/api/system-settings", isAdmin, async (req, res) => {
    const settings = await storage.getSystemSettings();
    res.json(settings);
  });

  app.put("/api/system-settings", isAdmin, async (req, res, next) => {
    try {
      const settingsData = updateSystemSettingsSchema.parse(req.body);
      const settings = await storage.updateSystemSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  // ==== TEACHER ROUTES ====

  // Lesson routes for teachers
  app.get("/api/lessons", isAuthenticated, async (req, res) => {
    const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;
    const teacherId = req.query.teacherId ? parseInt(req.query.teacherId as string) : undefined;
    
    // If user is a teacher, limit to their lessons
    if (req.user.role === "teacher" && !teacherId) {
      const lessons = await storage.getAllLessons(classId, req.user.id);
      return res.json(lessons);
    }
    
    // If user is a student, limit to their class's lessons
    if (req.user.role === "student" && !classId) {
      const lessons = await storage.getAllLessons(req.user.classId);
      return res.json(lessons);
    }
    
    // Admin can see all lessons
    const lessons = await storage.getAllLessons(classId, teacherId);
    res.json(lessons);
  });
  
  app.get("/api/lessons/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    
    // Check if id is a valid number
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid lesson ID" });
    }
    
    const lesson = await storage.getLesson(id);
    
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }
    
    // If user is a teacher, ensure they can only see their own lessons
    if (req.user.role === "teacher" && lesson.teacherId !== req.user.id) {
      return res.status(403).json({ message: "You can only view your own lessons" });
    }
    
    // If user is a student, ensure they can only see lessons for their class
    if (req.user.role === "student") {
      // If student doesn't have a classId, they can't view any lessons
      if (!req.user.classId) {
        return res.status(403).json({ message: "You are not assigned to a class yet" });
      }
      
      if (lesson.classId !== req.user.classId) {
        return res.status(403).json({ message: "You can only view lessons for your class" });
      }
    }
    
    res.json(lesson);
  });

  app.post("/api/lessons", isTeacher, async (req, res, next) => {
    try {
      // If user is a teacher, set teacherId to their ID
      const lessonData = req.user.role === "teacher" 
        ? { ...req.body, teacherId: req.user.id }
        : insertLessonSchema.parse(req.body);
      
      const lesson = await storage.createLesson(lessonData);
      res.status(201).json(lesson);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });
  
  // Create recurring lessons
  app.post("/api/lessons/recurring", isTeacher, async (req, res, next) => {
    try {
      const { recurringPattern, ...baseLesson } = req.body;
      
      // Validate the base lesson data
      const lessonData = req.user.role === "teacher" 
        ? { ...baseLesson, teacherId: req.user.id }
        : insertLessonSchema.parse(baseLesson);
      
      // Validate recurring pattern
      if (!recurringPattern || 
          !recurringPattern.daysOfWeek || 
          !Array.isArray(recurringPattern.daysOfWeek) || 
          !recurringPattern.numberOfWeeks) {
        return res.status(400).json({ 
          message: "Invalid recurring pattern. Must include daysOfWeek array and numberOfWeeks."
        });
      }
      
      // Create an array to hold all created lessons
      const createdLessons = [];
      
      // For each selected day of the week in the recurring pattern
      for (const dayOfWeek of recurringPattern.daysOfWeek) {
        // Create a new lesson for this day of week
        const newLessonData = {
          ...lessonData,
          dayOfWeek: dayOfWeek,
        };
        
        // Create the lesson in the database
        const lesson = await storage.createLesson(newLessonData);
        createdLessons.push(lesson);
      }
      
      res.status(201).json({ 
        message: `Successfully created ${createdLessons.length} recurring lessons`,
        lessons: createdLessons
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.put("/api/lessons/:id", isTeacher, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if the teacher owns this lesson
      if (req.user.role === "teacher") {
        const lesson = await storage.getLesson(id);
        if (!lesson || lesson.teacherId !== req.user.id) {
          return res.status(403).json({ message: "You can only update your own lessons" });
        }
      }
      
      const lessonData = insertLessonSchema.parse(req.body);
      const updatedLesson = await storage.updateLesson(id, lessonData);
      
      if (!updatedLesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      res.json(updatedLesson);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.delete("/api/lessons/:id", isTeacher, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if the teacher owns this lesson
      if (req.user.role === "teacher") {
        const lesson = await storage.getLesson(id);
        if (!lesson || lesson.teacherId !== req.user.id) {
          return res.status(403).json({ message: "You can only delete your own lessons" });
        }
      }
      
      const deleted = await storage.deleteLesson(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // ==== STUDENT ROUTES ====

  // Get today's lessons for student
  app.get("/api/lessons/today", isAuthenticated, async (req, res) => {
    if (req.user.role === "student") {
      // If student has no classId assigned, return empty array
      if (!req.user.classId) {
        return res.json([]);
      }
      const lessons = await storage.getTodaysLessons(req.user.classId);
      return res.json(lessons);
    } else if (req.user.role === "teacher") {
      const lessons = await storage.getTodaysLessonsForTeacher(req.user.id);
      return res.json(lessons);
    } else {
      // Admin can see all today's lessons
      const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;
      const teacherId = req.query.teacherId ? parseInt(req.query.teacherId as string) : undefined;
      const lessons = await storage.getTodaysLessons(classId, teacherId);
      return res.json(lessons);
    }
  });
  
  // Get all lessons for a student (past and future)
  app.get("/api/lessons/student", isAuthenticated, async (req, res) => {
    if (req.user.role === "student") {
      // Get all lessons for the student's class
      if (!req.user.classId) {
        return res.json([]);
      }
      const lessons = await storage.getAllLessons(req.user.classId);
      return res.json(lessons);
    } else if (req.user.role === "teacher") {
      // Get all lessons for the teacher
      const lessons = await storage.getAllLessons(undefined, req.user.id);
      return res.json(lessons);
    } else {
      // Admin can filter by student
      const studentId = req.query.studentId ? parseInt(req.query.studentId as string) : undefined;
      if (studentId) {
        const student = await storage.getUser(studentId);
        if (student && student.classId) {
          const lessons = await storage.getAllLessons(student.classId);
          return res.json(lessons);
        }
      }
      return res.status(400).json({ message: "Invalid student ID" });
    }
  });

  // Attendance routes
  app.get("/api/attendance", isAuthenticated, async (req, res) => {
    const lessonId = req.query.lessonId ? parseInt(req.query.lessonId as string) : undefined;
    const studentId = req.query.studentId ? parseInt(req.query.studentId as string) : undefined;
    
    // If user is a student, limit to their attendance
    if (req.user.role === "student" && !studentId) {
      const attendance = await storage.getAttendanceByStudent(req.user.id, lessonId);
      return res.json(attendance);
    }
    
    // Teacher can see attendance for their lessons
    if (req.user.role === "teacher" && lessonId) {
      const lesson = await storage.getLesson(lessonId);
      if (lesson && lesson.teacherId === req.user.id) {
        const attendance = await storage.getAttendanceByLesson(lessonId, studentId);
        return res.json(attendance);
      }
    }
    
    // Admin can see all attendance
    if (req.user.role === "admin") {
      const attendance = lessonId 
        ? await storage.getAttendanceByLesson(lessonId, studentId)
        : await storage.getAttendanceByStudent(studentId!);
      return res.json(attendance);
    }
    
    res.status(403).json({ message: "Unauthorized to view this attendance data" });
  });

  app.post("/api/attendance", isAuthenticated, async (req, res, next) => {
    try {
      const attendanceData = insertAttendanceSchema.parse(req.body);
      
      // Check if the lesson exists
      const lesson = await storage.getLesson(attendanceData.lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Check if attendance window is still open
      const now = new Date();
      const attendanceWindowEnd = addMinutes(
        new Date(lesson.startTime), 
        lesson.attendanceWindowMinutes
      );
      
      if (isPast(attendanceWindowEnd) && lesson.isActive) {
        return res.status(403).json({ 
          message: "Attendance window has closed",
          closedAt: attendanceWindowEnd
        });
      }
      
      // If user is a student, they can only mark their own attendance
      if (req.user.role === "student") {
        if (attendanceData.studentId !== req.user.id) {
          return res.status(403).json({ message: "You can only mark your own attendance" });
        }
        
        // Check if student is part of the class for this lesson
        if (req.user.classId !== lesson.classId) {
          return res.status(403).json({ message: "You are not part of this class" });
        }
      }
      
      // Teachers can mark attendance for any student in their lessons
      if (req.user.role === "teacher" && lesson.teacherId !== req.user.id) {
        return res.status(403).json({ message: "You can only mark attendance for your own lessons" });
      }
      
      const attendance = await storage.markAttendance(attendanceData);
      res.status(201).json(attendance);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  // Get attendance history for student
  app.get("/api/attendance/history", isStudent, async (req, res) => {
    const history = await storage.getStudentAttendanceHistory(req.user.id);
    res.json(history);
  });

  // Get attendance statistics for students
  app.get("/api/attendance/stats", isAuthenticated, async (req, res) => {
    if (req.user.role === "student") {
      const stats = await storage.getStudentAttendanceStats(req.user.id);
      return res.json(stats);
    } else if (req.user.role === "teacher") {
      const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;
      const stats = await storage.getTeacherAttendanceStats(req.user.id, classId);
      return res.json(stats);
    } else {
      // Admin can see all stats
      const stats = await storage.getOverallAttendanceStats();
      return res.json(stats);
    }
  });
  
  // ==== ADMIN ROUTES ====
  
  // System stats for admin dashboard
  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      // Get overall attendance stats
      const attendanceStats = await storage.getOverallAttendanceStats();
      
      // Get all users
      const allTeachers = await storage.getAllTeachers();
      const teachers = allTeachers.filter(user => user.role === "teacher");
      
      // Count students (users with role=student)
      let studentCount = 0;
      try {
        // This will need to be implemented differently based on the actual storage implementation
        // For now, we'll just count all users with student role
        const allUsers = await storage.getAllUsers();
        const students = allUsers.filter(user => user.role === "student");
        studentCount = students.length;
      } catch (error) {
        console.error("Error counting students:", error);
        // Default to 0 if we can't count
      }
      
      // Count departments and classes
      const departments = await storage.getAllDepartments();
      const classes = await storage.getAllClasses();
      
      // Count lessons
      const allLessons = await storage.getAllLessons();
      
      res.json({
        totalStudents: studentCount,
        totalTeachers: teachers.length,
        totalDepartments: departments.length,
        totalClasses: classes.length,
        totalLessons: allLessons.length,
        overallAttendanceRate: attendanceStats.presentPercentage / 100 || 0
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch system statistics" });
    }
  });
  
  // Register a new student (admin only)
  app.post("/api/students", isAdmin, async (req, res, next) => {
    try {
      // Ensure role is always student
      const studentData = { ...req.body, role: "student" };
      const student = await storage.createUser(studentData);
      
      // Remove password from response
      const { password, ...studentResponse } = student;
      res.status(201).json(studentResponse);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });
  
  // Update a student
  app.put("/api/students/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verify this is a student
      const existingStudent = await storage.getUser(id);
      if (!existingStudent || existingStudent.role !== "student") {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Ensure role remains student
      const studentData = { ...req.body, role: "student" };
      const student = await storage.updateUser(id, studentData);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Remove password from response
      const { password, ...studentResponse } = student;
      res.json(studentResponse);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });
  
  // Delete a student
  app.delete("/api/students/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verify this is a student
      const existingStudent = await storage.getUser(id);
      if (!existingStudent || existingStudent.role !== "student") {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  
  // Get student attendance report
  app.get("/api/students/:id/attendance-report", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const student = await storage.getUser(id);
      
      if (!student || student.role !== "student") {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Get student's attendance
      const attendanceRecords = await storage.getAttendanceByStudent(id);
      
      // Get student's class and department
      let classInfo = null;
      let departmentInfo = null;
      
      if (student.classId) {
        classInfo = await storage.getClass(student.classId);
        if (classInfo && classInfo.departmentId) {
          departmentInfo = await storage.getDepartment(classInfo.departmentId);
        }
      }
      
      // Get attendance stats
      const attendanceStats = await storage.getStudentAttendanceStats(id);
      
      // Build lessons details
      const enrichedAttendance = await Promise.all(
        attendanceRecords.map(async record => {
          const lesson = await storage.getLesson(record.lessonId);
          if (!lesson) return null;
          
          return {
            id: record.id,
            lessonId: record.lessonId,
            subject: lesson.subject,
            date: lesson.startTime,
            status: record.status,
            markedAt: record.markedAt
          };
        })
      );
      
      // Filter out nulls
      const validRecords = enrichedAttendance.filter(record => record !== null);
      
      // Sort by date (newest first)
      const sortedRecords = validRecords.sort((a, b) => {
        const dateA = a?.date ? new Date(a.date).getTime() : 0;
        const dateB = b?.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      
      // Format response
      const response = {
        student: {
          id: student.id,
          fullName: student.fullName,
          username: student.username,
          className: classInfo ? classInfo.name : null,
          departmentName: departmentInfo ? departmentInfo.name : null
        },
        stats: attendanceStats,
        records: sortedRecords
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching student attendance report:", error);
      res.status(500).json({ message: "Failed to fetch student attendance report" });
    }
  });
  
  // Get all students
  app.get("/api/students", isAdmin, async (req, res) => {
    try {
      // Get all users
      const allUsers = await storage.getAllUsers();
      
      // Filter to only students
      const students = allUsers
        .filter(user => user.role === "student")
        .map(student => {
          // Remove password from response
          const { password, ...studentData } = student;
          return studentData;
        });
      
      // Add class and department information
      const enrichedStudents = await Promise.all(
        students.map(async student => {
          let classInfo = null;
          let departmentInfo = null;
          
          if (student.classId) {
            classInfo = await storage.getClass(student.classId);
            if (classInfo && classInfo.departmentId) {
              departmentInfo = await storage.getDepartment(classInfo.departmentId);
            }
          }
          
          return {
            ...student,
            className: classInfo ? classInfo.name : null,
            departmentName: departmentInfo ? departmentInfo.name : null
          };
        })
      );
      
      res.json(enrichedStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students data" });
    }
  });
  
  // Get student by ID
  app.get("/api/students/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const student = await storage.getUser(id);
      
      if (!student || student.role !== "student") {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Remove password from response
      const { password, ...studentResponse } = student;
      
      // Get class and department information
      let classInfo = null;
      let departmentInfo = null;
      
      if (student.classId) {
        classInfo = await storage.getClass(student.classId);
        if (classInfo && classInfo.departmentId) {
          departmentInfo = await storage.getDepartment(classInfo.departmentId);
        }
      }
      
      const enrichedStudent = {
        ...studentResponse,
        className: classInfo ? classInfo.name : null,
        departmentName: departmentInfo ? departmentInfo.name : null
      };
      
      res.json(enrichedStudent);
    } catch (error) {
      console.error("Error fetching student:", error);
      res.status(500).json({ message: "Failed to fetch student data" });
    }
  });
  
  // Get all users (teachers and admins)
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      // Get all users
      const allTeachers = await storage.getAllTeachers();
      
      // Add department names to teachers
      const enrichedUsers = await Promise.all(
        allTeachers.filter(user => user.role === "teacher" || user.role === "admin").map(async user => {
          if (user.departmentId) {
            const department = await storage.getDepartment(user.departmentId);
            return {
              ...user,
              departmentName: department ? department.name : null
            };
          }
          return {
            ...user,
            departmentName: null
          };
        })
      );
      
      res.json(enrichedUsers);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Get recent attendance records
  app.get("/api/admin/recent-attendance", isAdmin, async (req, res) => {
    try {
      // Get all attendance records
      const allAttendance = await storage.getAllAttendance();
      
      // Sort by marked time (newest first) and take most recent 20
      const sortedAttendance = allAttendance
        .sort((a, b) => {
          const dateA = a.markedAt ? new Date(a.markedAt).getTime() : 0;
          const dateB = b.markedAt ? new Date(b.markedAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 20);
      
      // Enrich with student, class, and lesson details
      const enrichedAttendance = await Promise.all(
        sortedAttendance.map(async record => {
          const student = await storage.getUser(record.studentId);
          const lesson = await storage.getLesson(record.lessonId);
          
          if (!student || !lesson) {
            return null;
          }
          
          const cls = lesson.classId ? await storage.getClass(lesson.classId) : null;
          
          return {
            id: record.id,
            studentId: record.studentId,
            studentName: student.fullName,
            lessonId: record.lessonId,
            subject: lesson.subject,
            className: cls ? cls.name : "Unknown Class",
            status: record.status,
            markedAt: record.markedAt
          };
        })
      );
      
      // Filter out null entries
      const validRecords = enrichedAttendance.filter(record => record !== null);
      
      res.json(validRecords);
    } catch (error) {
      console.error("Error fetching recent attendance:", error);
      res.status(500).json({ message: "Failed to fetch recent attendance" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
