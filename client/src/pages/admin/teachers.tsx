import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { hashPassword } from "../../lib/auth-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, Plus, Pencil, Trash } from "lucide-react";

// Form schema for teacher
const teacherSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  departmentId: z.number().optional(), // Primary department
  additionalDepartments: z.array(z.number()).optional(), // Additional departments
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

// Component to display additional departments for a teacher
function TeacherDepartments({ teacherId }: { teacherId: number }) {
  const { data: departments = [] } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await fetch("/api/departments");
      if (!response.ok) throw new Error("Failed to fetch departments");
      return response.json();
    },
  });
  
  const { data: teacherDepartments = [], isLoading } = useQuery({
    queryKey: ["/api/teachers", teacherId, "departments"],
    queryFn: async () => {
      const response = await fetch(`/api/teachers/${teacherId}/departments`);
      if (!response.ok) throw new Error("Failed to fetch teacher departments");
      return response.json();
    },
  });
  
  if (isLoading) return <div className="text-xs text-neutral-500">Loading...</div>;
  
  if (!teacherDepartments.length) return <div className="text-xs text-neutral-500">None</div>;
  
  // Extract department names from IDs
  const departmentNames = teacherDepartments
    .map((td: any) => {
      const dept = departments.find((d: any) => d.id === td.departmentId);
      return dept?.name;
    })
    .filter(Boolean)
    .join(", ");
  
  return (
    <div className="text-sm">
      {departmentNames}
    </div>
  );
}

