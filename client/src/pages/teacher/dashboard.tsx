import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ClipboardCheck, 
  FileBarChart, 
  MapPin, 
  Users, 
  XCircle 
} from "lucide-react";

// Helper function to format time from minutes since midnight
function formatTimeFromMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [attendanceTab, setAttendanceTab] = useState("present");

  // Fetch today's lessons
  const { data: todaysLessons = [], isLoading } = useQuery({
    queryKey: ["/api/lessons/today"],
  });

  // Fetch attendance stats
  const { data: attendanceStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/attendance/stats", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/stats?teacherId=${user?.id}`);
      if (!res.ok) throw new Error("Failed to fetch attendance statistics");
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Fetch attendance for a specific lesson
  const { 
    data: attendanceData = { present: [], absent: [] }, 
    isLoading: attendanceLoading,
    refetch: refetchAttendance 
  } = useQuery({
    queryKey: ["/api/attendance", selectedLesson?.id],
    queryFn: async () => {
      if (!selectedLesson) return { present: [], absent: [] };
      const res = await fetch(`/api/attendance?lessonId=${selectedLesson.id}`);
      if (!res.ok) throw new Error("Failed to fetch attendance records");
      
      const attendanceRecords = await res.json();
      
      // Split records by status
      const present = attendanceRecords.filter((record: any) => record.status === "present");
      const absent = attendanceRecords.filter((record: any) => record.status === "absent");
      
      return { present, absent };
    },
    enabled: !!selectedLesson,
  });

  // Mark student as present
  const markAttendance = async (studentId: number, status: "present" | "absent") => {
    if (!selectedLesson) return;
    
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          studentId,
          status,
        }),
      });

      if (response.ok) {
        // Refresh attendance data
        refetchAttendance();
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Welcome, {user?.fullName}</h1>
          <p className="text-muted-foreground">
            Manage your classes and track student attendance
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Summary Cards */}
          <Card className="col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Today's Lessons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? (
                  <div className="animate-pulse bg-neutral-100 h-9 w-16 rounded"></div>
                ) : (
                  todaysLessons.length
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {todaysLessons.length === 1 
                  ? "lesson scheduled today" 
                  : "lessons scheduled today"}
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Student Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="animate-pulse bg-neutral-100 h-9 w-16 rounded"></div>
              ) : (
                <>
                  <div className="text-3xl font-bold">
                    {Math.round((attendanceStats?.overallAttendanceRate || 0) * 100)}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    average attendance rate
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Students</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="animate-pulse bg-neutral-100 h-9 w-16 rounded"></div>
              ) : (
                <>
                  <div className="text-3xl font-bold">
                    {attendanceStats?.totalStudents || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    in your classes
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Today's Schedule Card */}
          <Card className="col-span-3">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Today's Schedule</CardTitle>
                  <CardDescription>
                    Your lessons for {new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="/teacher/lessons">
                    View All Lessons
                  </a>
                </Button>
              </div>
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
                      className="flex flex-col md:flex-row justify-between p-4 rounded-lg border border-neutral-200 transition-colors hover:bg-neutral-50 cursor-pointer"
                      onClick={() => setSelectedLesson(lesson)}
                    >
                      <div>
                        <h3 className="font-semibold">{lesson.subject}</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center">
                            <Clock size={14} className="mr-1" />
                            <span>
                              {formatTimeFromMinutes(lesson.startTimeMinutes)} - {formatTimeFromMinutes(lesson.startTimeMinutes + lesson.durationMinutes)}
                            </span>
                          </div>
                          
                          <div className="flex items-center">
                            <MapPin size={14} className="mr-1" />
                            <span>{lesson.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center mt-4 md:mt-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="ml-auto"
                        >
                          <Users size={14} className="mr-2" />
                          Take Attendance
                        </Button>
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
      <Dialog 
        open={!!selectedLesson} 
        onOpenChange={(open) => !open && setSelectedLesson(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Attendance for {selectedLesson?.subject}</DialogTitle>
            <DialogDescription>
              {selectedLesson && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                  <div className="flex items-center">
                    <Clock size={14} className="mr-1" />
                    <span>
                      {formatTimeFromMinutes(selectedLesson.startTimeMinutes)} - {formatTimeFromMinutes(selectedLesson.startTimeMinutes + selectedLesson.durationMinutes)}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <MapPin size={14} className="mr-1" />
                    <span>{selectedLesson.location}</span>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {attendanceLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              <Tabs defaultValue="present" value={attendanceTab} onValueChange={setAttendanceTab}>
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="present">
                      Present <Badge variant="outline" className="ml-2">{attendanceData.present.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="absent">
                      Absent <Badge variant="outline" className="ml-2">{attendanceData.absent.length}</Badge>
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="flex items-center">
                    <FileBarChart size={16} className="mr-2" />
                    <span className="text-sm text-muted-foreground">
                      {Math.round((attendanceData.present.length / 
                        (attendanceData.present.length + attendanceData.absent.length || 1)) * 100)}% Present
                    </span>
                  </div>
                </div>
                
                <TabsContent value="present" className="mt-4">
                  {attendanceData.present.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p>No students marked as present yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {attendanceData.present.map((record: any) => (
                        <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50">
                          <div className="flex items-center">
                            <div className="bg-green-100 rounded-full p-2 mr-3">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">{record.student?.fullName || `Student #${record.studentId}`}</p>
                              <p className="text-xs text-muted-foreground">
                                Marked at {new Date(record.markedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => markAttendance(record.studentId, "absent")}
                          >
                            <XCircle size={16} className="mr-1 text-red-500" />
                            Mark Absent
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="absent" className="mt-4">
                  {attendanceData.absent.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      <XCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p>No students marked as absent</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {attendanceData.absent.map((record: any) => (
                        <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50">
                          <div className="flex items-center">
                            <div className="bg-red-100 rounded-full p-2 mr-3">
                              <XCircle className="h-4 w-4 text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium">{record.student?.fullName || `Student #${record.studentId}`}</p>
                              <p className="text-xs text-muted-foreground">
                                Marked at {new Date(record.markedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => markAttendance(record.studentId, "present")}
                          >
                            <CheckCircle2 size={16} className="mr-1 text-green-500" />
                            Mark Present
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="sm:justify-between mt-4">
                <Button variant="outline" onClick={() => setSelectedLesson(null)}>
                  Close
                </Button>
                <Button variant="default" asChild>
                  <a href={`/teacher/attendance-records?lessonId=${selectedLesson?.id}`}>
                    <FileBarChart size={16} className="mr-2" />
                    View Detailed Report
                  </a>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}