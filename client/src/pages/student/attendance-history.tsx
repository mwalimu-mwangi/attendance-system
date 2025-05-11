import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { 
  Calendar,
  CheckCircle2,
  Clock,
  FileDown,
  MapPin,
  Search,
  XCircle,
  BookOpen,
  BarChart3,
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  parseISO, 
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  differenceInCalendarDays
} from "date-fns";

export default function StudentAttendanceHistory() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  
  // Fetch attendance history
  const { data: attendanceHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["/api/attendance/history", user?.id],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/attendance/history?studentId=${user?.id}`);
        if (!res.ok) throw new Error("Failed to fetch attendance history");
        return res.json();
      } catch (error) {
        console.error("Error fetching attendance history:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Fetch attendance statistics
  const { data: attendanceStats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/attendance/stats/student", user?.id],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/attendance/stats/student?studentId=${user?.id}`);
        if (!res.ok) throw new Error("Failed to fetch attendance statistics");
        return res.json();
      } catch (error) {
        console.error("Error fetching attendance statistics:", error);
        return {};
      }
    },
    enabled: !!user?.id,
  });

  // Filter attendance history
  const filteredAttendance = attendanceHistory.filter((record: any) => {
    // Text search filter
    const searchMatch = 
      record.lessonSubject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.teacherName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Simplified time period filter
    if (timeFilter === "all") return searchMatch;
    if (timeFilter === "this-week") {
      // Since we don't have real dates to filter by week/month, just use a simpler approach
      // For example, we could filter by most recent records
      return searchMatch; 
    }
    if (timeFilter === "this-month") {
      // Same as above, we'll just show all records for now
      return searchMatch;
    }
    if (timeFilter === "present") return record.status === "present" && searchMatch;
    if (timeFilter === "absent") return record.status === "absent" && searchMatch;
    
    return searchMatch;
  }).sort((a: any, b: any) => {
    // Sort by ID instead of date (newer records usually have higher IDs)
    return b.id - a.id;
  });

  // Calculate streak (consecutive days present) - simplified version
  const calculateStreak = () => {
    // Sort records by ID (newest first) since we no longer have reliable date info
    const sortedRecords = [...attendanceHistory].sort((a: any, b: any) => b.id - a.id);
    
    let currentStreak = 0;
    
    // Count consecutive present records
    for (const record of sortedRecords) {
      if (record.status !== "present") break;
      currentStreak++;
    }
    
    return currentStreak;
  };

  // Export attendance as CSV
  const exportAttendance = () => {
    if (!attendanceHistory.length) return;
    
    // Create CSV content
    const headers = ["Day", "Subject", "Class", "Teacher", "Status", "Time"];
    const rows = attendanceHistory.map((record: any) => [
      record.lesson?.dayOfWeek || "Unknown day",
      record.lessonSubject,
      record.className,
      record.teacherName,
      record.status,
      record.markedAt ? format(new Date(record.markedAt), "HH:mm:ss") : "",
    ].join(","));
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    
    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_history_${user?.username}_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = historyLoading || statsLoading;
  const streak = calculateStreak();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Attendance History</h1>
            <p className="text-muted-foreground">
              View your complete attendance record
            </p>
          </div>
          
          <Button 
            variant="outline" 
            className="sm:w-auto w-full"
            onClick={exportAttendance}
            disabled={attendanceHistory.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export History
          </Button>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Present Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {Math.round(attendanceStats.presentPercentage || 0)}%
              </div>
              <div className="w-full mt-2 bg-neutral-100 rounded-full h-2.5">
                <div 
                  className="bg-green-500 rounded-full h-2.5" 
                  style={{ width: `${attendanceStats.presentPercentage || 0}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {attendanceStats.presentCount || 0} present out of {(attendanceStats.presentCount || 0) + (attendanceStats.absentCount || 0)} lessons
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Absent Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {Math.round(attendanceStats.absentPercentage || 0)}%
              </div>
              <div className="w-full mt-2 bg-neutral-100 rounded-full h-2.5">
                <div 
                  className="bg-red-500 rounded-full h-2.5" 
                  style={{ width: `${attendanceStats.absentPercentage || 0}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {attendanceStats.absentCount || 0} absent out of {(attendanceStats.presentCount || 0) + (attendanceStats.absentCount || 0)} lessons
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Lessons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(attendanceStats.presentCount || 0) + (attendanceStats.absentCount || 0)}
              </div>
              <div className="flex items-center mt-2">
                <div className="flex items-center mr-4">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-1.5"></div>
                  <span className="text-sm">{attendanceStats.presentCount || 0}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-1.5"></div>
                  <span className="text-sm">{attendanceStats.absentCount || 0}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                <BookOpen className="h-3.5 w-3.5 inline mr-1" />
                Across all classes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Current Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {streak} {streak === 1 ? 'day' : 'days'}
              </div>
              <div className="w-full mt-2 bg-neutral-100 rounded-full h-2.5">
                <div 
                  className="bg-primary rounded-full h-2.5" 
                  style={{ width: `${Math.min(streak * 10, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                Consecutive days present
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search classes, subjects..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="this-week">This week</SelectItem>
              <SelectItem value="this-month">This month</SelectItem>
              <SelectItem value="present">Present only</SelectItem>
              <SelectItem value="absent">Absent only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Attendance history table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : filteredAttendance.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              {searchTerm || timeFilter !== "all" ? (
                <>
                  <p className="text-lg font-medium text-center mb-1">No matching records</p>
                  <p className="text-muted-foreground text-center mb-6">
                    Try changing your search or filter settings
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium text-center mb-1">No attendance records yet</p>
                  <p className="text-muted-foreground text-center mb-6">
                    Your attendance history will appear here once you've attended lessons
                  </p>
                </>
              )}
              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setTimeFilter("all");
              }}>
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>
                Showing {filteredAttendance.length} of {attendanceHistory.length} records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject / Class</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Teacher</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="font-medium">
                          {record.dayOfWeek || record.lesson?.dayOfWeek || "Unknown day"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {record.lesson?.id ? `Lesson #${record.lesson?.id}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{record.lessonSubject}</div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <BookOpen className="h-3.5 w-3.5 mr-1" />
                          {record.className}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                          <span>
                            {record.lesson?.startTimeMinutes !== undefined 
                              ? `${Math.floor(record.lesson.startTimeMinutes / 60)}:${(record.lesson.startTimeMinutes % 60).toString().padStart(2, '0')}`
                              : "N/A"} 
                            - 
                            {record.lesson?.durationMinutes 
                              ? `${Math.floor((record.lesson.startTimeMinutes + record.lesson.durationMinutes) / 60)}:${((record.lesson.startTimeMinutes + record.lesson.durationMinutes) % 60).toString().padStart(2, '0')}`
                              : "N/A"}
                          </span>
                        </div>
                        {record.lesson?.location && (
                          <div className="text-sm text-muted-foreground flex items-center mt-1">
                            <MapPin className="h-3.5 w-3.5 mr-1" />
                            {record.lesson.location}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.status === "present" ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Present
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Absent
                          </Badge>
                        )}
                        {record.markedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Marked at {format(new Date(record.markedAt), "h:mm a")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.teacherName}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}