export default function AdminTeachers() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<any>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Parse the edit parameter from the URL
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("edit");

  // Fetch teachers
  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const response = await fetch("/api/teachers");
      if (!response.ok) throw new Error("Failed to fetch teachers");
      return response.json();
    },
  });

  // Fetch departments for the dropdown
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await fetch("/api/departments");
      if (!response.ok) throw new Error("Failed to fetch departments");
      return response.json();
    },
  });

  // Fetch specific teacher for editing
  const { data: teacherToEditData, isLoading: teacherToEditLoading } = useQuery({
    queryKey: ["/api/teachers", editId],
    queryFn: async () => {
      if (!editId) return null;
      const response = await fetch(`/api/teachers/${editId}`);
      if (!response.ok) throw new Error("Failed to fetch teacher");
      return response.json();
    },
    enabled: !!editId,
  });

  // Setup form
  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      fullName: "",
      username: "",
      password: "",
      departmentId: undefined,
      additionalDepartments: [],
    },
  });

  // Fetch teacher's additional departments when editing
  const { data: teacherDepartments = [] } = useQuery({
    queryKey: ["/api/teachers", editId, "departments"],
    queryFn: async () => {
      if (!editId) return [];
      const response = await fetch(`/api/teachers/${editId}/departments`);
      if (!response.ok) throw new Error("Failed to fetch teacher departments");
      return response.json();
    },
    enabled: !!editId,
  });

  // Update form values when editing a teacher
  useEffect(() => {
    if (teacherToEditData) {
      setTeacherToEdit(teacherToEditData);
      
      // Get department IDs from the teacher's additional departments
      const additionalDeptIds = teacherDepartments
        .map((dept: any) => dept.departmentId);
      
      form.reset({
        fullName: teacherToEditData.fullName,
        username: teacherToEditData.username,
        departmentId: teacherToEditData.departmentId,
        additionalDepartments: additionalDeptIds,
        password: "", // Empty password field - won't update unless filled
      });
      setIsAddDialogOpen(true);
    }
  }, [teacherToEditData, teacherDepartments, form]);

  // Function to update teacher's additional departments
  const updateTeacherDepartments = async (teacherId: number, additionalDepartments: number[]) => {
    try {
      // First get current departments
      const response = await fetch(`/api/teachers/${teacherId}/departments`);
      if (!response.ok) throw new Error("Failed to fetch teacher departments");
      const currentDepartments = await response.json();
      
      // Find departments to remove
      const currentDeptIds = currentDepartments.map((dept: any) => dept.departmentId);
      const deptsToRemove = currentDeptIds.filter(id => !additionalDepartments.includes(id));
      
      // Find departments to add
      const deptsToAdd = additionalDepartments.filter(id => !currentDeptIds.includes(id));
      
      // Remove departments
      for (const deptId of deptsToRemove) {
        await apiRequest(
          "DELETE", 
          `/api/teachers/${teacherId}/departments/${deptId}`, 
          undefined
        );
      }
      
      // Add departments
      for (const deptId of deptsToAdd) {
        await apiRequest(
          "POST", 
          `/api/teachers/${teacherId}/departments`, 
          { departmentId: deptId }
        );
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/teachers", teacherId, "departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      return true;
    } catch (error) {
      console.error("Error updating teacher departments:", error);
      return false;
    }
  };

  // Create teacher mutation
  const createTeacherMutation = useMutation({
    mutationFn: async (data: any) => {
      // Extract and remove additionalDepartments before sending to main API
      const { additionalDepartments, ...teacherData } = data;
      
      const response = await apiRequest("POST", "/api/teachers", teacherData);
      const newTeacher = await response.json();
      
      // Add additional department assignments if provided
      if (additionalDepartments && Array.isArray(additionalDepartments) && additionalDepartments.length > 0) {
        await updateTeacherDepartments(newTeacher.id, additionalDepartments);
      }
      
      return newTeacher;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Teacher created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update teacher mutation
  const updateTeacherMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!teacherToEdit || !teacherToEdit.id) {
        throw new Error("No teacher selected for update");
      }
      
      // Extract and remove additionalDepartments before sending to main API
      const { additionalDepartments, ...teacherData } = data;
      
      // Update the teacher's main info
      const response = await apiRequest("PUT", `/api/teachers/${teacherToEdit.id}`, teacherData);
      const updatedTeacher = await response.json();
      
      // Update additional department assignments if provided
      if (additionalDepartments && Array.isArray(additionalDepartments)) {
        // Process department assignment changes
        await updateTeacherDepartments(teacherToEdit.id, additionalDepartments);
      }
      
      return updatedTeacher;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Teacher updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      setIsAddDialogOpen(false);
      setTeacherToEdit(null);
      // Remove the edit parameter from the URL
      setLocation("/admin/teachers");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete teacher mutation
  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/teachers/${id}`, undefined);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Teacher deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      setTeacherToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: TeacherFormValues) => {
    // If password is empty and we're editing, remove it from the data
    if (teacherToEdit && (!data.password || data.password.trim() === "")) {
      const { password, ...dataWithoutPassword } = data;
      updateTeacherMutation.mutate(dataWithoutPassword);
    } else {
      // For new teachers or password updates, hash the password
      const teacherData = {
        ...data,
        password: data.password,
        role: "teacher",
      };
      
      if (teacherToEdit) {
        updateTeacherMutation.mutate(teacherData);
      } else {
        createTeacherMutation.mutate(teacherData);
      }
    }
  };

  const handleDeleteTeacher = (teacher: any) => {
    setTeacherToDelete(teacher);
  };

  const confirmDeleteTeacher = () => {
    if (teacherToDelete) {
      deleteTeacherMutation.mutate(teacherToDelete.id);
    }
  };

  // Filter teachers based on search query
  const filteredTeachers = teachers.filter((teacher: any) => {
    if (!searchQuery) return true;
    return (
      teacher.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-neutral-500 mb-2">Teacher Management</h2>
          <p className="text-neutral-300">Add, edit, and manage teacher accounts</p>
        </div>
        
        <Card>
          <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
            <div className="relative w-1/3">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search teachers..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
              setIsAddDialogOpen(isOpen);
              if (!isOpen && teacherToEdit) {
                setTeacherToEdit(null);
                setLocation("/admin/teachers");
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="px-4 py-2 bg-primary text-white text-sm rounded-md flex items-center">
                  <Plus className="h-4 w-4 mr-1" /> Add Teacher
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>{teacherToEdit ? "Edit" : "Add"} Teacher</DialogTitle>
                  <DialogDescription>
                    {teacherToEdit ? "Update" : "Create"} a teacher account.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="jsmith" {...field} />
                          </FormControl>
                          <FormDescription>
                            This will be used for login.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {teacherToEdit ? "New Password (leave empty to keep current)" : "Password"}
                          </FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="departmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Department (Optional)</FormLabel>
                          <Select
                            onValueChange={(value) => 
                              field.onChange(value !== "none" ? parseInt(value) : null)
                            }
                            value={field.value?.toString() || "none"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Primary Department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {departments.map((dept: any) => (
                                <SelectItem key={dept.id} value={dept.id.toString()}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            This will be the teacher's primary department
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="additionalDepartments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Departments</FormLabel>
                          <div className="space-y-2">
                            {departments.map((dept: any) => (
                              <div key={dept.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`dept-${dept.id}`}
                                  checked={field.value?.includes(dept.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValues, dept.id]);
                                    } else {
                                      field.onChange(
                                        currentValues.filter((id: number) => id !== dept.id)
                                      );
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`dept-${dept.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {dept.name}
                                </label>
                              </div>
                            ))}
                          </div>
                          <FormDescription>
                            Select additional departments this teacher belongs to
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={
                          createTeacherMutation.isPending || updateTeacherMutation.isPending
                        }
                      >
                        {createTeacherMutation.isPending || updateTeacherMutation.isPending
                          ? "Saving..."
                          : teacherToEdit
                          ? "Update Teacher"
                          : "Create Teacher"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <CardContent className="p-6">
            {teachersLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-400 mb-4">
                  {searchQuery ? "No teachers found matching your search." : "No teachers found."}
                </p>
                {!searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    Add your first teacher
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Primary Department</TableHead>
                    <TableHead>Additional Departments</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher: any) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{teacher.fullName}</TableCell>
                      <TableCell>{teacher.username}</TableCell>
                      <TableCell>
                        {teacher.departmentId
                          ? departments.find(
                              (d: any) => d.id === teacher.departmentId
                            )?.name || "Not assigned"
                          : "Not assigned"}
                      </TableCell>
                      <TableCell>
                        <TeacherDepartments teacherId={teacher.id} />
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-primary-dark"
                            onClick={() => {
                              setLocation(`/admin/teachers?edit=${teacher.id}`);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-error hover:text-error"
                                onClick={() => handleDeleteTeacher(teacher)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete {teacher.fullName}'s account.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={confirmDeleteTeacher}
                                  className="bg-error hover:bg-error text-white"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
