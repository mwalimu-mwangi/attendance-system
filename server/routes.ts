import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAdmin, isTeacher, isAuthenticated, isStudent, hashPassword, comparePasswords } from "./auth";
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
import { addTestData } from "./test-data";
import { clearAllData } from "./clear-data";
import { createBackup, restoreFromBackup, listBackups, deleteBackup } from "./backup-restore";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Initialize default system settings if not exists
  await storage.initializeSystemSettings();
  
  // Seed the database with initial data
  await seedDatabase();
  
  // Add test data for development
  await addTestData();

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
    
    try {
      // Get all classes
      const classes = await storage.getAllClasses(departmentId, levelId);
      
      // Get all users to count students per class
      const allUsers = await storage.getAllUsers();
      
      // Enhance classes with student count
      const classesWithStudentCount = classes.map(classItem => {
        // Count students belonging to this class
        const studentCount = allUsers.filter(user => 
          user.role === "student" && user.classId === classItem.id
        ).length;
        
        return {
          ...classItem,
          studentCount
        };
      });
      
      res.json(classesWithStudentCount);
    } catch (error) {
      console.error("Error fetching classes with student count:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
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
  
  // Teacher-Department relationship routes
  app.get("/api/teachers/:id/departments", isAuthenticated, async (req, res) => {
    const teacherId = parseInt(req.params.id);
    
    // Only admin or the teacher themselves can see their department assignments
    if (req.user?.role !== "admin" && req.user?.id !== teacherId) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    const teacherDepts = await storage.getTeacherDepartments(teacherId);
    res.json(teacherDepts);
  });
  
  app.post("/api/teachers/:id/departments", isAdmin, async (req, res, next) => {
    try {
      const teacherId = parseInt(req.params.id);
      const { departmentId } = req.body;
      
      if (!departmentId) {
        return res.status(400).json({ message: "Department ID is required" });
      }
      
      // Verify teacher exists
      const teacher = await storage.getUser(teacherId);
      if (!teacher || teacher.role !== "teacher") {
        return res.status(404).json({ message: "Teacher not found" });
      }
      
      // Verify department exists
      const department = await storage.getDepartment(departmentId);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      // Add teacher to department
      const relation = await storage.addTeacherToDepartment(teacherId, departmentId);
      res.status(201).json(relation);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/teachers/:teacherId/departments/:departmentId", isAdmin, async (req, res, next) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const departmentId = parseInt(req.params.departmentId);
      
      // Remove teacher from department
      const success = await storage.removeTeacherFromDepartment(teacherId, departmentId);
      
      if (!success) {
        return res.status(404).json({ message: "Teacher-department relationship not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/departments/:id/teachers", isAuthenticated, async (req, res) => {
    const departmentId = parseInt(req.params.id);
    
    // Verify department exists
    const department = await storage.getDepartment(departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }
    
    const teachers = await storage.getTeachersByDepartment(departmentId);
    res.json(teachers);
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

  // Lesson routes - ORDER MATTERS FOR EXPRESS ROUTING!
  // Specific routes must come before parameterized routes to avoid conflicts
  
  // Get today's lessons based on user role
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
      // If no student ID provided or invalid, return all lessons
      const lessons = await storage.getAllLessons();
      return res.json(lessons);
    }
  });
  
  // Get all lessons with optional filters
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
  
  // Get lesson by ID - THIS MUST COME AFTER OTHER /api/lessons/* ROUTES
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
      
      // Check for existing lessons with the same attributes
      const existingLessons = await storage.getAllLessons(lessonData.classId, lessonData.teacherId);
      const potentialDuplicate = existingLessons.find(existing => 
        existing.dayOfWeek === lessonData.dayOfWeek &&
        existing.subject === lessonData.subject &&
        existing.startTimeMinutes === lessonData.startTimeMinutes
      );
      
      if (potentialDuplicate) {
        return res.status(400).json({ 
          message: "A lesson with the same day, subject, and start time already exists for this class and teacher" 
        });
      }
      
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

  // Instant lesson creation - available to both admin and teacher roles
  app.post("/api/instant-lesson", isAuthenticated, async (req, res, next) => {
    try {
      const { subject, classId, location, durationMinutes, attendanceWindowMinutes } = req.body;
      
      // We can safely use req.user here since isAuthenticated middleware ensures it exists
      if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
        return res.status(403).json({ message: "Unauthorized. Only admins and teachers can create instant lessons" });
      }
      
      // Validate required fields
      if (!subject || !classId) {
        return res.status(400).json({ message: "Subject and classId are required fields" });
      }
      
      // For teachers, ensure they are assigned to the class's department
      if (req.user.role === 'teacher') {
        const classInfo = await storage.getClass(parseInt(classId));
        if (!classInfo) {
          return res.status(404).json({ message: "Class not found" });
        }
        
        const teacherDepartments = await storage.getTeacherDepartments(req.user.id);
        const departmentIds = teacherDepartments.map(td => td.departmentId);
        
        if (!departmentIds.includes(classInfo.departmentId)) {
          return res.status(403).json({ 
            message: "You can only create instant lessons for classes in your departments" 
          });
        }
      }
      
      // Create the instant lesson for the current time
      const now = new Date();
      const currentDay = now.getDay(); // 0-6 (Sunday-Saturday)
      
      // Calculate minutes from midnight for current time
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const startTimeMinutes = (currentHour * 60) + currentMinute;
      
      const lessonData = {
        subject,
        classId: parseInt(classId),
        teacherId: req.user.id,
        dayOfWeek: currentDay,
        startTimeMinutes,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : 60, // Default to 1 hour if not specified
        location: location || "Default Location",
        attendanceWindowMinutes: attendanceWindowMinutes ? parseInt(attendanceWindowMinutes) : 30, // Default to 30 min
        isActive: true,
        lessonCount: 0
      };
      
      const lesson = await storage.createLesson(lessonData);
      res.status(201).json(lesson);
    } catch (error) {
      console.error("Error creating instant lesson:", error);
      next(error);
    }
  });
  
  // Teacher student management APIs
  app.post("/api/teacher/register-student", isTeacher, async (req, res, next) => {
    try {
      const { studentId, classId } = req.body;
      
      if (!studentId || !classId) {
        return res.status(400).json({ message: "studentId and classId are required" });
      }
      
      // Get the class info
      const classInfo = await storage.getClass(parseInt(classId));
      if (!classInfo) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      // Check if teacher is authorized to manage this class
      // isTeacher middleware ensures req.user exists and is a teacher
      const teacherDepartments = await storage.getTeacherDepartments(req.user.id);
      const departmentIds = teacherDepartments.map(td => td.departmentId);
      
      if (!departmentIds.includes(classInfo.departmentId)) {
        return res.status(403).json({ 
          message: "You can only manage students for classes in your departments" 
        });
      }
      
      // Get the student
      const student = await storage.getUser(parseInt(studentId));
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      if (student.role !== "student") {
        return res.status(400).json({ message: "User is not a student" });
      }
      
      // Update student's class assignment
      const updatedStudent = await storage.updateUser(parseInt(studentId), {
        classId: parseInt(classId),
        departmentId: classInfo.departmentId,
        levelId: classInfo.levelId
      });
      
      if (!updatedStudent) {
        return res.status(500).json({ message: "Failed to update student" });
      }
      
      res.json({
        message: "Student registered to class successfully",
        student: {
          id: updatedStudent.id,
          username: updatedStudent.username,
          fullName: updatedStudent.fullName,
          role: updatedStudent.role,
          classId: updatedStudent.classId,
          departmentId: updatedStudent.departmentId,
          levelId: updatedStudent.levelId
        }
      });
      
    } catch (error) {
      console.error("Error registering student to class:", error);
      next(error);
    }
  });
  
  app.post("/api/teacher/deregister-student", isTeacher, async (req, res, next) => {
    try {
      const { studentId } = req.body;
      
      if (!studentId) {
        return res.status(400).json({ message: "studentId is required" });
      }
      
      // Get the student
      const student = await storage.getUser(parseInt(studentId));
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      if (student.role !== "student") {
        return res.status(400).json({ message: "User is not a student" });
      }
      
      if (!student.classId) {
        return res.status(400).json({ message: "Student is not registered to any class" });
      }
      
      // Get the class info to check permissions
      const classInfo = await storage.getClass(student.classId);
      if (!classInfo) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      // Check if teacher is authorized to manage this class
      // isTeacher middleware ensures req.user exists and is a teacher
      const teacherDepartments = await storage.getTeacherDepartments(req.user.id);
      const departmentIds = teacherDepartments.map(td => td.departmentId);
      
      if (!departmentIds.includes(classInfo.departmentId)) {
        return res.status(403).json({ 
          message: "You can only manage students for classes in your departments" 
        });
      }
      
      // Update student to remove class assignment
      const updatedStudent = await storage.updateUser(parseInt(studentId), {
        classId: null,
        departmentId: null,
        levelId: null
      });
      
      if (!updatedStudent) {
        return res.status(500).json({ message: "Failed to update student" });
      }
      
      res.json({
        message: "Student deregistered from class successfully",
        student: {
          id: updatedStudent.id,
          username: updatedStudent.username,
          fullName: updatedStudent.fullName,
          role: updatedStudent.role,
          classId: updatedStudent.classId,
          departmentId: updatedStudent.departmentId,
          levelId: updatedStudent.levelId
        }
      });
      
    } catch (error) {
      console.error("Error deregistering student from class:", error);
      next(error);
    }
  });

  // API to get teacher departments
  app.get("/api/teacher/departments", isTeacher, async (req, res) => {
    try {
      // isTeacher middleware ensures req.user exists and is a teacher
      const teacherDepartments = await storage.getTeacherDepartments(req.user.id);
      res.json(teacherDepartments);
    } catch (error) {
      console.error("Error fetching teacher departments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==== STUDENT ROUTES ====

  // Student routes have been moved to the top of the file
  // to ensure proper route order in Express

  // Attendance routes
  app.get("/api/attendance", isAuthenticated, async (req, res) => {
    const lessonId = req.query.lessonId ? parseInt(req.query.lessonId as string) : undefined;
    const studentId = req.query.studentId ? parseInt(req.query.studentId as string) : undefined;
    const dayOfWeek = req.query.dayOfWeek ? req.query.dayOfWeek as string : undefined;
    
    // If user is a student, limit to their attendance
    if (req.user.role === "student" && !studentId) {
      const attendance = await storage.getAttendanceByStudent(req.user.id, lessonId);
      return res.json(attendance);
    }
    
    // Teacher can see attendance for their lessons
    if (req.user.role === "teacher") {
      if (lessonId) {
        const lesson = await storage.getLesson(lessonId);
        if (lesson && lesson.teacherId === req.user.id) {
          const attendance = await storage.getAttendanceByLesson(lessonId, studentId);
          return res.json(attendance);
        }
      } else if (dayOfWeek) {
        // Get attendance for lessons on specific day
        const dayNum = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayOfWeek);
        if (dayNum >= 0) {
          // Get lessons for this teacher on specific day
          const lessons = await storage.getAllLessons(undefined, req.user.id);
          const filteredLessons = lessons.filter(lesson => lesson.dayOfWeek === dayNum);
          
          // Collect attendance for all filtered lessons
          const attendanceRecords = [];
          for (const lesson of filteredLessons) {
            const records = await storage.getAttendanceByLesson(lesson.id, studentId);
            attendanceRecords.push(...records);
          }
          return res.json(attendanceRecords);
        }
      }
    }
    
    // Admin can see all attendance
    if (req.user.role === "admin") {
      if (lessonId) {
        const attendance = await storage.getAttendanceByLesson(lessonId, studentId);
        return res.json(attendance);
      } else if (dayOfWeek) {
        // Filter attendance by day of week
        const dayNum = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayOfWeek);
        if (dayNum >= 0) {
          const lessons = await storage.getAllLessons();
          const filteredLessons = lessons.filter(lesson => lesson.dayOfWeek === dayNum);
          
          // Collect attendance for all filtered lessons
          const attendanceRecords = [];
          for (const lesson of filteredLessons) {
            const records = await storage.getAttendanceByLesson(lesson.id, studentId);
            attendanceRecords.push(...records);
          }
          return res.json(attendanceRecords);
        }
        return res.json([]);
      } else if (studentId) {
        const attendance = await storage.getAttendanceByStudent(studentId);
        return res.json(attendance);
      } else {
        // No filters, return all attendance
        const attendance = await storage.getAllAttendance();
        return res.json(attendance);
      }
    }
    
    res.status(403).json({ message: "Unauthorized to view this attendance data" });
  });

  app.post("/api/attendance", isAuthenticated, async (req, res, next) => {
    try {
      const attendanceData = insertAttendanceSchema.parse(req.body);
      const forceAttendance = req.query.force === 'true'; // Allow forcing attendance regardless of window
      
      // Check if the lesson exists
      const lesson = await storage.getLesson(attendanceData.lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Get system settings for default values
      const systemSettings = await storage.getSystemSettings();
      
      // Check if attendance window is still open
      const now = new Date();
      
      // Calculate the start time for the current/most recent occurrence of this lesson
      const currentDayOfWeek = now.getDay(); // 0-6, 0 is Sunday
      const daysUntilNext = (lesson.dayOfWeek - currentDayOfWeek + 7) % 7;
      
      // If the lesson is not today, we'll allow attendance marking for administration purposes
      let lessonDate = new Date(now);
      if (lesson.dayOfWeek !== currentDayOfWeek) {
        // For non-admins, only allow marking attendance on the actual day unless it's for past lessons
        if (req.user.role === "student" && daysUntilNext !== 0) {
          // Only admin/teacher can mark attendance for other days
          if (daysUntilNext > 0) {
            return res.status(403).json({ 
              message: "Cannot mark attendance for future lessons"
            });
          }
        }
        
        // Set the date to the most recent occurrence of this day of week
        lessonDate.setDate(now.getDate() - ((currentDayOfWeek - lesson.dayOfWeek + 7) % 7));
      }
      
      // Set the time from startTimeMinutes
      const startHours = Math.floor(lesson.startTimeMinutes / 60);
      const startMinutes = lesson.startTimeMinutes % 60;
      lessonDate.setHours(startHours, startMinutes, 0, 0);
      
      // Check if this is an instant lesson created recently
      const isInstantLesson = lesson.createdAt && 
        (now.getTime() - new Date(lesson.createdAt).getTime() < 24 * 60 * 60 * 1000);
      
      // For instant lessons, use a different window calculation
      let preClassWindow, lessonEndTime;
      
      if (isInstantLesson) {
        // For instant lessons, attendance window starts immediately at creation time
        preClassWindow = new Date(lesson.createdAt || now);
        
        // And ends after the configured attendance window duration
        lessonEndTime = new Date(preClassWindow);
        lessonEndTime.setMinutes(lessonEndTime.getMinutes() + (lesson.attendanceWindowMinutes || 30));
        
        console.log("Instant lesson detected, attendance window:", {
          createdAt: lesson.createdAt,
          preClassWindow,
          lessonEndTime,
          now
        });
      } else {
        // Regular lessons: calculate pre-class window (10 minutes before class starts)
        preClassWindow = new Date(lessonDate);
        preClassWindow.setMinutes(preClassWindow.getMinutes() - 10);
        
        // Calculate end of lesson time
        lessonEndTime = new Date(lessonDate);
        lessonEndTime.setMinutes(lessonEndTime.getMinutes() + lesson.durationMinutes);
      }
      
      // Allow attendance marking from the calculated window start until the window end
      // Only enforce window for students, allow teachers and admins to mark anytime with force parameter
      if (req.user && req.user.role === "student" && (now < preClassWindow || now > lessonEndTime) && lesson.isActive && !forceAttendance) {
        return res.status(403).json({ 
          message: "Attendance window is not open",
          opensAt: preClassWindow,
          closesAt: lessonEndTime,
          currentTime: now,
          isInstantLesson: isInstantLesson
        });
      }
      
      // Allow teachers and admins to override the attendance window
      if (req.user && (req.user.role === "teacher" || req.user.role === "admin") && !forceAttendance) {
        // Provide warning but still allow the operation
        if (now < preClassWindow || now > lessonEndTime) {
          // This is just a warning - the attendance will still be marked
          console.log("Attendance marked outside the standard window");
        }
      }
      
      // If user is not authenticated, reject the request
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
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
  
  // Update a student - support both PUT and PATCH for backward compatibility
  app.put("/api/students/:id", isAdmin, updateStudent);
  app.patch("/api/students/:id", isAdmin, updateStudent);

  // Common handler for student updates
  async function updateStudent(req: any, res: any, next: any) {
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
  }
  
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
            date: (lesson.createdAt || new Date()).toISOString(),
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
  
  // Get all students (with optional classId filter)
  app.get("/api/students", isAuthenticated, async (req, res) => {
    try {
      const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;
      
      // If user is a teacher, only allow access to students in classes they teach
      if (req.user.role === "teacher" && classId) {
        // Check if teacher teaches this class
        const teacherLessons = await storage.getAllLessons(classId, req.user.id);
        if (teacherLessons.length === 0) {
          return res.status(403).json({ message: "You are not teaching any lessons in this class" });
        }
      }
      
      // Get all users
      const allUsers = await storage.getAllUsers();
      
      // Filter to only students
      let students = allUsers
        .filter(user => user.role === "student")
        .map(student => {
          // Remove password from response
          const { password, ...studentData } = student;
          return studentData;
        });
      
      // Filter by classId if provided
      if (classId) {
        students = students.filter(student => student.classId === classId);
      }
      
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

  // Add endpoint to clear all data (admin only)
  app.post("/api/system/clear-data", isAdmin, async (req, res) => {
    try {
      // Verify the admin wants to clear all data
      const { confirm } = req.body;
      if (confirm !== 'yes-delete-all-data') {
        return res.status(400).json({ 
          success: false, 
          message: "Please confirm data deletion by setting 'confirm' to 'yes-delete-all-data'" 
        });
      }
      
      // Only allow admins to clear data
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: "Only administrators can clear system data" 
        });
      }

      // Run the data clearing process
      const result = await clearAllData();
      
      // Return the result
      res.json(result);
    } catch (error) {
      console.error("Error clearing data:", error);
      res.status(500).json({ 
        success: false, 
        message: "An error occurred while clearing data"
      });
    }
  });
  
  // Backup and Restore API endpoints
  
  // List all available backups
  app.get("/api/system/backups", isAdmin, async (req, res) => {
    try {
      const result = await listBackups();
      res.json(result);
    } catch (error) {
      console.error("Error listing backups:", error);
      res.status(500).json({ 
        success: false, 
        message: "An error occurred while listing backups"
      });
    }
  });
  
  // Create a new backup
  app.post("/api/system/backups", isAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      const result = await createBackup(name);
      res.json(result);
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ 
        success: false, 
        message: "An error occurred while creating backup"
      });
    }
  });
  
  // Restore from backup
  app.post("/api/system/backups/restore", isAdmin, async (req, res) => {
    try {
      const { filename, confirm } = req.body;
      
      if (!filename) {
        return res.status(400).json({ 
          success: false, 
          message: "Backup filename is required" 
        });
      }
      
      // Require confirmation for restore operation
      if (confirm !== 'yes-restore-data') {
        return res.status(400).json({ 
          success: false, 
          message: "Please confirm restore by setting 'confirm' to 'yes-restore-data'" 
        });
      }
      
      // Only allow admins to restore
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: "Only administrators can restore system data" 
        });
      }
      
      // First create a backup of current state
      await createBackup('pre-restore-backup');
      
      // Perform the restore
      const result = await restoreFromBackup(filename);
      res.json(result);
    } catch (error) {
      console.error("Error restoring from backup:", error);
      res.status(500).json({ 
        success: false, 
        message: "An error occurred while restoring from backup"
      });
    }
  });
  
  // Delete a backup
  app.delete("/api/system/backups/:filename", isAdmin, async (req, res) => {
    try {
      const { filename } = req.params;
      
      // Reject deletion of pre-restore backups for safety
      if (filename.startsWith('pre-restore-backup')) {
        return res.status(400).json({ 
          success: false, 
          message: "Cannot delete pre-restore safety backups" 
        });
      }
      
      const result = await deleteBackup(filename);
      res.json(result);
    } catch (error) {
      console.error("Error deleting backup:", error);
      res.status(500).json({ 
        success: false, 
        message: "An error occurred while deleting backup"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
