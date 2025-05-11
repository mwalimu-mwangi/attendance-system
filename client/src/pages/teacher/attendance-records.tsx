import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { 
  Book,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileDown,
  MapPin,
  School,
  User,
  Users,
  XCircle
} from "lucide-react";
import { format } from "date-fns";

export default function TeacherAttendanceRecords() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [lessonId, setLessonId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [markDialogOpen, setMarkDialogOpen] = useState(false);
  
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

  // Mark attendance
  const markAttendance = async (studentId: number, status: "present" | "absent") => {
    if (!lessonId) return;
    
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId,
          studentId,
          status,
        }),
      });

      if (response.ok) {
        // Refresh attendance data
        refetchAttendance();
        setMarkDialogOpen(false);
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
    }
  };

  // Group students by attendance status
  const presentStudents = students.filter((student: any) => 
    attendanceRecords.some((record: any) => 
      record.studentId === student.id && record.status === "present"
    )
  );
  
  const absentStudents = students.filter((student: any) => 
    attendanceRecords.some((record: any) => 
      record.studentId === student.id && record.status === "absent"
    )
  );
  
  const unmarkedStudents = students.filter((student: any) => 
    !attendanceRecords.some((record: any) => record.studentId === student.id)
  );

  // Export attendance as CSV
  const exportAttendance = () => {
    if (!lesson || !students.length) return;
    
    // Create CSV content
    const headers = ["Student ID", "Student Name", "Status", "Marked At"];
    const rows = students.map((student: any) => {
      const record = attendanceRecords.find((r: any) => r.studentId === student.id);
      return [
        student.id,
        student.fullName,
        record ? record.status : "Not marked",
        record ? format(new Date(record.markedAt), "yyyy-MM-dd HH:mm:ss") : "",
      ].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    
    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_${lesson.subject}_${lesson.dayOfWeek || "unknown-day"}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = lessonLoading || attendanceLoading || studentsLoading;
  const attendanceRate = students.length 
    ? presentStudents.length / students.length 
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-1">Attendance Records</h1>
          <p className="text-muted-foreground">
            {lesson ? (
              `Manage attendance for ${lesson.subject}`
            ) : (
              "View and manage attendance records"
            )}
          </p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : !lesson ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Book className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-center mb-1">No lesson selected</p>
              <p className="text-muted-foreground text-center mb-6">
                Please select a lesson to view its attendance records
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
                  {lesson.className} • {lesson.dayOfWeek || "Unknown day"}
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
                        {lesson.startTimeMinutes !== undefined 
                          ? `${Math.floor(lesson.startTimeMinutes / 60)}:${(lesson.startTimeMinutes % 60).toString().padStart(2, '0')}`
                          : "N/A"} 
                        - 
                        {lesson.durationMinutes 
                          ? `${Math.floor((lesson.startTimeMinutes + lesson.durationMinutes) / 60)}:${((lesson.startTimeMinutes + lesson.durationMinutes) % 60).toString().padStart(2, '0')}`
                          : "N/A"}
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
                        {students.length} enrolled • {presentStudents.length} present • {absentStudents.length} absent
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Attendance Summary */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Attendance Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {Math.round(attendanceRate * 100)}%
                  </div>
                  <div className="w-full mt-2 bg-neutral-100 rounded-full h-2.5">
                    <div 
                      className="bg-primary rounded-full h-2.5" 
                      style={{ width: `${attendanceRate * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {presentStudents.length} out of {students.length} students present
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                        <span className="text-sm">Present</span>
                      </div>
                      <span className="text-sm font-medium">{presentStudents.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                        <span className="text-sm">Absent</span>
                      </div>
                      <span className="text-sm font-medium">{absentStudents.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-neutral-300 mr-2"></div>
                        <span className="text-sm">Not Marked</span>
                      </div>
                      <span className="text-sm font-medium">{unmarkedStudents.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {unmarkedStudents.length > 0 && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => {
                          setSelectedStudent(unmarkedStudents[0]);
                          setMarkDialogOpen(true);
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark Next Student
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={exportAttendance}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Export Attendance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Attendance List */}
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">
                  All Students <Badge variant="outline" className="ml-2">{students.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="present">
                  Present <Badge variant="outline" className="ml-2">{presentStudents.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="absent">
                  Absent <Badge variant="outline" className="ml-2">{absentStudents.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="unmarked">
                  Not Marked <Badge variant="outline" className="ml-2">{unmarkedStudents.length}</Badge>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>All Students</CardTitle>
                    <CardDescription>
                      Complete attendance record for this lesson
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Marked At</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student: any) => {
                          const record = attendanceRecords.find(
                            (r: any) => r.studentId === student.id
                          );
                          
                          return (
                            <TableRow key={student.id}>
                              <TableCell>
                                <div className="font-medium">{student.fullName}</div>
                              </TableCell>
                              <TableCell>
                                {record ? (
                                  record.status === "present" ? (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                      Present
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
                                      Absent
                                    </Badge>
                                  )
                                ) : (
                                  <Badge variant="outline">Not Marked</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {record && record.markedAt && !isNaN(new Date(record.markedAt).getTime()) ? (
                                  format(new Date(record.markedAt), "h:mm a")
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setMarkDialogOpen(true);
                                  }}
                                >
                                  {record ? "Update" : "Mark"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="present" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Present Students</CardTitle>
                    <CardDescription>
                      Students marked as present for this lesson
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {presentStudents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p>No students have been marked as present</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Marked At</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {presentStudents.map((student: any) => {
                            const record = attendanceRecords.find(
                              (r: any) => r.studentId === student.id
                            );
                            
                            return (
                              <TableRow key={student.id}>
                                <TableCell>
                                  <div className="font-medium">{student.fullName}</div>
                                </TableCell>
                                <TableCell>
                                  {record && format(new Date(record.markedAt), "h:mm a")}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedStudent(student);
                                      setMarkDialogOpen(true);
                                    }}
                                  >
                                    Update
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="absent" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Absent Students</CardTitle>
                    <CardDescription>
                      Students marked as absent for this lesson
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {absentStudents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <XCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p>No students have been marked as absent</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Marked At</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {absentStudents.map((student: any) => {
                            const record = attendanceRecords.find(
                              (r: any) => r.studentId === student.id
                            );
                            
                            return (
                              <TableRow key={student.id}>
                                <TableCell>
                                  <div className="font-medium">{student.fullName}</div>
                                </TableCell>
                                <TableCell>
                                  {record && format(new Date(record.markedAt), "h:mm a")}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedStudent(student);
                                      setMarkDialogOpen(true);
                                    }}
                                  >
                                    Update
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="unmarked" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Unmarked Students</CardTitle>
                    <CardDescription>
                      Students with no attendance record for this lesson
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {unmarkedStudents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p>All students have been marked for this lesson</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {unmarkedStudents.map((student: any) => (
                            <TableRow key={student.id}>
                              <TableCell>
                                <div className="font-medium">{student.fullName}</div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setMarkDialogOpen(true);
                                  }}
                                >
                                  Mark
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
      
      {/* Mark Attendance Dialog */}
      <Dialog open={markDialogOpen} onOpenChange={setMarkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
            <DialogDescription>
              Update attendance status for {selectedStudent?.fullName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center mb-4">
              <User className="h-10 w-10 p-2 bg-neutral-100 rounded-full mr-3" />
              <div>
                <p className="font-medium">{selectedStudent?.fullName}</p>
                <p className="text-sm text-muted-foreground">
                  Student ID: {selectedStudent?.id}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="bg-neutral-100 rounded-full p-2 mr-3 mt-0.5">
                  <Book className="h-4 w-4 text-neutral-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Lesson</p>
                  <p className="text-sm text-muted-foreground">
                    {lesson?.subject}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-neutral-100 rounded-full p-2 mr-3 mt-0.5">
                  <CalendarDays className="h-4 w-4 text-neutral-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">
                    {lesson && format(new Date(lesson.startTime), "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-neutral-100 rounded-full p-2 mr-3 mt-0.5">
                  <Clock className="h-4 w-4 text-neutral-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Time</p>
                  <p className="text-sm text-muted-foreground">
                    {lesson && (
                      `${format(new Date(lesson.startTime), "h:mm a")} - ${format(new Date(lesson.endTime), "h:mm a")}`
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => markAttendance(selectedStudent.id, "absent")}
            >
              <XCircle className="mr-2 h-4 w-4 text-red-500" />
              Mark as Absent
            </Button>
            <Button
              className="flex-1"
              onClick={() => markAttendance(selectedStudent.id, "present")}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark as Present
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}