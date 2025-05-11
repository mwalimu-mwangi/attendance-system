import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Calendar, ClipboardCheck, Clock, MapPin } from "lucide-react";
import { isToday } from "date-fns";

// Helper function to format time from minutes since midnight
function formatTimeFromMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

// Helper function to check if a time has passed
function hasTimePassed(timeMinutes: number): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes > timeMinutes;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");

  // Fetch today's lessons
  const { data: todaysLessons = [], isLoading } = useQuery({
    queryKey: ["/api/lessons/today"],
    refetchInterval: 60000, // Refresh every minute to keep attendance status current
  });

  // Fetch attendance statistics
  const { data: attendanceStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/attendance/stats"],
  });

  // Mark attendance for a lesson
  const markAttendance = async (lessonId: number, status: "present") => {
    try {
      setAttendanceError("");
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId,
          studentId: user?.id,
          status,
        }),
      });

      if (response.ok) {
        setAttendanceMarked(true);
        // Refresh the lessons data after marking attendance
        setTimeout(() => {
          setSelectedLesson(null);
          setAttendanceMarked(false);
        }, 2000);
      } else {
        const errorData = await response.json();
        setAttendanceError(errorData.message || "Failed to mark attendance");
      }
    } catch (error) {
      setAttendanceError("An error occurred while marking attendance");
    }
  };

  // Check if attendance window is open for a lesson
  const isAttendanceWindowOpen = (lesson: any) => {
    if (!lesson) return false;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay(); // 0-6 for Sunday-Saturday
    
    // Lesson must be for today
    if (lesson.dayOfWeek !== currentDay) return false;
    
    // Current time must be after lesson start time
    const isAfterStart = currentMinutes >= lesson.startTimeMinutes;
    
    // Current time must be before attendance window closes
    const attendanceWindowEndMinutes = lesson.startTimeMinutes + (lesson.attendanceWindowMinutes || 15);
    const isBeforeWindowEnd = currentMinutes <= attendanceWindowEndMinutes;
    
    return isAfterStart && isBeforeWindowEnd;
  };

  // Check if a student has already marked attendance for a lesson
  const hasMarkedAttendance = (lesson: any) => {
    // This would need to check against the attendance records
    // In a real implementation, we'd fetch this data from the API
    return false; // Placeholder
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Welcome, {user?.fullName}</h1>
          <p className="text-muted-foreground">
            Track your attendance and view upcoming lessons
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Attendance Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
              <CardDescription>Your current attendance record</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Present</span>
                    <div className="flex items-center">
                      <span className="text-sm font-semibold">{attendanceStats?.presentCount || 0}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({Math.round((attendanceStats?.presentPercentage || 0) * 100)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2.5">
                    <div 
                      className="bg-primary rounded-full h-2.5" 
                      style={{ width: `${(attendanceStats?.presentPercentage || 0) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Absent</span>
                    <div className="flex items-center">
                      <span className="text-sm font-semibold">{attendanceStats?.absentCount || 0}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({Math.round((attendanceStats?.absentPercentage || 0) * 100)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2.5">
                    <div 
                      className="bg-destructive rounded-full h-2.5" 
                      style={{ width: `${(attendanceStats?.absentPercentage || 0) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Schedule Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>Lessons for {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : todaysLessons.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p>No lessons scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todaysLessons.map((lesson: any) => (
                    <div 
                      key={lesson.id} 
                      className={cn(
                        "flex flex-col md:flex-row justify-between p-4 rounded-lg border transition-colors",
                        hasMarkedAttendance(lesson) 
                          ? "border-green-200 bg-green-50"
                          : isAttendanceWindowOpen(lesson)
                            ? "border-primary bg-primary/5 hover:bg-primary/10 cursor-pointer"
                            : hasTimePassed(lesson.startTimeMinutes + lesson.durationMinutes)
                              ? "border-destructive bg-destructive/5"
                              : "border-neutral-200 bg-neutral-50"
                      )}
                      onClick={() => {
                        if (isAttendanceWindowOpen(lesson) && !hasMarkedAttendance(lesson)) {
                          setSelectedLesson(lesson);
                        }
                      }}
                    >
                      <div>
                        <h3 className="font-semibold">{lesson.subject}</h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Clock size={14} className="mr-1" />
                          <span>
                            {formatTimeFromMinutes(lesson.startTimeMinutes)} - {formatTimeFromMinutes(lesson.startTimeMinutes + lesson.durationMinutes)}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <MapPin size={14} className="mr-1" />
                          <span>{lesson.location}</span>
                        </div>
                      </div>
                      <div className="mt-4 md:mt-0 flex items-center">
                        {hasMarkedAttendance(lesson) ? (
                          <span className="text-sm font-medium text-green-600 flex items-center">
                            <ClipboardCheck size={16} className="mr-1" />
                            Attendance Marked
                          </span>
                        ) : isAttendanceWindowOpen(lesson) ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="ml-auto"
                          >
                            Mark Attendance
                          </Button>
                        ) : hasTimePassed(lesson.startTimeMinutes + lesson.durationMinutes) ? (
                          <span className="text-sm font-medium text-destructive">
                            Attendance Window Closed
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground">
                            Starts at {formatTimeFromMinutes(lesson.startTimeMinutes)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attendance Dialog */}
      <Dialog open={!!selectedLesson} onOpenChange={(open) => !open && setSelectedLesson(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
            <DialogDescription>
              Confirm your attendance for {selectedLesson?.subject}
            </DialogDescription>
          </DialogHeader>
          
          {attendanceMarked ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-green-600">Attendance Marked Successfully</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You have been marked as present for this lesson
              </p>
            </div>
          ) : (
            <>
              <div className="py-4">
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="bg-neutral-100 rounded-full p-2 mr-3 mt-0.5">
                      <Clock className="h-4 w-4 text-neutral-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Time</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedLesson && formatTimeFromMinutes(selectedLesson.startTimeMinutes)} - {selectedLesson && formatTimeFromMinutes(selectedLesson.startTimeMinutes + selectedLesson.durationMinutes)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-neutral-100 rounded-full p-2 mr-3 mt-0.5">
                      <MapPin className="h-4 w-4 text-neutral-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedLesson?.location}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {attendanceError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
                  {attendanceError}
                </div>
              )}
              
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedLesson(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => selectedLesson && markAttendance(selectedLesson.id, "present")}
                >
                  Mark as Present
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}