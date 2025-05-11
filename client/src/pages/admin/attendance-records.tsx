import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminAttendanceRecords() {
  const { toast } = useToast();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const itemsPerPage = 10;

  // Fetch departments
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await fetch("/api/departments");
      if (!response.ok) throw new Error("Failed to fetch departments");
      return response.json();
    },
  });

  // Fetch classes based on selected department
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["/api/classes", selectedDepartment],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      const response = await fetch(`/api/classes?departmentId=${selectedDepartment}`);
      if (!response.ok) throw new Error("Failed to fetch classes");
      return response.json();
    },
    enabled: !!selectedDepartment,
  });

  // Fetch lessons based on selected class
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["/api/lessons", selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const response = await fetch(`/api/lessons?classId=${selectedClass}`);
      if (!response.ok) throw new Error("Failed to fetch lessons");
      return response.json();
    },
    enabled: !!selectedClass,
  });

  // Fetch attendance records based on filters
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ["/api/attendance", selectedLesson, selectedDay, searchQuery],
    queryFn: async () => {
      let url = "/api/attendance";
      const params = new URLSearchParams();
      
      if (selectedLesson) {
        params.append("lessonId", selectedLesson);
      }
      
      if (selectedDay) {
        params.append("dayOfWeek", selectedDay);
      }
      
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch attendance records");
      return response.json();
    },
    enabled: !!selectedLesson || !!selectedDay || !!searchQuery,
  });

  // Update attendance mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/attendance", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = (record: any) => {
    setSelectedRecord(record);
    setIsViewDetailsOpen(true);
  };

  const handleUpdateAttendance = (studentId: number, lessonId: number, status: string) => {
    updateAttendanceMutation.mutate({
      studentId,
      lessonId,
      status,
    });
  };

  // Pagination logic
  const totalPages = Math.ceil(attendanceRecords.length / itemsPerPage);
  const paginatedRecords = attendanceRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const clearFilters = () => {
    setSelectedDepartment("");
    setSelectedClass("");
    setSelectedLesson("");
    setSelectedDay("");
    setSearchQuery("");
  };

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-neutral-500 mb-2">Attendance Records</h2>
          <p className="text-neutral-300">View and manage attendance records across the system</p>
        </div>
        
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Department</label>
                <Select
                  value={selectedDepartment}
                  onValueChange={(value) => {
                    setSelectedDepartment(value);
                    setSelectedClass("");
                    setSelectedLesson("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-departments">All Departments</SelectItem>
                    {departments.map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Class</label>
                <Select
                  value={selectedClass}
                  onValueChange={(value) => {
                    setSelectedClass(value);
                    setSelectedLesson("");
                  }}
                  disabled={!selectedDepartment || classesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedDepartment 
                        ? "Select a department first" 
                        : classesLoading 
                        ? "Loading classes..." 
                        : "All Classes"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-classes">All Classes</SelectItem>
                    {classes.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Lesson</label>
                <Select
                  value={selectedLesson}
                  onValueChange={setSelectedLesson}
                  disabled={!selectedClass || lessonsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedClass 
                        ? "Select a class first" 
                        : lessonsLoading 
                        ? "Loading lessons..." 
                        : "All Lessons"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-lessons">All Lessons</SelectItem>
                    {lessons.map((lesson: any) => (
                      <SelectItem key={lesson.id} value={lesson.id.toString()}>
                        {lesson.subject} - {lesson.dayOfWeek || "Unknown day"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Day of Week</label>
                <Select
                  value={selectedDay}
                  onValueChange={setSelectedDay}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All days</SelectItem>
                    <SelectItem value="Monday">Monday</SelectItem>
                    <SelectItem value="Tuesday">Tuesday</SelectItem>
                    <SelectItem value="Wednesday">Wednesday</SelectItem>
                    <SelectItem value="Thursday">Thursday</SelectItem>
                    <SelectItem value="Friday">Friday</SelectItem>
                    <SelectItem value="Saturday">Saturday</SelectItem>
                    <SelectItem value="Sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Search Student</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    placeholder="Search by name or ID"
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <div className="px-6 py-4 border-b border-neutral-200">
            <h3 className="text-lg font-medium text-neutral-500">Attendance Records</h3>
          </div>
          <CardContent className="p-6">
            {!selectedLesson && !selectedDay && !searchQuery ? (
              <p className="text-center py-8 text-neutral-400">
                Please select at least one filter to view attendance records.
              </p>
            ) : attendanceLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : paginatedRecords.length === 0 ? (
              <p className="text-center py-8 text-neutral-400">
                No attendance records found for the selected filters.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Marked At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecords.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.studentName}</TableCell>
                        <TableCell>{record.className}</TableCell>
                        <TableCell>{record.subject}</TableCell>
                        <TableCell>{record.dayOfWeek || "Unknown day"}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              record.status === "present"
                                ? "bg-success bg-opacity-10 text-success"
                                : "bg-error bg-opacity-10 text-error"
                            }`}
                          >
                            {record.status === "present" ? "Present" : "Absent"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {record.markedAt && !isNaN(new Date(record.markedAt).getTime())
                            ? format(new Date(record.markedAt), "h:mm a")
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(record)}
                            >
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={record.status === "present" ? "text-error" : "text-success"}
                              onClick={() =>
                                handleUpdateAttendance(
                                  record.studentId,
                                  record.lessonId,
                                  record.status === "present" ? "absent" : "present"
                                )
                              }
                            >
                              Mark {record.status === "present" ? "Absent" : "Present"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {totalPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={currentPage === page}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Attendance Details</DialogTitle>
            <DialogDescription>
              Detailed information about this attendance record
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-neutral-400">Student</p>
                  <p className="font-medium">{selectedRecord.studentName}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Status</p>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      selectedRecord.status === "present"
                        ? "bg-success bg-opacity-10 text-success"
                        : "bg-error bg-opacity-10 text-error"
                    }`}
                  >
                    {selectedRecord.status === "present" ? "Present" : "Absent"}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-neutral-400">Class</p>
                  <p className="font-medium">{selectedRecord.className}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Subject</p>
                  <p className="font-medium">{selectedRecord.subject}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-neutral-400">Day</p>
                  <p className="font-medium">
                    {selectedRecord.dayOfWeek || "Unknown day"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Time</p>
                  <p className="font-medium">
                    {selectedRecord.startTimeMinutes !== undefined 
                      ? `${Math.floor(selectedRecord.startTimeMinutes / 60)}:${(selectedRecord.startTimeMinutes % 60).toString().padStart(2, '0')}`
                      : "N/A"}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-neutral-400">Marked At</p>
                  <p className="font-medium">
                    {selectedRecord.markedAt && !isNaN(new Date(selectedRecord.markedAt).getTime())
                      ? format(new Date(selectedRecord.markedAt), "h:mm a")
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Marked By</p>
                  <p className="font-medium">
                    {selectedRecord.markedBy || "Self"}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() =>
                handleUpdateAttendance(
                  selectedRecord.studentId,
                  selectedRecord.lessonId,
                  selectedRecord.status === "present" ? "absent" : "present"
                )
              }
              className={selectedRecord?.status === "present" ? "bg-error text-white" : "bg-success text-white"}
            >
              Mark {selectedRecord?.status === "present" ? "Absent" : "Present"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
