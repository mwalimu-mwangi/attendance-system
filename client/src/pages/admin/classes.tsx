import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Pencil, Trash, Plus, Users } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Form schema for class
const classSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  departmentId: z.preprocess(
    (val) => parseInt(val as string, 10) || 0,
    z.number().min(1, "Department is required")
  ),
  levelId: z.preprocess(
    (val) => parseInt(val as string, 10) || 0,
    z.number().min(1, "Level is required")
  ),
});

type ClassFormValues = z.infer<typeof classSchema>;

export default function AdminClasses() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<any>(null);
  const [classToDelete, setClassToDelete] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [isViewStudentsOpen, setIsViewStudentsOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  // Parse the edit parameter from the URL
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("edit");

  // Fetch departments
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await fetch("/api/departments");
      if (!response.ok) throw new Error("Failed to fetch departments");
      return response.json();
    },
  });

  // Fetch levels
  const { data: levels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ["/api/levels"],
    queryFn: async () => {
      const response = await fetch("/api/levels");
      if (!response.ok) throw new Error("Failed to fetch levels");
      return response.json();
    },
  });

  // Fetch classes
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["/api/classes", activeTab],
    queryFn: async () => {
      const departmentId = activeTab !== "all" ? activeTab : undefined;
      let url = "/api/classes";
      // Only add the query parameter if we're filtering
      if (departmentId) {
        url += `?departmentId=${departmentId}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch classes");
      return response.json();
    },
  });

  // Fetch specific class for editing
  const { data: classToEditData, isLoading: classToEditLoading } = useQuery({
    queryKey: ["/api/classes", editId],
    queryFn: async () => {
      if (!editId) return null;
      const response = await fetch(`/api/classes/${editId}`);
      if (!response.ok) throw new Error("Failed to fetch class");
      return response.json();
    },
    enabled: !!editId,
  });

  // Setup form
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      departmentId: 0,
      levelId: 0,
    },
  });

  // Update form values when editing a class
  useEffect(() => {
    if (classToEditData) {
      setClassToEdit(classToEditData);
      form.reset({
        name: classToEditData.name,
        departmentId: classToEditData.departmentId,
        levelId: classToEditData.levelId,
      });
      setIsAddDialogOpen(true);
    }
  }, [classToEditData, form]);

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (data: ClassFormValues) => {
      const response = await apiRequest("POST", "/api/classes", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Class created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
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

  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: async (data: ClassFormValues) => {
      if (!classToEdit || !classToEdit.id) {
        throw new Error("No class selected for update");
      }
      const response = await apiRequest("PUT", `/api/classes/${classToEdit.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Class updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      setIsAddDialogOpen(false);
      setClassToEdit(null);
      // Remove the edit parameter from the URL
      setLocation("/admin/classes");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/classes/${id}`, undefined);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Class deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      setClassToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ClassFormValues) => {
    if (classToEdit) {
      updateClassMutation.mutate(data);
    } else {
      createClassMutation.mutate(data);
    }
  };

  const handleDeleteClass = (classItem: any) => {
    setClassToDelete(classItem);
  };

  const confirmDeleteClass = () => {
    if (classToDelete) {
      deleteClassMutation.mutate(classToDelete.id);
    }
  };

  const handleViewStudents = (classItem: any) => {
    setSelectedClass(classItem);
    setIsViewStudentsOpen(true);
  };

  // We no longer need to filter classes here since we're doing it on the server-side
  // Just use the classes data directly
  const filteredClasses = classes;

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-neutral-500 mb-2">Class Management</h2>
          <p className="text-neutral-300">Add, edit, and manage classes for departments and levels</p>
        </div>
        
        <Card>
          <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All Departments</TabsTrigger>
                {!departmentsLoading &&
                  departments.map((dept: any) => (
                    <TabsTrigger key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </TabsTrigger>
                  ))}
              </TabsList>
            </Tabs>
            
            <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
              setIsAddDialogOpen(isOpen);
              if (!isOpen && classToEdit) {
                setClassToEdit(null);
                setLocation("/admin/classes");
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="px-4 py-2 bg-primary text-white text-sm rounded-md flex items-center">
                  <Plus className="h-4 w-4 mr-1" /> Add Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{classToEdit ? "Edit" : "Add"} Class</DialogTitle>
                  <DialogDescription>
                    {classToEdit ? "Update" : "Create"} a class for a specific department and level.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Class Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., CO-5A" {...field} />
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
                          <FormLabel>Department</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value)}
                            value={field.value ? field.value.toString() : undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
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
                      control={form.control}
                      name="levelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Level</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value)}
                            value={field.value ? field.value.toString() : undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
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
                    
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={
                          createClassMutation.isPending || updateClassMutation.isPending
                        }
                      >
                        {createClassMutation.isPending || updateClassMutation.isPending
                          ? "Saving..."
                          : classToEdit
                          ? "Update Class"
                          : "Create Class"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <CardContent className="p-6">
            {classesLoading || departmentsLoading || levelsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-400 mb-4">
                  {activeTab === "all" ? "No classes found." : "No classes found for this department."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  Add your first class
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.map((classItem: any) => (
                    <TableRow key={classItem.id}>
                      <TableCell className="font-medium">{classItem.name}</TableCell>
                      <TableCell>
                        {departments.find((d: any) => d.id === classItem.departmentId)?.name || "Unknown"}
                      </TableCell>
                      <TableCell>
                        {levels.find((l: any) => l.id === classItem.levelId)
                          ? `${levels.find((l: any) => l.id === classItem.levelId)?.number} - ${
                              levels.find((l: any) => l.id === classItem.levelId)?.name
                            }`
                          : "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewStudents(classItem)}
                          className="flex items-center"
                        >
                          <Users className="h-4 w-4 mr-1" /> View Students
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-primary-dark"
                            onClick={() => {
                              setLocation(`/admin/classes?edit=${classItem.id}`);
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
                                onClick={() => handleDeleteClass(classItem)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the class {classItem.name}.
                                  This action cannot be undone and may affect students and lessons.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={confirmDeleteClass}
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

      {/* View Students Dialog */}
      <Dialog open={isViewStudentsOpen} onOpenChange={setIsViewStudentsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedClass?.name} - Students
            </DialogTitle>
            <DialogDescription>
              View all students enrolled in this class
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* This would show the students in the class */}
            <p className="text-center text-neutral-400 py-4">
              Loading students...
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewStudentsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
