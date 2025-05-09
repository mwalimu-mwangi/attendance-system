import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Calendar, 
  History, 
  Users, 
  Building, 
  School, 
  Laptop, 
  Clock, 
  CheckSquare, 
  Settings 
} from "lucide-react";

interface SidebarProps {
  userRole: "student" | "teacher" | "admin";
}

export function Sidebar({ userRole }: SidebarProps) {
  const [location] = useLocation();

  const studentNav = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/student/lessons", label: "My Lessons", icon: Calendar },
    { href: "/student/attendance-history", label: "Attendance History", icon: History },
  ];

  const teacherNav = [
    { href: "/teacher", label: "Dashboard", icon: Home },
    { href: "/teacher/classes", label: "Classes", icon: Laptop },
    { href: "/teacher/lessons", label: "Lessons", icon: Clock },
    { href: "/teacher/attendance-records", label: "Attendance Records", icon: CheckSquare },
  ];

  const adminNav = [
    { href: "/admin", label: "Dashboard", icon: Home },
    { href: "/admin/teachers", label: "Teachers", icon: Users },
    { href: "/admin/departments", label: "Departments", icon: Building },
    { href: "/admin/levels", label: "Levels", icon: School },
    { href: "/admin/classes", label: "Classes", icon: Laptop },
    { href: "/admin/lessons", label: "Lessons", icon: Clock },
    { href: "/admin/attendance-records", label: "Attendance Records", icon: CheckSquare },
    { href: "/admin/system-settings", label: "System Settings", icon: Settings },
  ];

  const navigationItems = 
    userRole === "admin" ? adminNav : 
    userRole === "teacher" ? teacherNav : 
    studentNav;

  return (
    <aside className="hidden md:block bg-white w-64 min-h-screen shadow-sm">
      <nav className="mt-5 px-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
            >
              <a 
                className={cn(
                  "group flex items-center px-2 py-2 text-base font-medium rounded-md my-1",
                  isActive 
                    ? "text-primary bg-primary-light bg-opacity-10 border-l-4 border-primary" 
                    : "text-neutral-400 hover:bg-neutral-100"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon 
                  className={cn(
                    "mr-3 h-5 w-5",
                    isActive ? "text-primary" : "text-neutral-300 group-hover:text-primary"
                  )} 
                />
                {item.label}
              </a>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
