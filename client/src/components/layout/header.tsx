import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { User } from "lucide-react";

export function Header() {
  const { user, logoutMutation } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4">
        <h1 className="text-xl font-semibold text-neutral-500">Student Attendance System</h1>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:block">
            <span className="text-sm text-neutral-300 mr-2">
              {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
            </span>
            <span className="text-sm font-medium text-neutral-500">
              {user?.fullName}
            </span>
          </div>
          <div className="relative">
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-200 text-neutral-500 focus:outline-none">
                <User className="h-4 w-4" />
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
