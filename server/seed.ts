import { db } from "./db";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { users, departments, levels, classes, lessons } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isPast, isFuture, isToday, addDays } from "date-fns";

// This function seeds initial data for the application
export async function seedDatabase() {
  console.log("Starting database seeding...");

  // Seed system settings
  await storage.initializeSystemSettings();
  console.log("System settings initialized.");

  try {
    // Check if admin user exists
    const adminUser = await storage.getUserByUsername("admin");
    if (!adminUser) {
      await storage.createUser({
        username: "admin",
        password: await hashPassword("admin123"),
        fullName: "System Administrator",
        role: "admin",
      });
      console.log("Admin user created.");
    }

    // Create default departments
    const defaultDepartments = [
      { name: "Computer Science" },
      { name: "Business Administration" },
      { name: "Engineering" }
    ];

    for (const dept of defaultDepartments) {
      const existingDept = await db
        .select()
        .from(departments)
        .where(eq(departments.name, dept.name))
        .then(results => results[0]);

      if (!existingDept) {
        await storage.createDepartment(dept);
        console.log(`Department created: ${dept.name}`);
      }
    }

    // Create default levels
    const defaultLevels = [
      { number: 3, name: "Entry" },
      { number: 4, name: "Artisan" },
      { number: 5, name: "Craft/Certificate" },
      { number: 6, name: "Diploma" }
    ];

    for (const level of defaultLevels) {
      const existingLevel = await db
        .select()
        .from(levels)
        .where(eq(levels.number, level.number))
        .then(results => results[0]);
      
      if (!existingLevel) {
        await storage.createLevel(level);
        console.log(`Level created: ${level.name}`);
      }
    }

    // Create a teacher user
    const teacherUser = await storage.getUserByUsername("teacher");
    if (!teacherUser) {
      await storage.createUser({
        username: "teacher",
        password: await hashPassword("teacher123"),
        fullName: "John Smith",
        role: "teacher",
      });
      console.log("Teacher user created.");
    }

    // Create a default class
    const compSciDept = await db
      .select()
      .from(departments)
      .where(eq(departments.name, "Computer Science"))
      .then(results => results[0]);
    
    const entryLevel = await db
      .select()
      .from(levels)
      .where(eq(levels.number, 3))
      .then(results => results[0]);
    
    if (compSciDept && entryLevel) {
      const existingClass = await db
        .select()
        .from(classes)
        .where(eq(classes.name, "CS-101"))
        .then(results => results[0]);
      
      let csClass;
      if (!existingClass) {
        csClass = await storage.createClass({
          name: "CS-101",
          departmentId: compSciDept.id,
          levelId: entryLevel.id,
          academicYear: "2025"
        });
        console.log("CS-101 class created.");
      } else {
        csClass = existingClass;
      }

      // Create a student user
      const studentUser = await storage.getUserByUsername("student");
      if (!studentUser && csClass) {
        await storage.createUser({
          username: "student",
          password: await hashPassword("student123"),
          fullName: "Jane Doe",
          role: "student",
          departmentId: csClass.departmentId,
          levelId: csClass.levelId,
          classId: csClass.id,
        });
        console.log("Student user created.");
      }

      // Create demo lessons
      const teacher = await storage.getUserByUsername("teacher");
      
      if (teacher && csClass) {
        // Add today's lessons
        const today = new Date();
        
        // Morning class today
        const morningLesson = await db
          .select()
          .from(lessons)
          .where(eq(lessons.subject, "Introduction to Programming"))
          .then(results => results[0]);

        if (!morningLesson) {
          const startTime = new Date(today);
          startTime.setHours(9, 0, 0, 0);
          const endTime = new Date(today);
          endTime.setHours(11, 0, 0, 0);
          
          await storage.createLesson({
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
          console.log("Morning lesson created.");
        }
        
        // Afternoon class today
        const afternoonLesson = await db
          .select()
          .from(lessons)
          .where(eq(lessons.subject, "Data Structures"))
          .then(results => results[0]);
        
        if (!afternoonLesson) {
          const startTime = new Date(today);
          startTime.setHours(14, 0, 0, 0);
          const endTime = new Date(today);
          endTime.setHours(16, 0, 0, 0);
          
          await storage.createLesson({
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
          console.log("Afternoon lesson created.");
        }

        // Create a lesson for tomorrow
        const tomorrow = addDays(today, 1);
        const tomorrowLesson = await db
          .select()
          .from(lessons)
          .where(eq(lessons.subject, "Web Development"))
          .then(results => results[0]);
        
        if (!tomorrowLesson) {
          const startTime = new Date(tomorrow);
          startTime.setHours(10, 0, 0, 0);
          const endTime = new Date(tomorrow);
          endTime.setHours(13, 0, 0, 0);
          
          await storage.createLesson({
            classId: csClass.id,
            subject: "Web Development",
            teacherId: teacher.id,
            startTime,
            endTime,
            location: "Room 201",
            isDoubleSession: true,
            attendanceWindowMinutes: 30,
            isActive: true
          });
          console.log("Tomorrow's lesson created.");
        }
      }
    }

    console.log("Seeding database completed successfully.");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}