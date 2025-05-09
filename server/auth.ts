import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, loginSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Check if stored password is in expected format (has salt)
  if (!stored || !stored.includes(".")) {
    // Handle passwords that might be stored in plain text during development/testing
    return supplied === stored;
  }
  
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "student-attendance-system-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        // If user not found, return false
        if (!user) {
          console.log(`Login attempt: User '${username}' not found`);
          return done(null, false);
        }
        
        // Check if password is present
        if (!user.password) {
          console.log(`Login attempt: User '${username}' has no password`);
          return done(null, false);
        }
        
        // Compare passwords
        const isMatch = await comparePasswords(password, user.password);
        if (!isMatch) {
          console.log(`Login attempt: Invalid password for user '${username}'`);
          return done(null, false);
        }
        
        // Success
        console.log(`Login successful: ${username} (${user.role})`);
        return done(null, user);
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration attempt received:", req.body.username);
      
      // Check if input contains required fields
      if (!req.body.username || !req.body.password) {
        return res.status(400).json({ 
          message: "Missing required fields",
          errors: {
            username: !req.body.username ? "Username is required" : undefined,
            password: !req.body.password ? "Password is required" : undefined
          }
        });
      }
      
      // Trim whitespace from string fields
      if (typeof req.body.username === 'string') req.body.username = req.body.username.trim();
      if (typeof req.body.fullName === 'string') req.body.fullName = req.body.fullName.trim();
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log(`Registration failed: Username '${req.body.username}' already exists`);
        return res.status(400).json({ 
          message: "Registration failed", 
          errors: { username: "Username already exists" }
        });
      }

      // Validate user data based on role
      const { role = "student", password, confirmPassword, ...userData } = req.body;
      
      // Additional validation for student accounts
      if (role === "student") {
        // Ensure departmentId, levelId, and classId are provided for students
        if (!userData.departmentId || !userData.levelId || !userData.classId) {
          console.log(`Registration failed: Missing required fields for student account`);
          return res.status(400).json({ 
            message: "Student registration requires department, level, and class selection",
            errors: {
              departmentId: !userData.departmentId ? "Department is required" : undefined,
              levelId: !userData.levelId ? "Level is required" : undefined,
              classId: !userData.classId ? "Class is required" : undefined
            }
          });
        }
      }
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        role,
        password: await hashPassword(password),
      });

      console.log(`User registered successfully: ${user.username} (${user.role})`);
      
      // Login the user after registration
      req.login(user, (err: any) => {
        if (err) {
          console.error("Error logging in after registration:", err);
          return next(err);
        }
        
        // Remove password from response
        const { password, ...userResponse } = user;
        res.status(201).json(userResponse);
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        console.log("Registration validation error:", validationError.message);
        
        // Format the error message for better client-side handling
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const field = err.path[0].toString();
          formattedErrors[field] = err.message;
        });
        
        return res.status(400).json({ 
          message: "Validation error",
          errors: formattedErrors
        });
      }
      
      console.error("Unexpected registration error:", error);
      return res.status(500).json({ message: "An unexpected error occurred during registration" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    try {
      console.log("Login attempt received for:", req.body.username);
      
      // Validate login data
      const validatedData = loginSchema.parse(req.body);
      
      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) {
          console.error("Authentication error:", err);
          return res.status(500).json({ message: "Internal server error during login" });
        }
        
        if (!user) {
          console.log("Authentication failed for:", req.body.username);
          return res.status(401).json({ message: "Invalid username or password" });
        }
        
        req.login(user, (loginErr: any) => {
          if (loginErr) {
            console.error("Session error:", loginErr);
            return res.status(500).json({ message: "Failed to create session" });
          }
          
          // Log successful login
          console.log(`User logged in: ${user.username} (${user.role})`);
          
          // Remove password from response
          const { password, ...userResponse } = user;
          res.status(200).json(userResponse);
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        console.log("Validation error:", validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Unexpected login error:", error);
      return res.status(500).json({ message: "An unexpected error occurred" });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Remove password from response
    const { password, ...userResponse } = req.user;
    res.json(userResponse);
  });
}

// Middleware to check if user has admin role
export function isAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden. Admin role required." });
  }
  
  next();
}

// Middleware to check if user has teacher role
export function isTeacher(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.user.role !== "teacher" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden. Teacher role required." });
  }
  
  next();
}

// Middleware to check if user has student role
export function isStudent(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Forbidden. Student role required." });
  }
  
  next();
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  next();
}
