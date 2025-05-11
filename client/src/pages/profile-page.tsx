import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  User,
  Key,
  Save,
  ArrowLeft,
  Clock,
  Calendar,
  BookOpen,
  Shield,
  School,
  UserCircle,
} from "lucide-react";
import { format } from "date-fns";

// Form schema for profile update
const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // If either currentPassword or newPassword is provided, require all password fields
  if (data.currentPassword || data.newPassword) {
    if (!data.currentPassword) return false;
    if (!data.newPassword) return false;
    if (!data.confirmPassword) return false;
  }
  return true;
}, {
  message: "All password fields must be filled to change password",
  path: ["confirmPassword"],
}).refine((data) => {
  // Make sure new password and confirm password match
  if (data.newPassword && data.confirmPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Fetch user details
  const { data: userData, isLoading } = useQuery<any>({
    queryKey: ["/api/user"],
    enabled: !!user,
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: userData?.fullName || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update form values when user data is loaded
  useState(() => {
    if (userData) {
      form.reset({
        fullName: userData.fullName || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      // Only include password fields if we're changing password
      const payload: any = {
        fullName: data.fullName,
      };
      
      if (data.currentPassword && data.newPassword) {
        payload.currentPassword = data.currentPassword;
        payload.newPassword = data.newPassword;
      }

      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsEditingProfile(false);
      form.reset({
        fullName: userData?.fullName || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">My Profile</h1>
            <p className="text-muted-foreground">
              View and update your account information
            </p>
          </div>
          
          {!isEditingProfile ? (
            <Button onClick={() => setIsEditingProfile(true)}>
              Edit Profile
            </Button>
          ) : (
            <Button variant="outline" onClick={() => {
              setIsEditingProfile(false);
              form.reset({
                fullName: userData.fullName,
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
            }}>
              Cancel
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Profile Information Card */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCircle className="h-5 w-5 mr-2" />
                {isEditingProfile ? "Edit Profile" : "Profile Information"}
              </CardTitle>
              <CardDescription>
                Your personal information and account settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditingProfile ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Change Password</h3>
                      <FormField
                        control={form.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your current password" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter new password" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Password must be at least 8 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Confirm new password" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="mt-6" 
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Full Name</h3>
                      <p className="text-lg">{userData?.fullName || "N/A"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Username</h3>
                      <p className="text-lg">{userData?.username || "N/A"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Role</h3>
                      <p className="text-lg capitalize">{userData?.role || "N/A"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Account Created</h3>
                      <p className="text-lg">
                        {userData?.createdAt ? format(new Date(userData.createdAt), "MMMM d, yyyy") : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Info Card */}
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 text-muted-foreground mr-2" />
                    <span className="capitalize">{userData?.role || "N/A"}</span>
                  </div>
                  
                  {userData?.classId && (
                    <div className="flex items-center">
                      <School className="h-4 w-4 text-muted-foreground mr-2" />
                      <span>Class ID: {userData.classId}</span>
                    </div>
                  )}
                  
                  {userData?.createdAt && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                      <span>Joined {format(new Date(userData.createdAt), "MMM yyyy")}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Security</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                  onClick={() => setIsEditingProfile(true)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}