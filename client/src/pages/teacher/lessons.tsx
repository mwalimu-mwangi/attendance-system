import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { 
  Calendar,
  Clock,
  Filter,
  MapPin,
  School,
  Search,
  Users,
} from "lucide-react";
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

// Helper function to get the number of days between two dates
function getDaysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper function to check if a date is in the future
function isFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

// Helper function to check if a date is in the past
function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

// Helper function to check if a date is in the current week
function isThisWeekDate(date: Date): boolean {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return date >= startOfWeek && date <= endOfWeek;
}

// Helper function to check if a date is in the current month
function isThisMonthDate(date: Date): boolean {
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

export default function TeacherLessons() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch teacher's lessons
  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["/api/lessons", user?.id],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/lessons?teacherId=${user?.id}`);
        if (!res.ok) throw new Error("Failed to fetch lessons");
        return res.json();
      } catch (error) {
        console.error("Error fetching lessons:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Helper function to calculate next occurrence of a lesson based on day of week
  const getNextOccurrence = (dayOfWeek: number) => {
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0-6, 0 is Sunday
    const daysUntilNext = (dayOfWeek - currentDayOfWeek + 7) % 7;
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + daysUntilNext);
    return nextDate;
  };
  
  // Helper function to calculate the start and end time for a lesson
  const calculateLessonTimes = (lesson: any) => {
    // Calculate based on dayOfWeek, startTimeMinutes and durationMinutes
    const nextOccurrence = getNextOccurrence(lesson.dayOfWeek);
    const startHours = Math.floor(lesson.startTimeMinutes / 60);
    const startMinutes = lesson.startTimeMinutes % 60;
    
    const startTime = new Date(nextOccurrence);
    startTime.setHours(startHours, startMinutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + lesson.durationMinutes);
    
    return { startTime, endTime };
  };

  // Process lessons to add calculated start and end times
  const processedLessons = lessons.map((lesson: any) => {
    const { startTime, endTime } = calculateLessonTimes(lesson);
    return { ...lesson, startTime, endTime };
  });
  
  // Helper function to determine if a lesson occurs today
  const isLessonToday = (lesson: any) => {
    return new Date().getDay() === lesson.dayOfWeek;
  };
  
  // Filter and sort lessons
  const filteredLessons = processedLessons
    .filter((lesson: any) => {
      // Search filter
      const searchMatch = 
        lesson.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Tab filters
      if (activeTab === "all") return searchMatch;
      if (activeTab === "today") return isLessonToday(lesson) && searchMatch;
      if (activeTab === "upcoming") return isFutureDate(lesson.startTime) && searchMatch;
      if (activeTab === "past") return isPastDate(lesson.endTime) && searchMatch;
      if (activeTab === "this-week") return isThisWeekDate(lesson.startTime) && searchMatch;
      if (activeTab === "this-month") return isThisMonthDate(lesson.startTime) && searchMatch;
      
      return searchMatch;
    })
    .sort((a: any, b: any) => a.startTime.getTime() - b.startTime.getTime());

  // Group lessons by date
  const groupedLessons: Record<string, any[]> = {};
  
  filteredLessons.forEach((lesson: any) => {
    const date = new Date(lesson.startTime).toISOString().split('T')[0]; // Format as 'YYYY-MM-DD'
    if (!groupedLessons[date]) {
      groupedLessons[date] = [];
    }
    groupedLessons[date].push(lesson);
  });

  // Get ordered dates
  const orderedDates = Object.keys(groupedLessons).sort();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">My Lessons</h1>
            <p className="text-muted-foreground">
              View and manage your scheduled lessons
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="default" asChild>
              <a href="/teacher/create-lesson">
                <Calendar className="h-4 w-4 mr-2" />
                Create Lesson
              </a>
            </Button>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search lessons..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center mb-4 overflow-x-auto pb-2">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="this-week">This Week</TabsTrigger>
              <TabsTrigger value="this-month">This Month</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value={activeTab} className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredLessons.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {searchTerm ? (
                  <>
                    <p className="text-lg font-medium mb-1">No matching lessons</p>
                    <p>Try a different search term or clear your search</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-1">No lessons found</p>
                    <p>There are no lessons {activeTab === "all" ? "scheduled" : activeTab === "upcoming" ? "upcoming" : activeTab === "today" ? "today" : activeTab === "past" ? "in the past" : activeTab === "this-week" ? "this week" : "this month"}</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {orderedDates.map((date) => (
                  <div key={date} className="space-y-4">
                    <div className="flex items-center">
                      <div className="bg-neutral-100 rounded-full p-2 mr-3">
                        <Calendar className="h-5 w-5 text-neutral-600" />
                      </div>
                      <h2 className="text-lg font-semibold">
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric'
                        })}
                        {isToday(new Date(date)) && (
                          <Badge variant="outline" className="ml-2 font-normal">
                            Today
                          </Badge>
                        )}
                      </h2>
                    </div>
                    
                    <div className="space-y-4">
                      {groupedLessons[date].map((lesson: any) => (
                        <Card key={lesson.id} className="overflow-hidden">
                          <div className={
                            isPastDate(new Date(lesson.endTime))
                              ? "bg-neutral-50 border-l-4 border-neutral-300"
                              : isToday(new Date(lesson.startTime))
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
                                  {isPastDate(new Date(lesson.endTime)) ? (
                                    <Badge variant="outline" className="text-neutral-600 bg-neutral-100">
                                      Completed
                                    </Badge>
                                  ) : isToday(new Date(lesson.startTime)) ? (
                                    <Badge className="bg-primary">
                                      Today
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-green-600 bg-green-50">
                                      Upcoming
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex flex-col gap-3">
                                  <div className="flex items-center text-sm">
                                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span>
                                      {formatTimeFromMinutes(lesson.startTimeMinutes)} - {formatTimeFromMinutes(lesson.startTimeMinutes + lesson.durationMinutes)}
                                    </span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span>{lesson.location || "No location specified"}</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <School className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span>Level {lesson.levelNumber}</span>
                                  </div>
                                </div>
                                
                                <div className="md:ml-auto flex flex-col items-start md:items-end">
                                  <div className="flex items-center text-sm mb-1">
                                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span>
                                      {lesson.attendance ? (
                                        <>
                                          <span className="font-medium">{lesson.attendance.presentCount || 0} present</span>
                                          <span className="mx-1">•</span>
                                          <span className="font-medium">{lesson.attendance.absentCount || 0} absent</span>
                                          <span className="mx-1">•</span>
                                          <span className="font-medium">
                                            {((lesson.attendance.presentCount || 0) * 100 / ((lesson.attendance.presentCount || 0) + (lesson.attendance.absentCount || 0) || 1)).toFixed(0)}% attendance
                                          </span>
                                        </>
                                      ) : (
                                        <span>Attendance not taken</span>
                                      )}
                                    </span>
                                  </div>
                                  
                                  <div className="flex space-x-2 mt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      asChild
                                    >
                                      <a href={`/teacher/lessons/${lesson.id}`}>
                                        View Details
                                      </a>
                                    </Button>
                                    
                                    <Button
                                      variant="default"
                                      size="sm"
                                      asChild
                                    >
                                      <a href={`/teacher/bulk-attendance?lessonId=${lesson.id}`}>
                                        <Users className="h-3.5 w-3.5 mr-1" />
                                        Mark Attendance
                                      </a>
                                    </Button>
                                    
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      asChild
                                    >
                                      <a href={`/teacher/attendance-records?lessonId=${lesson.id}`}>
                                        {isPastDate(new Date(lesson.endTime)) 
                                          ? "View Records" 
                                          : "Records"}
                                      </a>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}