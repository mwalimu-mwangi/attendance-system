import { db } from "./db";
import { 
  attendance, 
  lessons, 
  teacherDepartments, 
  users, 
  classes, 
  departments, 
  levels, 
  systemSettings
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { hashPassword } from "./auth";

// Define backup data structure
interface BackupData {
  users: any[];
  departments: any[];
  levels: any[];
  classes: any[];
  lessons: any[];
  attendance: any[];
  teacherDepartments: any[];
  systemSettings: any[];
  timestamp: string;
  version: string;
}

// Define backup directory
const BACKUP_DIR = path.join(process.cwd(), 'backups');

/**
 * Create a backup of all system data
 */
export async function createBackup(backupName?: string) {
  try {
    console.log("Starting database backup process...");
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // Fetch all data from the database
    const usersData = await db.select().from(users);
    const departmentsData = await db.select().from(departments);
    const levelsData = await db.select().from(levels);
    const classesData = await db.select().from(classes);
    const lessonsData = await db.select().from(lessons);
    const attendanceData = await db.select().from(attendance);
    const teacherDepartmentsData = await db.select().from(teacherDepartments);
    const systemSettingsData = await db.select().from(systemSettings);
    
    // Create backup object
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupData: BackupData = {
      users: usersData,
      departments: departmentsData,
      levels: levelsData,
      classes: classesData,
      lessons: lessonsData,
      attendance: attendanceData,
      teacherDepartments: teacherDepartmentsData,
      systemSettings: systemSettingsData,
      timestamp,
      version: '1.0.0'
    };
    
    // Generate backup filename
    const backupFilename = backupName 
      ? `${backupName.replace(/[^a-z0-9-_]/gi, '_')}-${timestamp}.json`
      : `backup-${timestamp}.json`;
    
    const backupPath = path.join(BACKUP_DIR, backupFilename);
    
    // Write backup to file
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    console.log(`Backup created successfully: ${backupFilename}`);
    
    return { 
      success: true, 
      message: `Backup created successfully: ${backupFilename}`,
      backupFile: backupFilename
    };
  } catch (error) {
    console.error("Error creating backup:", error);
    return { 
      success: false, 
      message: `Error creating backup: ${error}`
    };
  }
}

/**
 * Restore system from a backup file
 */
export async function restoreFromBackup(backupFile: string) {
  try {
    console.log(`Starting database restore process from backup: ${backupFile}`);
    
    // Check if backup file exists
    const backupPath = path.join(BACKUP_DIR, backupFile);
    if (!fs.existsSync(backupPath)) {
      return {
        success: false,
        message: `Backup file not found: ${backupFile}`
      };
    }
    
    // Read backup file
    const backupData: BackupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    // Validate backup data
    if (!backupData.version || !backupData.timestamp) {
      return {
        success: false,
        message: 'Invalid backup file format'
      };
    }
    
    // Start transaction for atomic restore
    await db.transaction(async (tx) => {
      // Clear existing data
      console.log('Clearing existing data...');
      await tx.delete(attendance);
      await tx.delete(lessons);
      await tx.delete(teacherDepartments);
      await tx.delete(users).where(ne(users.role, "admin")); // Preserve admin
      await tx.delete(classes);
      await tx.delete(departments);
      await tx.delete(levels);
      
      // Only update system settings, don't replace
      if (backupData.systemSettings.length > 0) {
        const settingsData = backupData.systemSettings[0];
        await tx.update(systemSettings)
          .set({
            defaultAttendanceWindow: settingsData.defaultAttendanceWindow,
            allowTeacherOverride: settingsData.allowTeacherOverride,
            autoDisableAttendance: settingsData.autoDisableAttendance,
            schoolName: settingsData.schoolName,
            schoolLogo: settingsData.schoolLogo,
            letterhead: settingsData.letterhead
          })
          .where(eq(systemSettings.id, 1));
      }
      
      // Restore data - preserving ID references
      console.log('Restoring departments...');
      for (const dept of backupData.departments) {
        await tx.insert(departments).values(dept).onConflictDoUpdate({
          target: departments.id,
          set: {
            name: dept.name,
            createdAt: dept.createdAt
          }
        });
      }
      
      console.log('Restoring levels...');
      for (const level of backupData.levels) {
        await tx.insert(levels).values(level).onConflictDoUpdate({
          target: levels.id,
          set: {
            name: level.name,
            number: level.number,
            createdAt: level.createdAt
          }
        });
      }
      
      console.log('Restoring classes...');
      for (const cls of backupData.classes) {
        await tx.insert(classes).values(cls).onConflictDoUpdate({
          target: classes.id,
          set: {
            name: cls.name,
            departmentId: cls.departmentId,
            levelId: cls.levelId,
            createdAt: cls.createdAt
          }
        });
      }
      
      console.log('Restoring users...');
      for (const user of backupData.users) {
        // Skip admin users as we're preserving existing ones
        if (user.role !== 'admin') {
          await tx.insert(users).values(user).onConflictDoUpdate({
            target: users.id,
            set: {
              username: user.username,
              fullName: user.fullName,
              role: user.role,
              password: user.password,
              departmentId: user.departmentId,
              levelId: user.levelId,
              classId: user.classId,
              createdAt: user.createdAt
            }
          });
        }
      }
      
      console.log('Restoring teacher-department relationships...');
      for (const relation of backupData.teacherDepartments) {
        await tx.insert(teacherDepartments).values(relation).onConflictDoNothing();
      }
      
      console.log('Restoring lessons...');
      for (const lesson of backupData.lessons) {
        await tx.insert(lessons).values(lesson).onConflictDoUpdate({
          target: lessons.id,
          set: {
            subject: lesson.subject,
            classId: lesson.classId,
            teacherId: lesson.teacherId,
            dayOfWeek: lesson.dayOfWeek,
            startTimeMinutes: lesson.startTimeMinutes,
            durationMinutes: lesson.durationMinutes,
            createdAt: lesson.createdAt
          }
        });
      }
      
      console.log('Restoring attendance records...');
      for (const record of backupData.attendance) {
        await tx.insert(attendance).values(record).onConflictDoUpdate({
          target: attendance.id,
          set: {
            lessonId: record.lessonId,
            studentId: record.studentId,
            status: record.status,
            markedAt: record.markedAt,
            markedBy: record.markedBy,
            createdAt: record.createdAt
          }
        });
      }
    });
    
    console.log('Database restore completed successfully.');
    
    return { 
      success: true, 
      message: `System successfully restored from backup: ${backupFile}`
    };
  } catch (error) {
    console.error("Error restoring from backup:", error);
    return { 
      success: false, 
      message: `Error restoring from backup: ${error}`
    };
  }
}

/**
 * Get a list of all available backups
 */
export async function listBackups() {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      return { success: true, backups: [] };
    }
    
    // Read backup directory
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        
        return {
          filename: file,
          size: stats.size,
          created: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()); // Sort newest first
    
    return { 
      success: true, 
      backups: files
    };
  } catch (error) {
    console.error("Error listing backups:", error);
    return { 
      success: false, 
      message: `Error listing backups: ${error}`,
      backups: []
    };
  }
}

/**
 * Delete a backup file
 */
export async function deleteBackup(backupFile: string) {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFile);
    
    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      return {
        success: false,
        message: `Backup file not found: ${backupFile}`
      };
    }
    
    // Delete the file
    fs.unlinkSync(backupPath);
    
    return { 
      success: true, 
      message: `Backup deleted successfully: ${backupFile}`
    };
  } catch (error) {
    console.error("Error deleting backup:", error);
    return { 
      success: false, 
      message: `Error deleting backup: ${error}`
    };
  }
}

// Fix import issue
import { ne } from "drizzle-orm";