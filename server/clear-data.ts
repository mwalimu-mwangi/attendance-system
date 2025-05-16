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
import { eq, ne } from "drizzle-orm";
import { storage } from "./storage";
import { hashPassword } from "./auth";

/**
 * This script clears all application data except for:
 * 1. The admin user (preserves login capability)
 * 2. System settings (preserves configuration)
 * 
 * After clearing data, it resets the system to a clean state
 */
export async function clearAllData() {
  try {
    console.log("Starting database clearing process...");
    
    // Clear data in the correct order to respect foreign key constraints
    console.log("Clearing attendance records...");
    await db.delete(attendance);
    
    console.log("Clearing lessons...");
    await db.delete(lessons);
    
    console.log("Clearing teacher-department relationships...");
    await db.delete(teacherDepartments);
    
    console.log("Clearing students and teachers (preserving admin)...");
    await db.delete(users).where(ne(users.role, "admin"));
    
    console.log("Clearing classes...");
    await db.delete(classes);
    
    console.log("Clearing departments...");
    await db.delete(departments);
    
    console.log("Clearing levels...");
    await db.delete(levels);
    
    console.log("Resetting admin password to default...");
    // Reset admin password to 'admin'
    const hashedPassword = await hashPassword("admin");
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.role, "admin"));
    
    console.log("Database clearing completed successfully.");
    
    return { success: true, message: "All data cleared successfully. Admin password reset to 'admin'." };
  } catch (error) {
    console.error("Error clearing database:", error);
    return { success: false, message: `Error clearing database: ${error}` };
  }
}