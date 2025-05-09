import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ChevronFirst, 
  ChevronLast, 
  LayoutDashboard, 
  LogOut, 
  Menu,
  CalendarDays,
  Users,
  BookOpen,
  ClipboardCheck,
  Building2,
  GraduationCap,
  School,
  Settings
} from "lucide-react";

type SidebarItem = {
  icon: ReactNode;
  label: string;
  href: string;
  roles: string[];
};

const sidebarItems: SidebarItem[] = [
  // Dashboard item for different roles with different routes
  {
    icon: <LayoutDashboard size={20} />,
    label: "Dashboard",
    href: "/student",
    roles: ["student"],
  },
  {
    icon: <LayoutDashboard size={20} />,
    label: "Dashboard",
    href: "/teacher",
    roles: ["teacher"],
  },
  {
    icon: <LayoutDashboard size={20} />,
    label: "Dashboard",
    href: "/admin",
    roles: ["admin"],
  },
  
  // Student items
  {
    icon: <CalendarDays size={20} />,
    label: "My Lessons",
    href: "/student/lessons",
    roles: ["student"],
  },
  {
    icon: <ClipboardCheck size={20} />,
    label: "Attendance History",
    href: "/student/attendance-history",
    roles: ["student"],
  },

  // Teacher items
  {
    icon: <School size={20} />,
    label: "My Classes",
    href: "/teacher/classes",
    roles: ["teacher"],
  },
  {
    icon: <BookOpen size={20} />,
    label: "My Lessons",
    href: "/teacher/lessons",
    roles: ["teacher"],
  },
  {
    icon: <ClipboardCheck size={20} />,
    label: "Attendance Records",
    href: "/teacher/attendance-records",
    roles: ["teacher"],
  },
  {
    icon: <Users size={20} />,
    label: "Teachers",
    href: "/admin/teachers",
    roles: ["admin"],
  },
  {
    icon: <GraduationCap size={20} />,
    label: "Students",
    href: "/admin/students",
    roles: ["admin"],
  },
  {
    icon: <Building2 size={20} />,
    label: "Departments",
    href: "/admin/departments",
    roles: ["admin"],
  },
  {
    icon: <GraduationCap size={20} />,
    label: "Levels",
    href: "/admin/levels",
    roles: ["admin"],
  },
  {
    icon: <School size={20} />,
    label: "Classes",
    href: "/admin/classes",
    roles: ["admin"],
  },
  {
    icon: <BookOpen size={20} />,
    label: "Lessons",
    href: "/admin/lessons",
    roles: ["admin"],
  },
  {
    icon: <ClipboardCheck size={20} />,
    label: "Attendance Records",
    href: "/admin/attendance-records",
    roles: ["admin"],
  },
  {
    icon: <Settings size={20} />,
    label: "System Settings",
    href: "/admin/system-settings",
    roles: ["admin"],
  },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const [location] = useLocation();

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.fullName) return "U";
    return user.fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Filter sidebar items based on user role
  const filteredItems = sidebarItems.filter((item) => 
    user ? item.roles.includes(user.role) : false
  );

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      {/* Sidebar for desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen border-r border-neutral-200 bg-white transition-all",
          expanded ? "w-64" : "w-20"
        )}
      >
        {/* Sidebar header */}
        <div className={cn(
          "flex items-center justify-between h-16 px-4 border-b border-neutral-200",
          expanded ? "justify-between" : "justify-center"
        )}>
          {expanded && (
            <h1 className="text-lg font-semibold text-gray-800">
              Attendance System
            </h1>
          )}
          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg hover:bg-neutral-100"
          >
            {expanded ? <ChevronFirst size={20} /> : <ChevronLast size={20} />}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-2 px-2">
            {filteredItems.map((item) => (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                    location === item.href 
                      ? "bg-primary text-primary-foreground" 
                      : "text-neutral-600 hover:bg-neutral-100",
                    !expanded && "justify-center px-0"
                  )}
                >
                  <span className={expanded ? "mr-3" : ""}>{item.icon}</span>
                  {expanded && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User profile */}
        <div className={cn(
          "flex items-center p-4 border-t border-neutral-200",
          expanded ? "justify-between" : "justify-center"
        )}>
          <div className={cn("flex items-center", expanded ? "" : "hidden")}>
            <Avatar className="h-8 w-8 mr-3">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-neutral-800">{user.fullName}</p>
              <p className="text-xs text-neutral-500 capitalize">{user.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-neutral-500 hover:text-neutral-700"
            title="Logout"
          >
            <LogOut size={20} />
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 z-10">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mr-2"
          >
            <Menu size={24} />
          </Button>
          <h1 className="text-lg font-semibold">Attendance System</h1>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Mobile navigation overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-20"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile navigation drawer */}
      <aside
        className={cn(
          "md:hidden fixed left-0 top-0 bottom-0 w-64 bg-white z-30 transition-transform",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-200">
          <h1 className="text-lg font-semibold">Attendance System</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
          >
            <ChevronFirst size={20} />
          </Button>
        </div>
        
        <div className="flex flex-col justify-between h-[calc(100%-4rem)]">
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {filteredItems.map((item) => (
                <li key={item.href}>
                  <Link 
                    href={item.href}
                    className={cn(
                      "flex items-center py-2 px-3 rounded-lg text-sm font-medium",
                      location === item.href 
                        ? "bg-primary text-primary-foreground" 
                        : "text-neutral-600 hover:bg-neutral-100"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="mr-3">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="p-4 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user.fullName}</p>
                  <p className="text-xs text-neutral-500 capitalize">{user.role}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={cn(
        "flex-1 overflow-y-auto bg-neutral-50 pt-4 px-4 pb-8",
        isMobile ? "mt-16" : ""
      )}>
        <div className="container max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}