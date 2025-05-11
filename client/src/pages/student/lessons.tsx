import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  School,
  User,
  XCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter,
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  format, 
  isToday, 
  isFuture, 
  isPast, 
  addMinutes,
  differenceInMinutes
} from "date-fns";
import { queryClient } from "@/lib/queryClient";

// Convert minutes from midnight to a formatted time string (e.g., "9:30 AM")
function formatTimeFromMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

// Calculate end time minutes based on start time and duration
function calculateEndTimeMinutes(startTimeMinutes: number, durationMinutes: number): number {
  return startTimeMinutes + durationMinutes;
}

// Helper function to check if a time has passed
function hasTimePassed(timeMinutes: number): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes > timeMinutes;
}

// Helper function to format day of week as string
function getDayOfWeekName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || '';
}

export default function StudentLessons() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("today");
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  
  // Fetch today's lessons
  const { data: todaysLessons = [], isLoading: todayLoading } = useQuery({
    queryKey: ["/api/lessons/today", user?.id],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/lessons/today?studentId=${user?.id}`);
        if (!res.ok) throw new Error("Failed to fetch today's lessons");
        return res.json();
      } catch (error) {
        console.error("Error fetching today's lessons:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });
  
  // Fetch all upcoming lessons
  const { data: allLessons = [], isLoading: allLoading } = useQuery({
    queryKey: ["/api/lessons/student", user?.id],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/lessons/student?studentId=${user?.id}`);
        if (!res.ok) throw new Error("Failed to fetch lessons");
        return res.json();
      } catch (error) {
        console.error("Error fetching lessons:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async (data: { lessonId: number; status: "present" }) => {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId: data.lessonId,
          studentId: user?.id,
          status: data.status,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to mark attendance");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Attendance Marked",
        description: "Your attendance has been recorded successfully.",
      });
      setAttendanceDialogOpen(false);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/lessons/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons/student"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper function to check if a lesson is in the future
  const isLessonInFuture = (lesson: any): boolean => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const lessonDay = lesson.dayOfWeek;
    const today = now.getDay(); // 0-6, Sunday-Saturday
    
    // If lesson is on a future day of the week
    if (lessonDay > today) return true;
    
    // If lesson is today but start time is in the future
    if (lessonDay === today && lesson.startTimeMinutes > currentMinutes) return true;
    
    return false;
  };
  
  // Helper function to check if a lesson is in the past
  const isLessonInPast = (lesson: any): boolean => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const lessonDay = lesson.dayOfWeek;
    const today = now.getDay(); // 0-6, Sunday-Saturday
    
    // If lesson is on a past day of the week
    if (lessonDay < today) return true;
    
    // If lesson is today but end time is in the past
    if (lessonDay === today && 
        (lesson.startTimeMinutes + lesson.durationMinutes) < currentMinutes) return true;
    
    return false;
  };

  // Filter and sort upcoming lessons
  const upcomingLessons = allLessons
    .filter((lesson: any) => isLessonInFuture(lesson))
    .sort((a: any, b: any) => {
      // First sort by day of week
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      // Then by start time minutes
      return a.startTimeMinutes - b.startTimeMinutes;
    });
  
  // Filter and sort past lessons
  const pastLessons = allLessons
    .filter((lesson: any) => isLessonInPast(lesson))
    .sort((a: any, b: any) => {
      // First sort by day of week (descending)
      if (a.dayOfWeek !== b.dayOfWeek) return b.dayOfWeek - a.dayOfWeek;
      // Then by start time minutes (descending)
      return b.startTimeMinutes - a.startTimeMinutes;
    });

  // Check if a student can mark attendance for a lesson
  const canMarkAttendance = (lesson: any): boolean => {
    if (!lesson) return false;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay();
    
    // Must be the same day
    if (lesson.dayOfWeek !== currentDay) return false;
    
    // Start time must be in the past or now
    const isStarted = lesson.startTimeMinutes <= currentMinutes;
    
    // End of attendance window
    const attendanceWindowEndMinutes = lesson.startTimeMinutes + (lesson.attendanceWindowMinutes || 15);
    const isBeforeWindowEnd = currentMinutes <= attendanceWindowEndMinutes;
    
    // Check if attendance is not yet marked
    const isNotMarked = !lesson.attendance;
    
    return isStarted && isBeforeWindowEnd && isNotMarked;
  };

  // Calculate remaining time for attendance window
  const getRemainingTime = (lesson: any): string => {
    if (!lesson) return "No lesson";
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay();
    
    // Must be the same day
    if (lesson.dayOfWeek !== currentDay) return "Different day";
    
    if (currentMinutes < lesson.startTimeMinutes) {
      return "Not yet started";
    }
    
    // End of attendance window
    const attendanceWindowEndMinutes = lesson.startTimeMinutes + (lesson.attendanceWindowMinutes || 15);
    
    if (currentMinutes > attendanceWindowEndMinutes) {
      return "Window closed";
    }
    
    const remainingMinutes = attendanceWindowEndMinutes - currentMinutes;
    return `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} remaining`;
  };

  // Mark attendance
  const handleMarkAttendance = () => {
    if (!selectedLesson) return;
    
    markAttendanceMutation.mutate({
      lessonId: selectedLesson.id,
      status: "present",
    });
  };

  const isLoading = todayLoading || allLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">My Lessons</h1>
          <p className="text-muted-foreground">
            View your schedule and mark your attendance
          </p>
        </div>
        
        <Tabs defaultValue="today" value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
          
          <TabsContent value="today">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : todaysLessons.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-center mb-1">No lessons today</p>
                  <p className="text-muted-foreground text-center mb-6">
                    You don't have any lessons scheduled for today
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {todaysLessons.map((lesson: any) => (
                  <Card key={lesson.id} className="overflow-hidden">
                    <div className={
                      lesson.attendance
                        ? "bg-green-50 border-l-4 border-green-500"
                        : hasTimePassed(lesson.startTimeMinutes + lesson.durationMinutes)
                          ? "bg-red-50 border-l-4 border-red-500"
                          : canMarkAttendance(lesson)
                            ? "bg-primary/5 border-l-4 border-primary"
                            : "bg-white"
                    }>
                      <CardHeader className="pb-2">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <CardTitle>{lesson.subject}</CardTitle>
                            <CardDescription>
                              {lesson.className} • {lesson.departmentName}
                            </CardDescription>
                          </div>
                          
                          <div className="flex items-center">
                            {lesson.attendance ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                Present
                              </Badge>
                            ) : hasTimePassed(lesson.startTimeMinutes + lesson.durationMinutes) ? (
                              <Badge className="bg-red-100 text-red-800">
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                Absent
                              </Badge>
                            ) : canMarkAttendance(lesson) ? (
                              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                                <AlertCircle className="mr-1 h-3.5 w-3.5" />
                                Mark Attendance
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Clock className="mr-1 h-3.5 w-3.5" />
                                {formatTimeFromMinutes(lesson.startTimeMinutes)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-start">
                            <Clock className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Time</p>
                              <p className="text-sm text-muted-foreground">
                                {formatTimeFromMinutes(lesson.startTimeMinutes)} - {formatTimeFromMinutes(lesson.startTimeMinutes + lesson.durationMinutes)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Location</p>
                              <p className="text-sm text-muted-foreground">
                                {lesson.location || "No location specified"}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <User className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Teacher</p>
                              <p className="text-sm text-muted-foreground">
                                {lesson.teacherName}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        {canMarkAttendance(lesson) ? (
                          <div className="w-full flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                            <div className="flex items-center text-amber-600">
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              <span className="text-sm font-medium">
                                Attendance window: {getRemainingTime(lesson)}
                              </span>
                            </div>
                            <Button 
                              onClick={() => {
                                setSelectedLesson(lesson);
                                setAttendanceDialogOpen(true);
                              }}
                            >
                              Mark Present
                            </Button>
                          </div>
                        ) : lesson.attendance ? (
                          <div className="w-full flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                            <div className="flex items-center text-green-600">
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              <span className="text-sm font-medium">
                                You marked present at {lesson.attendance.markedAtTime || '--:--'}
                              </span>
                            </div>
                            <Button variant="outline" disabled>
                              Already Marked
                            </Button>
                          </div>
                        ) : hasTimePassed(lesson.startTimeMinutes + lesson.durationMinutes) ? (
                          <div className="w-full flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                            <div className="flex items-center text-red-600">
                              <XCircle className="h-4 w-4 mr-2" />
                              <span className="text-sm font-medium">
                                Attendance window closed
                              </span>
                            </div>
                            <Button variant="outline" disabled>
                              Missed
                            </Button>
                          </div>
                        ) : (
                          <div className="w-full flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                Attendance opens at {formatTimeFromMinutes(lesson.startTimeMinutes)}
                              </span>
                            </div>
                            <Button variant="outline" disabled>
                              Not Yet Available
                            </Button>
                          </div>
                        )}
                      </CardFooter>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="upcoming">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : upcomingLessons.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-center mb-1">No upcoming lessons</p>
                  <p className="text-muted-foreground text-center mb-6">
                    You don't have any lessons scheduled in the future
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Lessons</CardTitle>
                  <CardDescription>
                    Your scheduled lessons for the coming days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Teacher</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingLessons.map((lesson: any) => (
                        <TableRow key={lesson.id}>
                          <TableCell>
                            <div className="font-medium">
                              {getDayOfWeekName(lesson.dayOfWeek)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatTimeFromMinutes(lesson.startTimeMinutes)} - {formatTimeFromMinutes(lesson.startTimeMinutes + lesson.durationMinutes)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{lesson.subject}</div>
                            <div className="text-sm text-muted-foreground">
                              {lesson.className}
                            </div>
                          </TableCell>
                          <TableCell>
                            {lesson.location || "Not specified"}
                          </TableCell>
                          <TableCell>
                            {lesson.teacherName}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="past">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : pastLessons.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-center mb-1">No past lessons</p>
                  <p className="text-muted-foreground text-center mb-6">
                    Your past lesson history will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Past Lessons</CardTitle>
                  <CardDescription>
                    Your previously attended lessons
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastLessons.map((lesson: any) => (
                        <TableRow key={lesson.id}>
                          <TableCell>
                            <div className="font-medium">
                              {getDayOfWeekName(lesson.dayOfWeek)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatTimeFromMinutes(lesson.startTimeMinutes)} - {formatTimeFromMinutes(lesson.startTimeMinutes + lesson.durationMinutes)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{lesson.subject}</div>
                            <div className="text-sm text-muted-foreground">
                              {lesson.className}
                            </div>
                          </TableCell>
                          <TableCell>
                            {lesson.teacherName}
                          </TableCell>
                          <TableCell>
                            {lesson.attendance ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                Present
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                Absent
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Mark Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
            <DialogDescription>
              Confirm your presence in this lesson
            </DialogDescription>
          </DialogHeader>
          
          {selectedLesson && (
            <div className="space-y-4 py-2">
              <div className="flex items-start">
                <Calendar className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Subject</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLesson.subject}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Clock className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Time</p>
                  <p className="text-sm text-muted-foreground">
                    {formatTimeFromMinutes(selectedLesson.startTimeMinutes)} - {formatTimeFromMinutes(selectedLesson.startTimeMinutes + selectedLesson.durationMinutes)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLesson.location || "No location specified"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <User className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Teacher</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLesson.teacherName}
                  </p>
                </div>
              </div>
              
              <div className="bg-amber-50 p-3 rounded-md border border-amber-200 flex items-center">
                <AlertTriangle className="h-4 w-4 text-amber-600 mr-2 shrink-0" />
                <p className="text-sm text-amber-800">
                  By confirming, you're certifying that you are physically present in this class.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAttendanceDialogOpen(false)}
              disabled={markAttendanceMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleMarkAttendance}
              disabled={markAttendanceMutation.isPending}
            >
              {markAttendanceMutation.isPending ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                  Processing...
                </>
              ) : (
                "Confirm Attendance"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}