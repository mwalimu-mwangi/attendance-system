import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { dayOfWeekSchema } from "@shared/schema";
import { ArrowLeft, Clock, Info } from "lucide-react";

// Create form schema
const formSchema = z.object({
  classId: z.coerce.number(),
  subject: z.string().min(2, { message: "Subject must be at least 2 characters long" }),
  dayOfWeek: z.coerce.number().min(0).max(6),
  startTimeMinutes: z.coerce.number().min(0).max(24 * 60 - 1),
  durationMinutes: z.coerce.number().min(30).max(240),
  location: z.string().optional(),
  attendanceWindowMinutes: z.coerce.number().min(5).max(60).default(30),
  isActive: z.boolean().default(true),
});

export default function CreateLesson() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [startTimeHours, setStartTimeHours] = useState<number>(8);
  const [startTimeMinutes, setStartTimeMinutes] = useState<number>(0);
  
  // Get the classes the teacher can teach
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["/api/classes", user?.id],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/classes?teacherId=${user?.id}`);
        if (!res.ok) throw new Error("Failed to fetch classes");
        return res.json();
      } catch (error) {
        console.error("Error fetching classes:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Get system settings for default values
  const { data: settings } = useQuery({
    queryKey: ["/api/system-settings"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/system-settings");
        if (!res.ok) throw new Error("Failed to fetch system settings");
        return res.json();
      } catch (error) {
        console.error("Error fetching system settings:", error);
        return null;
      }
    },
  });
  
  // Set up form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      dayOfWeek: 1, // Monday
      startTimeMinutes: 8 * 60, // 8:00 AM
      durationMinutes: settings?.defaultLessonDuration || 60,
      location: "",
      attendanceWindowMinutes: settings?.defaultAttendanceWindow || 30,
      isActive: true,
    },
  });
  
  // Update startTimeMinutes when hours/minutes change
  const updateStartTimeMinutes = (hours: number, minutes: number) => {
    setStartTimeHours(hours);
    setStartTimeMinutes(minutes);
    const totalMinutes = hours * 60 + minutes;
    form.setValue("startTimeMinutes", totalMinutes);
  };

  // Create lesson mutation
  const createLessonMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/lessons", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create lesson");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lesson created",
        description: "The lesson has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons/today"] });
      navigate("/teacher/lessons");
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating lesson",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createLessonMutation.mutate(data);
  };
  
  // Day names for select
  const dayNames = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ];
  
  // Format minutes to time string (e.g. 90 -> "1:30")
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };
  
  // Generate hour options for time select (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  
  // Generate minute options (0, 15, 30, 45)
  const minuteOptions = [0, 15, 30, 45];
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Create New Lesson</h1>
            <p className="text-muted-foreground">
              Schedule a new lesson for your students
            </p>
          </div>
          
          <Button variant="outline" asChild>
            <a href="/teacher/lessons">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lessons
            </a>
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Lesson Details</CardTitle>
            <CardDescription>
              Enter the details for your new lesson
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Class Selection */}
                  <FormField
                    control={form.control}
                    name="classId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classesLoading ? (
                              <SelectItem value="loading" disabled>Loading classes...</SelectItem>
                            ) : classes.length === 0 ? (
                              <SelectItem value="none" disabled>No classes available</SelectItem>
                            ) : (
                              classes.map((cls: any) => (
                                <SelectItem key={cls.id} value={cls.id.toString()}>
                                  {cls.name} - {cls.departmentName}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the class for this lesson
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Subject */}
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Mathematics, Physics" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter the subject name for this lesson
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Day of Week */}
                  <FormField
                    control={form.control}
                    name="dayOfWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Week</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dayNames.map((day, index) => (
                              <SelectItem key={index} value={index.toString()}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the day when this lesson occurs
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Start Time */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Start Time
                      </label>
                      <p className="text-sm text-muted-foreground mt-1 mb-3">
                        Select when the lesson starts
                      </p>
                    </div>
                    
                    <div className="flex space-x-4">
                      <div className="w-1/2">
                        <Select 
                          value={startTimeHours.toString()} 
                          onValueChange={(value) => updateStartTimeMinutes(parseInt(value), startTimeMinutes)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent>
                            {hourOptions.map((hour) => (
                              <SelectItem key={hour} value={hour.toString()}>
                                {hour.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-1/2">
                        <Select 
                          value={startTimeMinutes.toString()} 
                          onValueChange={(value) => updateStartTimeMinutes(startTimeHours, parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Minute" />
                          </SelectTrigger>
                          <SelectContent>
                            {minuteOptions.map((minute) => (
                              <SelectItem key={minute} value={minute.toString()}>
                                {minute.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Duration */}
                  <FormField
                    control={form.control}
                    name="durationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <div className="space-y-2">
                          <FormControl>
                            <Slider
                              min={30}
                              max={240}
                              step={5}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                          </FormControl>
                          <div className="flex justify-between">
                            <span className="text-sm">{field.value} minutes</span>
                            <span className="text-sm">({Math.floor(field.value / 60)}:{(field.value % 60).toString().padStart(2, '0')} hours)</span>
                          </div>
                        </div>
                        <FormDescription>
                          Set the duration of the lesson
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Location */}
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Room 101, Lab 3" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter the location where the lesson will be held (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Attendance Window */}
                  <FormField
                    control={form.control}
                    name="attendanceWindowMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attendance Window (minutes)</FormLabel>
                        <div className="space-y-2">
                          <FormControl>
                            <Slider
                              min={5}
                              max={60}
                              step={5}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                          </FormControl>
                          <div className="flex justify-between">
                            <span className="text-sm">5 min</span>
                            <span className="text-sm">{field.value} minutes</span>
                            <span className="text-sm">60 min</span>
                          </div>
                        </div>
                        <FormDescription>
                          Time window for students to mark their attendance after lesson starts
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Active Status */}
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Active Lesson</FormLabel>
                          <FormDescription>
                            Enable this lesson for students to view and mark attendance
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Important Note</AlertTitle>
                  <AlertDescription>
                    This lesson will be scheduled weekly on {dayNames[form.getValues().dayOfWeek]} at {formatMinutes(form.getValues().startTimeMinutes)}.
                  </AlertDescription>
                </Alert>
                
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/teacher/lessons")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createLessonMutation.isPending}
                  >
                    {createLessonMutation.isPending ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Lesson"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}