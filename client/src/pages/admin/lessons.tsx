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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// Form schema for lesson
const lessonSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  classId: z.preprocess(
    (val) => parseInt(val as string, 10) || 0,
    z.number().min(1, "Class is required")
  ),
  teacherId: z.preprocess(
    (val) => parseInt(val as string, 10) || 0,
    z.number().min(1, "Teacher is required")
  ),
  dayOfWeek: z.preprocess(
    (val) => parseInt(val as string, 10) || 0,
    z.number().min(0).max(6, "Day of week must be between 0 (Sunday) and 6 (Saturday)")
  ),
  startHour: z.preprocess(
    (val) => parseInt(val as string, 10) || 9,
    z.number().min(0).max(23, "Start hour must be between 0 and 23")
  ),
  startMinute: z.preprocess(
    (val) => parseInt(val as string, 10) || 0,
    z.number().min(0).max(59, "Start minute must be between 0 and 59")
  ),
  durationMinutes: z.preprocess(
    (val) => parseInt(val as string, 10) || 60,
    z.number().min(15, "Duration must be at least 15 minutes").max(480, "Duration cannot exceed 8 hours")
  ),
  lessonCount: z.preprocess(
    (val) => parseInt(val as string, 10) || 1,
    z.number().min(1, "Lesson count must be at least 1").max(5, "Lesson count cannot exceed 5")
  ),
  location: z.string().optional(),
  attendanceWindowMinutes: z.preprocess(
    (val) => parseInt(val as string, 10) || 30,
    z.number().min(1, "Attendance window is required")
  ),
  isActive: z.boolean().default(true),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

