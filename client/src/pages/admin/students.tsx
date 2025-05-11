import { useState } from 'react';
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash, Plus, FileText, MoreHorizontal } from 'lucide-react';
import { User, InsertUser } from '@shared/schema';
import { useLocation } from 'wouter';

type Student = Omit<User, 'password'> & {
  className?: string | null;
  departmentName?: string | null;
};

const StudentManagement = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Student management state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    classId: ''
  });
  
  // Add active filter tab state
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch all students
  const { data: students = [], isLoading: isLoadingStudents } = useQuery<Student[]>({
    queryKey: ['/api/students'],
    refetchOnWindowFocus: false,
  });

  interface ClassData {
    id: number;
    name: string;
    departmentId: number;
    levelId: number;
  }
  
  // Fetch classes for the dropdown
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery<ClassData[]>({
    queryKey: ['/api/classes'],
    refetchOnWindowFocus: false,
  });
  
  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async (studentData: Partial<InsertUser>) => {
      const res = await apiRequest('POST', '/api/students', studentData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Student created successfully',
      });
      setIsAddDialogOpen(false);
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create student: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Update student mutation
  const updateStudentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertUser> }) => {
      const res = await apiRequest('PATCH', `/api/students/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Student updated successfully',
      });
      setIsEditDialogOpen(false);
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update student: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/students/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Student deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete student: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Open add student dialog
  const handleAddClick = () => {
    clearForm();
    setIsAddDialogOpen(true);
  };
  
  // Open edit student dialog
  const handleEditClick = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      username: student.username,
      password: '', // Don't populate password field for security
      fullName: student.fullName,
      classId: student.classId?.toString() || 'none',
    });
    setIsEditDialogOpen(true);
  };
  
  // Open delete confirmation dialog
  const handleDeleteClick = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteDialogOpen(true);
  };
  
  // View student report
  const handleViewReportClick = (student: Student) => {
    navigate(`/admin/students/${student.id}/report`);
  };
  
  // Clear form data
  const clearForm = () => {
    setFormData({
      username: '',
      password: '',
      fullName: '',
      classId: 'none',
    });
    setSelectedStudent(null);
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle add student form submission
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const studentData: Partial<InsertUser> = {
      username: formData.username,
      password: formData.password,
      fullName: formData.fullName,
      classId: formData.classId && formData.classId !== "none" ? parseInt(formData.classId) : null,
      role: 'student',
    };
    
    createStudentMutation.mutate(studentData);
  };
  
  // Handle edit student form submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    const updateData: Partial<InsertUser> = {
      username: formData.username,
      fullName: formData.fullName,
      classId: formData.classId && formData.classId !== "none" ? parseInt(formData.classId) : null,
    };
    
    // Only include password if it was changed
    if (formData.password) {
      updateData.password = formData.password;
    }
    
    updateStudentMutation.mutate({
      id: selectedStudent.id,
      data: updateData,
    });
  };
  
  // Handle delete student confirmation
  const handleDeleteConfirm = () => {
    if (selectedStudent) {
      deleteStudentMutation.mutate(selectedStudent.id);
    }
  };
  
  // Filter students based on selected class
  const filteredStudents = students.filter((student: Student) => {
    if (activeTab === "all") return true;
    return student.classId === parseInt(activeTab);
  });

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-neutral-500 mb-2">Student Management</h2>
          <p className="text-neutral-300">Add, edit, and manage student accounts in the system</p>
        </div>
        
        <Card>
          <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All Classes</TabsTrigger>
                {!isLoadingClasses &&
                  classes.map((cls) => (
                    <TabsTrigger key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </TabsTrigger>
                  ))}
              </TabsList>
            </Tabs>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="px-4 py-2 bg-primary text-white text-sm rounded-md flex items-center">
                  <Plus className="h-4 w-4 mr-1" /> Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>
                    Create a new student account. All fields are required.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="fullName" className="text-right">
                        Full Name
                      </Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="username" className="text-right">
                        Username
                      </Label>
                      <Input
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="password" className="text-right">
                        Password
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="class" className="text-right">
                        Class
                      </Label>
                      <Select
                        value={formData.classId}
                        onValueChange={(value) => handleSelectChange('classId', value)}
                      >
                        <SelectTrigger className="col-span-3" id="class">
                          <SelectValue placeholder="Select a class" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not assigned</SelectItem>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id.toString()}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createStudentMutation.isPending}
                    >
                      {createStudentMutation.isPending ? (
                        <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                      ) : (
                        'Create Student'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <CardContent className="p-6">
            {isLoadingStudents || isLoadingClasses ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-400 mb-4">
                  {activeTab === "all" ? "No students found." : "No students found in this class."}
                </p>
                <Button
                  variant="outline"
                  onClick={handleAddClick}
                >
                  Add your first student
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.fullName}</TableCell>
                      <TableCell>{student.username}</TableCell>
                      <TableCell>{student.className || 'Not assigned'}</TableCell>
                      <TableCell>{student.departmentName || 'Not assigned'}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-primary-dark"
                            onClick={() => handleEditClick(student)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-primary-dark"
                            onClick={() => handleViewReportClick(student)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <AlertDialog open={isDeleteDialogOpen && selectedStudent?.id === student.id} onOpenChange={() => !deleteStudentMutation.isPending && setIsDeleteDialogOpen(false)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive/90"
                                onClick={() => handleDeleteClick(student)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Student</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {student.fullName}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={handleDeleteConfirm}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {deleteStudentMutation.isPending ? 'Deleting...' : 'Delete'}
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

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information. Leave password blank to keep it unchanged.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-fullName" className="text-right">
                  Full Name
                </Label>
                <Input
                  id="edit-fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-username" className="text-right">
                  Username
                </Label>
                <Input
                  id="edit-username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-password" className="text-right">
                  Password
                </Label>
                <Input
                  id="edit-password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Leave blank to keep unchanged"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-class" className="text-right">
                  Class
                </Label>
                <Select
                  value={formData.classId}
                  onValueChange={(value) => handleSelectChange('classId', value)}
                >
                  <SelectTrigger className="col-span-3" id="edit-class">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateStudentMutation.isPending}
              >
                {updateStudentMutation.isPending ? (
                  <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                ) : (
                  'Update Student'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default StudentManagement;