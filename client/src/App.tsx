import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile-page";
import { ProtectedRoute } from "./lib/protected-route";

// Student pages
import StudentDashboard from "@/pages/student/dashboard";
import StudentLessons from "@/pages/student/lessons";
import StudentAttendanceHistory from "@/pages/student/attendance-history";

// Teacher pages
import TeacherDashboard from "@/pages/teacher/dashboard";
import TeacherClasses from "@/pages/teacher/classes";
import TeacherLessons from "@/pages/teacher/lessons";
import TeacherAttendanceRecords from "@/pages/teacher/attendance-records";
import CreateLesson from "@/pages/teacher/create-lesson";
import BulkAttendance from "@/pages/teacher/bulk-attendance";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminTeachers from "@/pages/admin/teachers";
import AdminDepartments from "@/pages/admin/departments";
import AdminLevels from "@/pages/admin/levels";
import AdminClasses from "@/pages/admin/classes";
import AdminLessons from "@/pages/admin/lessons";
import AdminAttendanceRecords from "@/pages/admin/attendance-records";
import AdminSystemSettings from "@/pages/admin/system-settings";
import AdminStudents from "@/pages/admin/students";
import StudentReport from "@/pages/admin/student-report";

function Router() {
  return (
    <Switch>
      {/* Make auth page the landing page and also accessible at /auth */}
      <Route path="/" component={AuthPage} />
      <Route path="/auth" component={AuthPage} />

      {/* Student routes */}
      <ProtectedRoute path="/student" component={StudentDashboard} allowedRoles={["student", "admin", "teacher"]} />
      <ProtectedRoute path="/student/lessons" component={StudentLessons} allowedRoles={["student"]} />
      <ProtectedRoute path="/student/attendance-history" component={StudentAttendanceHistory} allowedRoles={["student"]} />

      {/* Teacher routes */}
      <ProtectedRoute path="/teacher" component={TeacherDashboard} allowedRoles={["teacher", "admin"]} />
      <ProtectedRoute path="/teacher/classes" component={TeacherClasses} allowedRoles={["teacher", "admin"]} />
      <ProtectedRoute path="/teacher/lessons" component={TeacherLessons} allowedRoles={["teacher", "admin"]} />
      <ProtectedRoute path="/teacher/create-lesson" component={CreateLesson} allowedRoles={["teacher", "admin"]} />
      <ProtectedRoute path="/teacher/attendance-records" component={TeacherAttendanceRecords} allowedRoles={["teacher", "admin"]} />
      <ProtectedRoute path="/teacher/bulk-attendance" component={BulkAttendance} allowedRoles={["teacher", "admin"]} />

      {/* Admin routes */}
      <ProtectedRoute path="/admin" component={AdminDashboard} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/teachers" component={AdminTeachers} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/departments" component={AdminDepartments} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/levels" component={AdminLevels} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/classes" component={AdminClasses} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/lessons" component={AdminLessons} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/attendance-records" component={AdminAttendanceRecords} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/system-settings" component={AdminSystemSettings} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/students" component={AdminStudents} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/students/:id/report" component={StudentReport} allowedRoles={["admin"]} />
      
      {/* Profile page - accessible to all authenticated users */}
      <ProtectedRoute path="/profile" component={ProfilePage} allowedRoles={["admin", "teacher", "student"]} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
