import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BookOpen, UserPlus, Lock, GraduationCap, School } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  username: z.string().min(1, "Admission number is required"),
  departmentId: z.string().min(1, "Department is required"),
  levelId: z.string().min(1, "Level is required"),
  classId: z.string().min(1, "Class is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [location] = useLocation();
  // Student registration is the only option available
  const [activeTab, setActiveTab] = useState<string>("login");
  
  // Fetch departments, levels, and classes for registration form
  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["/api/departments"],
  });
  
  const { data: levels = [] } = useQuery<any[]>({
    queryKey: ["/api/levels"],
  });
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  
  const { data: classes = [], isLoading: classesLoading } = useQuery<any[]>({
    queryKey: ["/api/classes", selectedDepartment, selectedLevel],
    queryFn: async () => {
      if (!selectedDepartment || !selectedLevel) return [];
      const res = await fetch(`/api/classes?departmentId=${selectedDepartment}&levelId=${selectedLevel}`);
      if (!res.ok) throw new Error("Failed to fetch classes");
      return res.json();
    },
    enabled: !!selectedDepartment && !!selectedLevel,
  });

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      username: "",
      departmentId: "",
      levelId: "",
      classId: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Watch for changes in department and level
  useEffect(() => {
    const subscription = registerForm.watch((value, { name }) => {
      if (name === "departmentId") {
        setSelectedDepartment(value.departmentId || "");
        registerForm.setValue("classId", "");
      }
      if (name === "levelId") {
        setSelectedLevel(value.levelId || "");
        registerForm.setValue("classId", "");
      }
    });
    return () => subscription.unsubscribe();
  }, [registerForm]);

  // Handle login form submission
  function onLoginSubmit(data: LoginFormValues) {
    loginMutation.mutate({
      username: data.username,
      password: data.password
    });
  }

  // Handle register form submission
  function onRegisterSubmit(data: RegisterFormValues) {
    registerMutation.mutate({
      fullName: data.fullName,
      username: data.username,
      departmentId: parseInt(data.departmentId),
      levelId: parseInt(data.levelId),
      classId: parseInt(data.classId),
      password: data.password,
      role: "student"
    });
  }

  // If user is logged in, redirect to appropriate dashboard
  if (user) {
    console.log("User logged in:", user.role);
    
    if (user.role === "admin") {
      return <Redirect to="/admin" />;
    }
    
    if (user.role === "teacher") {
      return <Redirect to="/teacher" />;
    }
    
    return <Redirect to="/student" />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: Auth Form */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <GraduationCap className="h-12 w-12 mx-auto mb-2 text-primary" />
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Student Attendance System
            </h1>
            <p className="text-gray-500">
              {activeTab === "login" ? "Sign in to your account" : "Create your student account"}
            </p>
          </div>

          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <Lock className="mr-2 h-4 w-4" />
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <UserPlus className="mr-2 h-4 w-4" />
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="border-none shadow-none">
                <CardContent className="p-0">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your username" 
                                {...field} 
                                className="h-12"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your password" 
                                {...field} 
                                className="h-12"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-white transition-all"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Sign In
                      </Button>
                    </form>
                  </Form>

                  <div className="mt-6 text-center text-sm">
                    <p className="text-gray-500">
                      New student?{" "}
                      <button 
                        type="button"
                        className="text-primary font-medium hover:underline"
                        onClick={() => setActiveTab("register")}
                      >
                        Create an account
                      </button>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="border-none shadow-none">
                <CardContent className="p-0">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} className="h-10" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Admission Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your admission number" {...field} className="h-10" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="departmentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Department</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select Department" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {departments.map((dept: any) => (
                                    <SelectItem key={dept.id} value={dept.id.toString()}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="levelId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Level</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select Level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {levels.map((level: any) => (
                                    <SelectItem key={level.id} value={level.id.toString()}>
                                      {level.number} - {level.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={registerForm.control}
                        name="classId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Class</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={!selectedDepartment || !selectedLevel || classesLoading}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue 
                                    placeholder={
                                      !selectedDepartment || !selectedLevel 
                                        ? "Select Department & Level first" 
                                        : classesLoading 
                                          ? "Loading classes..." 
                                          : "Select Class"
                                    } 
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {classes.map((cls: any) => (
                                  <SelectItem key={cls.id} value={cls.id.toString()}>
                                    {cls.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Create a password" {...field} className="h-10" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Confirm your password" {...field} className="h-10" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full mt-2 h-12 bg-primary hover:bg-primary/90 text-white transition-all"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Create Account
                      </Button>

                      <div className="text-center text-sm">
                        <p className="text-gray-500">
                          Already have an account?{" "}
                          <button 
                            type="button"
                            className="text-primary font-medium hover:underline"
                            onClick={() => setActiveTab("login")}
                          >
                            Sign in
                          </button>
                        </p>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right: Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-r from-blue-600 to-primary flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md">
          <School className="h-16 w-16 mb-6" />
          <h1 className="text-4xl font-bold mb-4">
            Student Attendance System
          </h1>
          <p className="text-xl mb-6">
            Track your attendance, view your class schedule, and stay on top of your academic responsibilities.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <h3 className="font-semibold">Easy Class Management</h3>
                <p className="opacity-80">Access your class schedule and mark attendance with just a few clicks.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <h3 className="font-semibold">Academic Tracking</h3>
                <p className="opacity-80">Monitor your attendance history and performance across all courses.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
