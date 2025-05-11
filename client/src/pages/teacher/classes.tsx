import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { 
  Users, 
  School, 
  BookOpen, 
  Clock, 
  Calendar,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TeacherClasses() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch teacher's classes
  const { data: classes = [], isLoading } = useQuery({
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

  // Filter classes based on search term
  const filteredClasses = classes.filter((cls: any) => 
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.departmentName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">My Classes</h1>
            <p className="text-muted-foreground">
              View and manage your assigned classes
            </p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search classes..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-6 w-2/3 bg-neutral-100 rounded mb-2"></div>
                  <div className="h-4 w-1/2 bg-neutral-100 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 w-full bg-neutral-100 rounded"></div>
                    <div className="h-4 w-full bg-neutral-100 rounded"></div>
                    <div className="h-4 w-2/3 bg-neutral-100 rounded"></div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="h-9 w-full bg-neutral-100 rounded"></div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <School className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {searchTerm ? (
              <>
                <p className="text-lg font-medium mb-1">No matching classes</p>
                <p>Try a different search term or clear your search</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium mb-1">No classes assigned</p>
                <p>You don't have any classes assigned to you yet</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.map((cls: any) => (
              <Card key={cls.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{cls.name}</CardTitle>
                  <CardDescription>
                    {cls.departmentName} • Level {cls.levelNumber}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <Users className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Students</p>
                        <p className="text-sm text-muted-foreground">
                          {cls.studentCount || 0} enrolled
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <BookOpen className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Lessons</p>
                        <p className="text-sm text-muted-foreground">
                          {cls.lessonCount || 0} scheduled
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Calendar className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Next Lesson</p>
                        <p className="text-sm text-muted-foreground">
                          {cls.nextLesson ? (
                            `${cls.nextLesson.subject}, ${new Date(cls.nextLesson.startTime).toLocaleDateString()}`
                          ) : (
                            "No upcoming lessons"
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Clock className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Average Attendance</p>
                        <div className="w-full mt-1 bg-neutral-100 rounded-full h-2">
                          <div 
                            className="bg-primary rounded-full h-2" 
                            style={{ width: `${(cls.attendanceRate || 0) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.round((cls.attendanceRate || 0) * 100)}% attendance rate
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button className="w-full" variant="outline" asChild>
                    <a href={`/teacher/classes/${cls.id}`}>
                      View Class Details
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}