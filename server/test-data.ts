import { hashPassword } from "./auth";
import { 
  InsertUser, 
  InsertDepartment, 
  InsertLevel, 
  InsertClass, 
  InsertLesson 
} from "@shared/schema";
import { storage } from "./storage";

/**
 * This function adds test data to the system
 */
export async function addTestData() {
  try {
    console.log("Starting to add test data...");

    // Check if we already have data
    const existingUsers = await storage.getAllUsers();
    if (existingUsers.length > 5) {
      console.log("Test data appears to already exist, skipping seeding...");
      return;
    }

    // Add departments
    console.log("Adding departments...");
    const departments = [
      { name: "Computer Science" },
      { name: "Business Administration" },
      { name: "Engineering" }
    ];

    const departmentEntities = [];
    for (const dept of departments) {
      try {
        // Check if department already exists
        const existingDepts = await storage.getAllDepartments();
        const existingDept = existingDepts.find(d => d.name === dept.name);
        
        if (existingDept) {
          console.log(`Department ${dept.name} already exists, skipping...`);
          departmentEntities.push(existingDept);
          continue;
        }
        
        const deptData: InsertDepartment = {
          name: dept.name
        };
        const entity = await storage.createDepartment(deptData);
        departmentEntities.push(entity);
      } catch (error) {
        console.error(`Error creating department ${dept.name}:`, error);
      }
    }

    // Add levels
    console.log("Adding levels...");
    const levels = [
      { number: 1, name: "First Year" },
      { number: 2, name: "Second Year" },
      { number: 3, name: "Third Year" },
      { number: 4, name: "Fourth Year" }
    ];

    const levelEntities = [];
    for (const level of levels) {
      try {
        // Check if level already exists
        const existingLevels = await storage.getAllLevels();
        const existingLevel = existingLevels.find(l => l.number === level.number);
        
        if (existingLevel) {
          console.log(`Level ${level.name} already exists, skipping...`);
          levelEntities.push(existingLevel);
          continue;
        }
        
        const levelData: InsertLevel = {
          number: level.number,
          name: level.name
        };
        const entity = await storage.createLevel(levelData);
        levelEntities.push(entity);
      } catch (error) {
        console.error(`Error creating level ${level.name}:`, error);
      }
    }

    // Add classes
    console.log("Adding classes...");
    const classes = [
      { name: "CS101", departmentId: departmentEntities[0].id, levelId: levelEntities[0].id },
      { name: "CS202", departmentId: departmentEntities[0].id, levelId: levelEntities[1].id },
      { name: "BUS101", departmentId: departmentEntities[1].id, levelId: levelEntities[0].id },
      { name: "ENG303", departmentId: departmentEntities[2].id, levelId: levelEntities[2].id }
    ];

    const classEntities = [];
    for (const cls of classes) {
      try {
        // Check if class already exists
        const existingClasses = await storage.getAllClasses();
        const existingClass = existingClasses.find(c => 
          c.name === cls.name && 
          c.departmentId === cls.departmentId && 
          c.levelId === cls.levelId
        );
        
        if (existingClass) {
          console.log(`Class ${cls.name} already exists, skipping...`);
          classEntities.push(existingClass);
          continue;
        }
        
        const classData: InsertClass = {
          name: cls.name,
          departmentId: cls.departmentId,
          levelId: cls.levelId
        };
        const entity = await storage.createClass(classData);
        classEntities.push(entity);
      } catch (error) {
        console.error(`Error creating class ${cls.name}:`, error);
      }
    }

    // Add teachers
    console.log("Adding teachers...");
    const teachers = [
      { username: "mwalimu", fullName: "Prof. Mwalimu", password: "Teacher123", departmentId: departmentEntities[0].id },
      { username: "teacher2", fullName: "Dr. Johnson", password: "Teacher123", departmentId: departmentEntities[1].id }
    ];

    const teacherEntities = [];
    for (const teacher of teachers) {
      const teacherData: InsertUser = {
        username: teacher.username,
        fullName: teacher.fullName,
        password: await hashPassword(teacher.password),
        role: "teacher",
        departmentId: teacher.departmentId,
        levelId: null,
        classId: null
      };
      
      try {
        // Skip if the teacher already exists
        const existing = await storage.getUserByUsername(teacher.username);
        if (existing) {
          teacherEntities.push(existing);
          continue;
        }
        
        const entity = await storage.createUser(teacherData);
        teacherEntities.push(entity);
      } catch (error) {
        console.error(`Error creating teacher ${teacher.username}:`, error);
      }
    }

    // Add students
    console.log("Adding students...");
    const students = [
      { username: "student1", fullName: "Alice Johnson", password: "Student123", classId: classEntities[0].id },
      { username: "student2", fullName: "Bob Smith", password: "Student123", classId: classEntities[0].id },
      { username: "student3", fullName: "Carol Davis", password: "Student123", classId: classEntities[0].id },
      { username: "student4", fullName: "Dave Wilson", password: "Student123", classId: classEntities[0].id },
      { username: "student5", fullName: "Eve Brown", password: "Student123", classId: classEntities[1].id },
      { username: "student6", fullName: "Frank Miller", password: "Student123", classId: classEntities[1].id },
      { username: "student7", fullName: "Grace Lee", password: "Student123", classId: classEntities[2].id },
      { username: "student8", fullName: "Henry Wang", password: "Student123", classId: classEntities[2].id }
    ];

    const studentEntities = [];
    for (const student of students) {
      try {
        // Skip if the student already exists
        const existing = await storage.getUserByUsername(student.username);
        if (existing) {
          studentEntities.push(existing);
          continue;
        }

        const classInfo = await storage.getClass(student.classId);
        
        if (!classInfo) {
          console.error(`Class with ID ${student.classId} not found for student ${student.username}`);
          continue;
        }
        
        const studentData: InsertUser = {
          username: student.username,
          fullName: student.fullName,
          password: await hashPassword(student.password),
          role: "student",
          departmentId: classInfo.departmentId,
          levelId: classInfo.levelId,
          classId: student.classId
        };
        
        const entity = await storage.createUser(studentData);
        studentEntities.push(entity);
      } catch (error) {
        console.error(`Error creating student ${student.username}:`, error);
      }
    }

    // Add lessons for Prof. Mwalimu (CS101 class)
    console.log("Adding lessons...");
    const currentDay = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
    
    const lessons = [
      { subject: "Programming Fundamentals", classId: classEntities[0].id, teacherId: teacherEntities[0].id, dayOfWeek: currentDay, startTimeMinutes: 9 * 60, durationMinutes: 60, location: "Room 101", attendanceWindowMinutes: 15 },
      { subject: "Data Structures", classId: classEntities[0].id, teacherId: teacherEntities[0].id, dayOfWeek: (currentDay + 1) % 7, startTimeMinutes: 11 * 60, durationMinutes: 90, location: "Room 102", attendanceWindowMinutes: 20 },
      { subject: "Database Systems", classId: classEntities[0].id, teacherId: teacherEntities[0].id, dayOfWeek: (currentDay + 2) % 7, startTimeMinutes: 14 * 60, durationMinutes: 120, location: "Lab 3", attendanceWindowMinutes: 30 },
      { subject: "Business Ethics", classId: classEntities[2].id, teacherId: teacherEntities[1].id, dayOfWeek: currentDay, startTimeMinutes: 10 * 60, durationMinutes: 60, location: "Hall B", attendanceWindowMinutes: 15 }
    ];

    for (const lesson of lessons) {
      try {
        // Check if a similar lesson already exists
        const existingLessons = await storage.getAllLessons();
        const existingLesson = existingLessons.find(l => 
          l.subject === lesson.subject && 
          l.classId === lesson.classId && 
          l.teacherId === lesson.teacherId &&
          l.dayOfWeek === lesson.dayOfWeek
        );
        
        if (existingLesson) {
          console.log(`Lesson "${lesson.subject}" already exists, skipping...`);
          continue;
        }
        
        const lessonData: InsertLesson = {
          subject: lesson.subject,
          classId: lesson.classId,
          teacherId: lesson.teacherId,
          dayOfWeek: lesson.dayOfWeek,
          startTimeMinutes: lesson.startTimeMinutes,
          durationMinutes: lesson.durationMinutes,
          location: lesson.location,
          attendanceWindowMinutes: lesson.attendanceWindowMinutes,
          isActive: true,
          lessonCount: 0
        };
        
        await storage.createLesson(lessonData);
      } catch (error) {
        console.error(`Error creating lesson "${lesson.subject}":`, error);
      }
    }

    console.log("Test data added successfully");
  } catch (error) {
    console.error("Error adding test data:", error);
  }
}