export default function AdminLessons() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [lessonToEdit, setLessonToEdit] = useState<any>(null);
  const [lessonToDelete, setLessonToDelete] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [createRecurringLessons, setCreateRecurringLessons] = useState(false);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [numberOfWeeks, setNumberOfWeeks] = useState(1);

  // Parse the edit parameter from the URL
  const params = new URLSearchParams(location.split("?")[1]);
  const editId = params.get("edit");

  // Fetch classes
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const response = await fetch("/api/classes");
      if (!response.ok) throw new Error("Failed to fetch classes");
      return response.json();
    },
  });

  // Fetch teachers
  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const response = await fetch("/api/teachers");
      if (!response.ok) throw new Error("Failed to fetch teachers");
      return response.json();
    },
  });

  // Fetch system settings for default attendance window
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/system-settings"],
    queryFn: async () => {
      const response = await fetch("/api/system-settings");
      if (!response.ok) throw new Error("Failed to fetch system settings");
      return response.json();
    },
  });

  // Fetch lessons
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["/api/lessons"],
    queryFn: async () => {
      const response = await fetch("/api/lessons");
      if (!response.ok) throw new Error("Failed to fetch lessons");
      return response.json();
    },
  });

  // Fetch specific lesson for editing
  const { data: lessonToEditData, isLoading: lessonToEditLoading } = useQuery({
    queryKey: ["/api/lessons", editId],
    queryFn: async () => {
      if (!editId) return null;
      const response = await fetch(`/api/lessons/${editId}`);
      if (!response.ok) throw new Error("Failed to fetch lesson");
      return response.json();
    },
    enabled: !!editId,
  });

  // Setup form with default values
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema.transform((data) => {
      return {
        ...data,
        classId: Number(data.classId),
        teacherId: Number(data.teacherId),
        attendanceWindowMinutes: Number(data.attendanceWindowMinutes),
        durationMinutes: Number(data.durationMinutes),
      };
    })),
    defaultValues: {
      subject: "",
      classId: 0,
      teacherId: 0,
      dayOfWeek: new Date().getDay(), // Current day of week
      startHour: 9,
      startMinute: 0,
      durationMinutes: settings?.defaultLessonDuration || 120,
      lessonCount: 1,
      location: "",
      attendanceWindowMinutes: settings?.defaultAttendanceWindow || 30,
      isActive: true,
    },
  });

  // Update form values when editing a lesson
  useEffect(() => {
    if (lessonToEditData) {
      setLessonToEdit(lessonToEditData);
      
      // Extract hour and minute from startTimeMinutes
      const startHour = Math.floor(lessonToEditData.startTimeMinutes / 60);
      const startMinute = lessonToEditData.startTimeMinutes % 60;
      
      form.reset({
        subject: lessonToEditData.subject,
        classId: lessonToEditData.classId,
        teacherId: lessonToEditData.teacherId,
        dayOfWeek: lessonToEditData.dayOfWeek,
        startHour: startHour,
        startMinute: startMinute,
        durationMinutes: lessonToEditData.durationMinutes || 120,
        lessonCount: lessonToEditData.lessonCount || 1,
        location: lessonToEditData.location || "",
        attendanceWindowMinutes: lessonToEditData.attendanceWindowMinutes,
        isActive: lessonToEditData.isActive,
      });
      
      setIsAddDialogOpen(true);
    }
  }, [lessonToEditData, form]);

  // Update form when settings are loaded
  useEffect(() => {
    if (settings && !lessonToEdit) {
      form.setValue("attendanceWindowMinutes", settings.defaultAttendanceWindow);
    }
  }, [settings, form, lessonToEdit]);

  // Create lesson mutation
  const createLessonMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/lessons", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Lesson created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      setIsAddDialogOpen(false);
      form.reset({
        subject: "",
        classId: 0,
        teacherId: 0,
        dayOfWeek: new Date().getDay(),
        startHour: 9,
        startMinute: 0,
        durationMinutes: settings?.defaultLessonDuration || 120,
        lessonCount: 1,
        location: "",
        attendanceWindowMinutes: settings?.defaultAttendanceWindow || 30,
        isActive: true,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Create recurring lessons mutation
  const createRecurringLessonMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/lessons/recurring", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Recurring lessons created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      setIsAddDialogOpen(false);
      form.reset({
        subject: "",
        classId: 0,
        teacherId: 0,
        dayOfWeek: new Date().getDay(),
        startHour: 9,
        startMinute: 0,
        durationMinutes: settings?.defaultLessonDuration || 120,
        lessonCount: 1,
        location: "",
        attendanceWindowMinutes: settings?.defaultAttendanceWindow || 30,
        isActive: true,
      });
      setCreateRecurringLessons(false);
      setSelectedDaysOfWeek([]);
      setNumberOfWeeks(1);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update lesson mutation
  const updateLessonMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/lessons/${lessonToEdit.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Lesson updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      setIsAddDialogOpen(false);
      setLessonToEdit(null);
      // Remove the edit parameter from the URL
      setLocation("/admin/lessons");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete lesson mutation
  const deleteLessonMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/lessons/${id}`, undefined);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Lesson deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      setLessonToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LessonFormValues) => {
    // Calculate the total start time in minutes (e.g., 9:30 AM = 9*60 + 30 = 570)
    const startTimeMinutes = data.startHour * 60 + data.startMinute;
    
    const lessonData = {
      ...data,
      startTimeMinutes, // Store time as minutes since midnight
    };
    
    if (lessonToEdit) {
      updateLessonMutation.mutate(lessonData);
    } else {
      if (createRecurringLessons) {
        // Create recurring lessons
        const recurringLessonData = {
          ...lessonData,
          recurringPattern: {
            daysOfWeek: selectedDaysOfWeek.length > 0 ? selectedDaysOfWeek : [data.dayOfWeek],
            numberOfWeeks: numberOfWeeks,
          }
        };
        createRecurringLessonMutation.mutate(recurringLessonData);
      } else {
        // Create a single lesson
        createLessonMutation.mutate(lessonData);
      }
    }
  };

  const handleDeleteLesson = (lesson: any) => {
    setLessonToDelete(lesson);
  };

  const confirmDeleteLesson = () => {
    if (lessonToDelete) {
      deleteLessonMutation.mutate(lessonToDelete.id);
    }
  };

  // Filter lessons based on tab
  const filteredLessons = lessons.filter((lesson: any) => {
    // For day-of-week-based lessons, we'll use a different filtering approach
    const today = new Date().getDay(); // Current day of week (0-6)
    
    if (activeTab === "today") {
      return lesson.dayOfWeek === today;
    } else if (activeTab === "upcoming") {
      // For upcoming, we'll show lessons that are later in the week
      // If today is Friday, Saturday will be upcoming
      // If today is Saturday, Sunday through Friday will be upcoming
      return (lesson.dayOfWeek > today) || (today === 6); // Show all days if today is Saturday
    } else if (activeTab === "past") {
      // For past, we'll show lessons earlier in the week
      // If today is Monday, Sunday will be past
      // If today is Wednesday, Sunday, Monday, Tuesday will be past
      return lesson.dayOfWeek < today;
    }
    return true;
  });

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-neutral-500 mb-2">Lesson Management</h2>
          <p className="text-neutral-300">Add, edit, and manage lessons for classes</p>
        </div>
        
        <Card>
          <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="today">Today's Lessons</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming Lessons</TabsTrigger>
                <TabsTrigger value="past">Past Lessons</TabsTrigger>
                <TabsTrigger value="all">All Lessons</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
              setIsAddDialogOpen(isOpen);
              if (!isOpen && lessonToEdit) {
                setLessonToEdit(null);
                setLocation("/admin/lessons");
                form.reset({
                  subject: "",
                  classId: 0,
                  teacherId: 0,
                  dayOfWeek: new Date().getDay(),
                  startHour: 9,
                  startMinute: 0,
                  durationMinutes: settings?.defaultLessonDuration || 120,
                  lessonCount: 1,
                  location: "",
                  attendanceWindowMinutes: settings?.defaultAttendanceWindow || 30,
                  isActive: true,
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="px-4 py-2 bg-primary text-white text-sm rounded-md flex items-center">
                  <span className="mr-1">+</span> Add Lesson
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{lessonToEdit ? "Edit" : "Add"} Lesson</DialogTitle>
                  <DialogDescription>
                    {lessonToEdit ? "Update" : "Create"} a lesson for a class.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Database Systems" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="classId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Class</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value)}
                              value={field.value ? field.value.toString() : undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Class" />
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
                      
                      <FormField
                        control={form.control}
                        name="teacherId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teacher</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value)}
                              value={field.value ? field.value.toString() : undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Teacher" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {teachers.map((teacher: any) => (
                                  <SelectItem key={teacher.id} value={teacher.id.toString()}>
                                    {teacher.fullName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dayOfWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Day of Week</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Day" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">Sunday</SelectItem>
                                <SelectItem value="1">Monday</SelectItem>
                                <SelectItem value="2">Tuesday</SelectItem>
                                <SelectItem value="3">Wednesday</SelectItem>
                                <SelectItem value="4">Thursday</SelectItem>
                                <SelectItem value="5">Friday</SelectItem>
                                <SelectItem value="6">Saturday</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name="startHour"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hour</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                value={field.value.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Hour" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                      {i.toString().padStart(2, '0')}
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
                          name="startMinute"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minute</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                value={field.value.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Minute" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((min) => (
                                    <SelectItem key={min} value={min.toString()}>
                                      {min.toString().padStart(2, '0')}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Room 105" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="durationMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lesson Duration (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={15}
                                max={480}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 120)}
                              />
                            </FormControl>
                            <FormDescription>
                              Duration in minutes (e.g. 60 for 1 hour, 120 for 2 hours)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="attendanceWindowMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Attendance Window (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                              />
                            </FormControl>
                            <FormDescription>
                              Time to mark attendance after lesson starts
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {!lessonToEdit && (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Recurring Lesson</FormLabel>
                          <FormDescription>
                            Create recurring lessons across multiple weeks
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={createRecurringLessons}
                            onCheckedChange={setCreateRecurringLessons}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                    
                    {createRecurringLessons && !lessonToEdit && (
                      <div className="space-y-4 p-4 border rounded-lg">
                        <FormItem>
                          <FormLabel>Number of Weeks</FormLabel>
                          <FormControl>
                            <Input
                              type="number" 
                              min={1}
                              max={20}
                              value={numberOfWeeks}
                              onChange={(e) => setNumberOfWeeks(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormDescription>
                            How many weeks should this lesson repeat for?
                          </FormDescription>
                        </FormItem>
                        
                        <div className="space-y-2">
                          <FormLabel>Days of Week</FormLabel>
                          <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => (
                              <Button
                                key={day}
                                type="button"
                                variant={selectedDaysOfWeek.includes(index) ? "default" : "outline"}
                                className="w-full sm:flex-1 sm:min-w-20 text-xs sm:text-sm"
                                onClick={() => {
                                  if (selectedDaysOfWeek.includes(index)) {
                                    setSelectedDaysOfWeek(selectedDaysOfWeek.filter(d => d !== index));
                                  } else {
                                    setSelectedDaysOfWeek([...selectedDaysOfWeek, index]);
                                  }
                                }}
                              >
                                {day.substring(0, 3)}
                              </Button>
                            ))}
                          </div>
                          <FormDescription>
                            Select the days of the week this lesson occurs
                          </FormDescription>
                        </div>
                      </div>
                    )}
                    
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active Lesson</FormLabel>
                            <FormDescription>
                              Set to inactive to disable attendance marking.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={
                          createLessonMutation.isPending || updateLessonMutation.isPending
                        }
                      >
                        {createLessonMutation.isPending || updateLessonMutation.isPending
                          ? "Saving..."
                          : lessonToEdit
                          ? "Update Lesson"
                          : "Create Lesson"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <CardContent className="p-6">
            {lessonsLoading || classesLoading || teachersLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredLessons.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-400 mb-4">
                  {activeTab === "today"
                    ? "No lessons scheduled for today."
                    : activeTab === "upcoming"
                    ? "No upcoming lessons scheduled."
                    : activeTab === "past"
                    ? "No past lessons found."
                    : "No lessons found."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  Create a new lesson
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Subject</TableHead>
                      <TableHead className="whitespace-nowrap">Class</TableHead>
                      <TableHead className="whitespace-nowrap">Teacher</TableHead>
                      <TableHead className="whitespace-nowrap">Day of Week</TableHead>
                      <TableHead className="whitespace-nowrap">Time</TableHead>
                      <TableHead className="whitespace-nowrap">Duration</TableHead>
                      <TableHead className="whitespace-nowrap">Location</TableHead>
                      <TableHead className="whitespace-nowrap">Attendance Window</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {filteredLessons.map((lesson: any) => {
                    const now = new Date();
                    const currentDay = now.getDay();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();
                    const currentTimeMinutes = currentHour * 60 + currentMinute;
                    
                    // Calculate the end time in minutes since midnight
                    const endTimeMinutes = lesson.startTimeMinutes + (lesson.durationMinutes || 120);
                    
                    // Determine lesson status
                    let status = "Not Started";
                    let statusClass = "bg-neutral-200 text-neutral-500";
                    
                    if (lesson.dayOfWeek === currentDay) {
                      // If today is the lesson day
                      if (currentTimeMinutes > endTimeMinutes) {
                        // If current time is past the end time
                        status = "Completed";
                        statusClass = "bg-success bg-opacity-10 text-success";
                      } else if (currentTimeMinutes >= lesson.startTimeMinutes) {
                        // If current time is between start and end time
                        status = "In Progress";
                        statusClass = "bg-primary bg-opacity-10 text-primary";
                      }
                    } else if ((currentDay > lesson.dayOfWeek && currentDay !== 0) || 
                              (currentDay === 0 && lesson.dayOfWeek !== 0)) {
                      // If today is after the lesson day (considering Sunday special case)
                      status = "Completed";
                      statusClass = "bg-success bg-opacity-10 text-success";
                    }
                    
                    return (
                      <TableRow key={lesson.id}>
                        <TableCell className="font-medium">{lesson.subject}</TableCell>
                        <TableCell>
                          {classes.find((c: any) => c.id === lesson.classId)?.name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {teachers.find((t: any) => t.id === lesson.teacherId)?.fullName || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                            return days[lesson.dayOfWeek];
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const hours = Math.floor(lesson.startTimeMinutes / 60);
                            const minutes = lesson.startTimeMinutes % 60;
                            const ampm = hours >= 12 ? 'PM' : 'AM';
                            const displayHours = hours % 12 || 12;
                            return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const duration = lesson.durationMinutes || 120;
                            const hours = Math.floor(duration / 60);
                            const minutes = duration % 60;
                            return `${hours} hr${hours !== 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''}`;
                          })()}
                        </TableCell>
                        <TableCell>{lesson.location || "N/A"}</TableCell>
                        <TableCell>{lesson.attendanceWindowMinutes} min</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${statusClass}`}>
                            {status}
                          </span>
                          <br />
                          {lesson.isActive ? (
                            <span className="text-xs text-neutral-400">Active</span>
                          ) : (
                            <span className="text-xs text-error">Inactive</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-primary hover:text-primary-dark"
                              onClick={() => {
                                setLocation(`/admin/lessons?edit=${lesson.id}`);
                              }}
                            >
                              <span className="material-icons text-sm">edit</span>
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-error hover:text-error"
                                  onClick={() => handleDeleteLesson(lesson)}
                                >
                                  <span className="material-icons text-sm">delete</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the lesson "{lesson.subject}" on {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][lesson.dayOfWeek]} at {(() => {
                                      const hours = Math.floor(lesson.startTimeMinutes / 60);
                                      const minutes = lesson.startTimeMinutes % 60;
                                      const ampm = hours >= 12 ? 'PM' : 'AM';
                                      const displayHours = hours % 12 || 12;
                                      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                                    })()}.
                                    This action cannot be undone and may affect attendance records.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={confirmDeleteLesson}
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
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}