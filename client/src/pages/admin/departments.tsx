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
import { Plus, Pencil, Trash } from "lucide-react";
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

// Form schema for department
const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

export default function AdminDepartments() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<any>(null);
  const [departmentToDelete, setDepartmentToDelete] = useState<any>(null);

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

  // Fetch specific department for editing
  const { data: departmentToEditData, isLoading: departmentToEditLoading } = useQuery({
    queryKey: ["/api/departments", editId],
    queryFn: async () => {
      if (!editId) return null;
      const response = await fetch(`/api/departments/${editId}`);
      if (!response.ok) throw new Error("Failed to fetch department");
      return response.json();
    },
    enabled: !!editId,
  });

  // Setup form
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
    },
  });

  // Update form values when editing a department
  useEffect(() => {
    if (departmentToEditData) {
      setDepartmentToEdit(departmentToEditData);
      form.reset({
        name: departmentToEditData.name,
      });
      setIsAddDialogOpen(true);
    }
  }, [departmentToEditData, form]);

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: async (data: DepartmentFormValues) => {
      const response = await apiRequest("POST", "/api/departments", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Department created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
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

  // Update department mutation
  const updateDepartmentMutation = useMutation({
    mutationFn: async (data: DepartmentFormValues) => {
      const response = await apiRequest("PUT", `/api/departments/${departmentToEdit.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Department updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsAddDialogOpen(false);
      setDepartmentToEdit(null);
      // Remove the edit parameter from the URL
      setLocation("/admin/departments");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/departments/${id}`, undefined);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Department deleted successfully.",
      });
      // Optimistically update the UI by filtering out the deleted department
      const currentDepartments = queryClient.getQueryData<any[]>(["/api/departments"]) || [];
      queryClient.setQueryData(
        ["/api/departments"],
        currentDepartments.filter((dept) => dept.id !== departmentToDelete?.id)
      );
      // Also invalidate to ensure data consistency with the server
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setDepartmentToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DepartmentFormValues) => {
    if (departmentToEdit) {
      updateDepartmentMutation.mutate(data);
    } else {
      createDepartmentMutation.mutate(data);
    }
  };

  // No need for separate handlers anymore, the delete operation is handled directly in the dialog

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-neutral-500 mb-2">Department Management</h2>
          <p className="text-neutral-300">Add, edit, and manage departments</p>
        </div>
        
        <Card>
          <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-neutral-500">Departments</h3>
            
            <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
              setIsAddDialogOpen(isOpen);
              if (!isOpen && departmentToEdit) {
                setDepartmentToEdit(null);
                setLocation("/admin/departments");
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="px-4 py-2 bg-primary text-white text-sm rounded-md flex items-center">
                  <Plus className="h-4 w-4 mr-1" /> Add Department
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{departmentToEdit ? "Edit" : "Add"} Department</DialogTitle>
                  <DialogDescription>
                    {departmentToEdit ? "Update" : "Create"} a department for the institution.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Computing" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={
                          createDepartmentMutation.isPending || updateDepartmentMutation.isPending
                        }
                      >
                        {createDepartmentMutation.isPending || updateDepartmentMutation.isPending
                          ? "Saving..."
                          : departmentToEdit
                          ? "Update Department"
                          : "Create Department"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <CardContent className="p-6">
            {departmentsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : departments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-400 mb-4">No departments found.</p>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  Add your first department
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department Name</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Teachers</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((department: any) => (
                    <TableRow key={department.id}>
                      <TableCell className="font-medium">{department.name}</TableCell>
                      <TableCell>
                        {department.createdAt
                          ? new Date(department.createdAt).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {/* This would come from a separate API call */}
                        -
                      </TableCell>
                      <TableCell>
                        {/* This would come from a separate API call */}
                        -
                      </TableCell>
                      <TableCell>
                        {/* This would come from a separate API call */}
                        -
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-primary-dark"
                            onClick={() => {
                              setLocation(`/admin/departments?edit=${department.id}`);
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
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the {department.name} department.
                                  This action cannot be undone and may affect classes, teachers, and students.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    setDepartmentToDelete(department);
                                    deleteDepartmentMutation.mutate(department.id);
                                  }}
                                  className="bg-red-500 hover:bg-red-600 text-white"
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
