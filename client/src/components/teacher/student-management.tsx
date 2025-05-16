import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { School, Users, UserCheck, UserMinus, UserPlus, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function StudentManagement() {
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch classes that this teacher can manage
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ["/api/teacher/classes"],
    queryFn: async () => {
      // For teacher, we need to fetch classes from their departments
      const teacherDepts = await fetch("/api/teacher/departments").then(res => res.json());
      const departmentIds = teacherDepts.map((dept: any) => dept.departmentId);
      
      // Fetch all classes
      const allClasses = await fetch("/api/classes").then(res => res.json());
      
      // Filter classes to include only those from teacher's departments
      return allClasses.filter((classItem: any) => 
        departmentIds.includes(classItem.departmentId)
      );
    }
  });
  
  // Fetch all students
  const { data: allStudents = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/users", { role: "student" }],
    queryFn: async () => {
      const response = await fetch("/api/users?role=student");
      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }
      return response.json();
    }
  });
  
  // Register student mutation
  const registerStudentMutation = useMutation({
    mutationFn: async ({ studentId, classId }: { studentId: string, classId: string }) => {
      const response = await fetch("/api/teacher/register-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId, classId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to register student");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Reset form
      setStudentId("");
      
      // Show success toast
      toast({
        title: "Success",
        description: "Student registered to class successfully",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to register student",
        variant: "destructive",
      });
    },
  });
  
  // Deregister student mutation
  const deregisterStudentMutation = useMutation({
    mutationFn: async ({ studentId }: { studentId: string }) => {
      const response = await fetch("/api/teacher/deregister-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to deregister student");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Show success toast
      toast({
        title: "Success",
        description: "Student deregistered from class successfully",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deregister student",
        variant: "destructive",
      });
    },
  });
  
  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentId || !classId) {
      toast({
        title: "Validation Error",
        description: "Student and class are required fields",
        variant: "destructive",
      });
      return;
    }
    
    registerStudentMutation.mutate({ studentId, classId });
  };
  
  const handleDeregisterStudent = (studentId: string) => {
    deregisterStudentMutation.mutate({ studentId });
  };
  
  // Filter students based on search query
  const filteredStudents = allStudents.filter((student: any) => {
    const searchLower = searchQuery.toLowerCase();
    const fullNameMatch = student.fullName?.toLowerCase().includes(searchLower);
    const usernameMatch = student.username?.toLowerCase().includes(searchLower);
    return fullNameMatch || usernameMatch;
  });
  
  // Get available students (not yet assigned to any class)
  const availableStudents = filteredStudents.filter((student: any) => !student.classId);
  
  // Get registered students (assigned to classes in teacher's departments)
  const registeredStudents = filteredStudents.filter((student: any) => {
    if (!student.classId) return false;
    
    // Filter for students in classes that this teacher can manage
    const studentClass = classes.find((c: any) => c.id === student.classId);
    return !!studentClass;
  });
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Student Management
        </CardTitle>
        <CardDescription>
          Register and manage students for your classes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="register">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="register" className="flex items-center gap-1">
              <UserPlus className="h-4 w-4" /> Register Students
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-1">
              <UserMinus className="h-4 w-4" /> Manage Registered Students
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="register" className="space-y-4 mt-4">
            <form onSubmit={handleRegisterStudent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="class" className="flex items-center gap-1">
                  <School className="h-4 w-4" /> Class
                </Label>
                <Select value={classId} onValueChange={setClassId} required>
                  <SelectTrigger id="class" disabled={isLoadingClasses}>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem: any) => (
                      <SelectItem key={classItem.id} value={classItem.id.toString()}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {classes.length === 0 && !isLoadingClasses && (
                  <p className="text-xs text-destructive">
                    You are not assigned to any departments or there are no classes available.
                  </p>
                )}
              </div>
              
              <div className="space-y-4 mt-6">
                <div className="flex items-center gap-2">
                  <Label htmlFor="search-students" className="flex-shrink-0">
                    <Search className="h-4 w-4" />
                  </Label>
                  <Input
                    id="search-students"
                    placeholder="Search students by name or admission number"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-grow"
                  />
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admission #</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                            {isLoadingStudents 
                              ? "Loading students..." 
                              : searchQuery 
                                ? "No matching unregistered students found"
                                : "No unregistered students available"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        availableStudents.map((student: any) => (
                          <TableRow key={student.id}>
                            <TableCell>{student.username}</TableCell>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!classId || registerStudentMutation.isPending}
                                onClick={() => {
                                  setStudentId(student.id.toString());
                                  registerStudentMutation.mutate({ 
                                    studentId: student.id.toString(), 
                                    classId 
                                  });
                                }}
                                className="flex items-center gap-1"
                              >
                                <UserPlus className="h-3 w-3" /> Register
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="manage" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="search-registered" className="flex-shrink-0">
                  <Search className="h-4 w-4" />
                </Label>
                <Input
                  id="search-registered"
                  placeholder="Search registered students by name or admission number"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-grow"
                />
              </div>
              
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admission #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registeredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          {isLoadingStudents 
                            ? "Loading students..." 
                            : searchQuery 
                              ? "No matching registered students found"
                              : "No registered students available"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      registeredStudents.map((student: any) => {
                        const studentClass = classes.find((c: any) => c.id === student.classId);
                        return (
                          <TableRow key={student.id}>
                            <TableCell>{student.username}</TableCell>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell>{studentClass?.name || "Unknown Class"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={deregisterStudentMutation.isPending}
                                onClick={() => handleDeregisterStudent(student.id.toString())}
                                className="flex items-center gap-1 text-destructive border-destructive hover:bg-destructive/10"
                              >
                                <UserMinus className="h-3 w-3" /> Deregister
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}