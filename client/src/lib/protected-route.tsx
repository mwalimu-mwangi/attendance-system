import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useLocation } from "wouter";

type ProtectedRouteProps = {
  path: string;
  component: () => React.JSX.Element;
  allowedRoles?: string[];
};

export function ProtectedRoute({
  path,
  component: Component,
  allowedRoles = [],
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    console.log("User not authenticated, redirecting to login page");
    // Use window.location.replace for more reliable redirection with no history
    window.location.replace("/");
    return null;
  }

  // If allowedRoles is empty, allow all authenticated users
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.log(`User role ${user.role} not allowed, redirecting`);
    
    // Redirect based on user role
    let redirectPath = "/student";
    
    if (user.role === "teacher") {
      redirectPath = "/teacher";
    } else if (user.role === "admin") {
      redirectPath = "/admin";
    }
    
    // Only redirect if we're not already on the redirect path
    if (location !== redirectPath) {
      console.log(`Redirecting to ${redirectPath}`);
      window.location.replace(redirectPath);
      return null;
    }
  }

  return <Route path={path} component={Component} />;
}
