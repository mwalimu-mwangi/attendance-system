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

// Form schema for level
const levelSchema = z.object({
  number: z.preprocess(
    (val) => parseInt(val as string, 10) || 0,
    z.number().min(1, "Level number is required")
  ),
  name: z.string().min(1, "Level name is required"),
});

type LevelFormValues = z.infer<typeof levelSchema>;

export default function AdminLevels() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [levelToEdit, setLevelToEdit] = useState<any>(null);
  const [levelToDelete, setLevelToDelete] = useState<any>(null);

  // Parse the edit parameter from the URL
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("edit");

  // Fetch levels
  const { data: levels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ["/api/levels"],
    queryFn: async () => {
      const response = await fetch("/api/levels");
      if (!response.ok) throw new Error("Failed to fetch levels");
      return response.json();
    },
  });

  // Fetch specific level for editing
  const { data: levelToEditData, isLoading: levelToEditLoading } = useQuery({
    queryKey: ["/api/levels", editId],
    queryFn: async () => {
      if (!editId) return null;
      const response = await fetch(`/api/levels/${editId}`);
      if (!response.ok) throw new Error("Failed to fetch level");
      return response.json();
    },
    enabled: !!editId,
  });

  // Setup form
  const form = useForm<LevelFormValues>({
    resolver: zodResolver(levelSchema),
    defaultValues: {
      number: 0,
      name: "",
    },
  });

  // Update form values when editing a level
  useEffect(() => {
    if (levelToEditData) {
      setLevelToEdit(levelToEditData);
      form.reset({
        number: levelToEditData.number,
        name: levelToEditData.name,
      });
      setIsAddDialogOpen(true);
    }
  }, [levelToEditData, form]);

  // Create level mutation
  const createLevelMutation = useMutation({
    mutationFn: async (data: LevelFormValues) => {
      const response = await apiRequest("POST", "/api/levels", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Level created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/levels"] });
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

  // Update level mutation
  const updateLevelMutation = useMutation({
    mutationFn: async (data: LevelFormValues) => {
      const response = await apiRequest("PUT", `/api/levels/${levelToEdit.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Level updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/levels"] });
      setIsAddDialogOpen(false);
      setLevelToEdit(null);
      // Remove the edit parameter from the URL
      setLocation("/admin/levels");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete level mutation
  const deleteLevelMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/levels/${id}`, undefined);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Level deleted successfully.",
      });
      // Optimistically update the UI by filtering out the deleted level
      const currentLevels = queryClient.getQueryData<any[]>(["/api/levels"]) || [];
      queryClient.setQueryData(
        ["/api/levels"],
        currentLevels.filter((level) => level.id !== levelToDelete?.id)
      );
      // Also invalidate to ensure data consistency with the server
      queryClient.invalidateQueries({ queryKey: ["/api/levels"] });
      setLevelToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LevelFormValues) => {
    if (levelToEdit) {
      updateLevelMutation.mutate(data);
    } else {
      createLevelMutation.mutate(data);
    }
  };

  // No need for separate delete handlers anymore, using inline function in the dialog

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-neutral-500 mb-2">Level Management</h2>
          <p className="text-neutral-300">Add, edit, and manage academic levels</p>
        </div>
        
        <Card>
          <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-neutral-500">Levels</h3>
            
            <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
              setIsAddDialogOpen(isOpen);
              if (!isOpen && levelToEdit) {
                setLevelToEdit(null);
                setLocation("/admin/levels");
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="px-4 py-2 bg-primary text-white text-sm rounded-md flex items-center">
                  <Plus className="h-4 w-4 mr-1" /> Add Level
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{levelToEdit ? "Edit" : "Add"} Level</DialogTitle>
                  <DialogDescription>
                    {levelToEdit ? "Update" : "Create"} an academic level.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Level Number</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              placeholder="e.g., 3" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value)}
                              value={field.value.toString()}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Level Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Entry" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={
                          createLevelMutation.isPending || updateLevelMutation.isPending
                        }
                      >
                        {createLevelMutation.isPending || updateLevelMutation.isPending
                          ? "Saving..."
                          : levelToEdit
                          ? "Update Level"
                          : "Create Level"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <CardContent className="p-6">
            {levelsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : levels.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-400 mb-4">No levels found.</p>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  Add your first level
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level Number</TableHead>
                    <TableHead>Level Name</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {levels.map((level: any) => (
                    <TableRow key={level.id}>
                      <TableCell className="font-medium">{level.number}</TableCell>
                      <TableCell>{level.name}</TableCell>
                      <TableCell>
                        {level.createdAt
                          ? new Date(level.createdAt).toLocaleDateString()
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
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-primary-dark"
                            onClick={() => {
                              setLocation(`/admin/levels?edit=${level.id}`);
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
                                  This will permanently delete Level {level.number}: {level.name}.
                                  This action cannot be undone and may affect classes and students.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    setLevelToDelete(level);
                                    deleteLevelMutation.mutate(level.id);
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
