import { useState, useEffect } from "react";

// Helper function to format time from minutes since midnight
function formatTimeFromMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Save,
  Search,
  User,
  Users,
  XCircle
} from "lucide-react";

export default function BulkAttendance() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [lessonId, setLessonId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceData, setAttendanceData] = useState<{ [studentId: number]: "present" | "absent" }>({});
  const [forceAttendance, setForceAttendance] = useState(false);
  
  // Get lessonId from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    const id = params.get("lessonId");
    if (id) setLessonId(parseInt(id));
  }, [location]);

  // Fetch lesson details
  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ["/api/lessons", lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      try {
        const res = await fetch(`/api/lessons/${lessonId}`);
        if (!res.ok) throw new Error("Failed to fetch lesson details");
        return res.json();
      } catch (error) {
        console.error("Error fetching lesson:", error);
        return null;
      }
    },
    enabled: !!lessonId,
  });

  // Fetch attendance records for the lesson
  const { data: attendanceRecords = [], isLoading: attendanceLoading, refetch: refetchAttendance } = useQuery({
    queryKey: ["/api/attendance", lessonId],
    queryFn: async () => {
      if (!lessonId) return [];
      try {
        const res = await fetch(`/api/attendance?lessonId=${lessonId}`);
        if (!res.ok) throw new Error("Failed to fetch attendance records");
        return res.json();
      } catch (error) {
        console.error("Error fetching attendance:", error);
        return [];
      }
    },
    enabled: !!lessonId,
  });

  // Fetch all students for the class
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["/api/students", lesson?.classId],
    queryFn: async () => {
      if (!lesson?.classId) return [];
      try {
        const res = await fetch(`/api/students?classId=${lesson.classId}`);
        if (!res.ok) throw new Error("Failed to fetch students");
        return res.json();
      } catch (error) {
        console.error("Error fetching students:", error);
        return [];
      }
    },
    enabled: !!lesson?.classId,
  });

  // Initialize attendance data from existing records
  useEffect(() => {
    if (attendanceRecords.length > 0 && students.length > 0) {
      const initialData: { [studentId: number]: "present" | "absent" } = {};
      
      students.forEach((student: any) => {
        const record = attendanceRecords.find((r: any) => r.studentId === student.id);
        if (record) {
          initialData[student.id] = record.status;
        }
      });
      
      setAttendanceData(initialData);
    }
  }, [attendanceRecords, students]);

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async ({ studentId, status }: { studentId: number; status: "present" | "absent" }) => {
      if (!lessonId) throw new Error("No lesson selected");
      
      // Add force parameter to URL if force attendance option is checked
      const url = forceAttendance 
        ? `/api/attendance?force=true`
        : `/api/attendance`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, studentId, status }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to mark attendance");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance", lessonId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save all attendance records
  const saveAllAttendance = async () => {
    try {
      // Track successful and failed operations
      let successful = 0;
      let failed = 0;
      
      // Process each student
      for (const studentId in attendanceData) {
        try {
          await markAttendanceMutation.mutateAsync({
            studentId: parseInt(studentId),
            status: attendanceData[parseInt(studentId)],
          });
          successful++;
        } catch (error) {
          failed++;
          console.error(`Failed to mark attendance for student ${studentId}:`, error);
        }
      }
      
      // Refresh attendance data
      refetchAttendance();
      
      // Show toast with results
      toast({
        title: "Attendance Saved",
        description: `Successfully marked ${successful} students${failed > 0 ? `, failed for ${failed} students` : ''}`,
        variant: successful > 0 && failed === 0 ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast({
        title: "Error",
        description: "Failed to save attendance records",
        variant: "destructive",
      });
    }
  };

  // Toggle a student's attendance status
  const toggleAttendance = (studentId: number, status: "present" | "absent") => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Filter students by search term
  const filteredStudents = students.filter((student: any) => {
    const fullName = student.fullName.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search);
  });

  // Calculate attendance statistics
  const markedCount = Object.keys(attendanceData).length;
  const presentCount = Object.values(attendanceData).filter(status => status === "present").length;
  const absentCount = Object.values(attendanceData).filter(status => status === "absent").length;
  const unmarkedCount = students.length - markedCount;

  // Loading state
  const isLoading = lessonLoading || attendanceLoading || studentsLoading;

  // Helper function to calculate the lesson date
  const calculateLessonDate = (lesson: any) => {
    if (!lesson) return null;
    
    // Calculate next occurrence based on dayOfWeek
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0-6, 0 is Sunday
    const daysUntilNext = (lesson.dayOfWeek - currentDayOfWeek + 7) % 7;
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + daysUntilNext);
    
    // Clear time portion and return date only
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
  };

  // Calculate lesson date information
  const lessonDate = lesson ? calculateLessonDate(lesson) : null;
  const isLessonToday = lessonDate ? new Date().toDateString() === lessonDate.toDateString() : false;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate("/teacher/lessons")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold mb-1">Bulk Attendance</h1>
              <p className="text-muted-foreground">
                Mark attendance for all students in the class
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2 mr-2">
              <Checkbox 
                id="force-attendance" 
                checked={forceAttendance}
                onCheckedChange={(checked) => setForceAttendance(checked === true)}
              />
              <label
                htmlFor="force-attendance"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Override attendance window
              </label>
            </div>
            <Button 
              variant="default" 
              onClick={saveAllAttendance} 
              disabled={isLoading || markAttendanceMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save All
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : !lesson ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-center mb-1">No lesson selected</p>
              <p className="text-muted-foreground text-center mb-6">
                Please select a lesson to mark attendance
              </p>
              <Button asChild>
                <a href="/teacher/lessons">
                  View Lessons
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Lesson Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>{lesson.subject}</CardTitle>
                <CardDescription>
                  {lesson.className} • {lessonDate ? lessonDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : "Date not available"}
                  {isLessonToday && (
                    <Badge variant="outline" className="ml-2">Today</Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-start">
                    <div className="bg-neutral-100 rounded-full p-2 mr-3">
                      <Clock className="h-4 w-4 text-neutral-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Time</p>
                      <p className="text-sm text-muted-foreground">
                        {lesson.startTimeMinutes !== undefined ? (
                          `${formatTimeFromMinutes(lesson.startTimeMinutes)} - ${formatTimeFromMinutes(lesson.startTimeMinutes + lesson.durationMinutes)}`
                        ) : (
                          "Time not available"
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-neutral-100 rounded-full p-2 mr-3">
                      <MapPin className="h-4 w-4 text-neutral-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {lesson.location || "No location specified"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-neutral-100 rounded-full p-2 mr-3">
                      <Users className="h-4 w-4 text-neutral-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Students</p>
                      <p className="text-sm text-muted-foreground">
                        {students.length} enrolled • {presentCount} present • {absentCount} absent
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Sheet */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Attendance Sheet</CardTitle>
                    <CardDescription>
                      Mark attendance for all students in {lesson.className}
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search students..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-1">No students found</p>
                    <p>There are no students registered in this class</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-1">No matching students</p>
                    <p>Try a different search term</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline">
                          {students.length} Students
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">
                          {presentCount} Present
                        </Badge>
                        <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-100">
                          {absentCount} Absent
                        </Badge>
                        <Badge variant="outline">
                          {unmarkedCount} Unmarked
                        </Badge>
                      </div>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead className="text-center">Present</TableHead>
                          <TableHead className="text-center">Absent</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student: any) => {
                          const status = attendanceData[student.id];
                          
                          return (
                            <TableRow key={student.id}>
                              <TableCell>
                                <div className="flex items-center justify-center">
                                  <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{student.fullName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {student.username}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center">
                                  <Checkbox
                                    checked={status === "present"}
                                    onCheckedChange={() => toggleAttendance(student.id, "present")}
                                    className="h-5 w-5 border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:text-white"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center">
                                  <Checkbox
                                    checked={status === "absent"}
                                    onCheckedChange={() => toggleAttendance(student.id, "absent")}
                                    className="h-5 w-5 border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:text-white"
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                {status === "present" ? (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                    Present
                                  </Badge>
                                ) : status === "absent" ? (
                                  <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                    Absent
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">
                                    Not Marked
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    
                    <div className="mt-6">
                      <Button 
                        onClick={saveAllAttendance} 
                        disabled={isLoading || markAttendanceMutation.isPending}
                        className="w-full sm:w-auto"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save All Attendance Records
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}