import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, School, Clock, BookOpen, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function InstantLessonForm() {
  const [subject, setSubject] = useState("");
  const [classId, setClassId] = useState("");
  const [location, setLocation] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [attendanceWindowMinutes, setAttendanceWindowMinutes] = useState("30");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch classes that this teacher can teach
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ["/api/teacher/classes"],
    queryFn: async () => {
      // For teacher, we need to fetch classes from their departments
      const teacherDepts = await fetch("/api/teacher/departments").then(res => res.json());
      const departmentIds = teacherDepts.map((dept: any) => dept.departmentId);
      
      // Fetch all classes
      const allClasses = await fetch("/api/classes").then(res => res.json());
      
      // Filter classes to include only those from teacher's departments
      return allClasses.filter((classItem: any) => 
        departmentIds.includes(classItem.departmentId)
      );
    }
  });
  
  // Create instant lesson mutation
  const createInstantLessonMutation = useMutation({
    mutationFn: async (lessonData: any) => {
      const response = await fetch("/api/instant-lesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lessonData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to create instant lesson");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Reset form
      setSubject("");
      setClassId("");
      setLocation("");
      setDurationMinutes("60");
      setAttendanceWindowMinutes("30");
      
      // Show success toast
      toast({
        title: "Success",
        description: "Instant lesson created successfully",
      });
      
      // Invalidate lessons query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create instant lesson",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject || !classId) {
      toast({
        title: "Validation Error",
        description: "Subject and class are required fields",
        variant: "destructive",
      });
      return;
    }
    
    const lessonData = {
      subject,
      classId,
      location,
      durationMinutes: parseInt(durationMinutes),
      attendanceWindowMinutes: parseInt(attendanceWindowMinutes),
    };
    
    createInstantLessonMutation.mutate(lessonData);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Create Instant Lesson
        </CardTitle>
        <CardDescription>
          Create a new lesson that starts immediately
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject" className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" /> Subject
              </Label>
              <Input
                id="subject"
                placeholder="Subject name"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class" className="flex items-center gap-1">
                <School className="h-4 w-4" /> Class
              </Label>
              <Select value={classId} onValueChange={setClassId} required>
                <SelectTrigger id="class" disabled={isLoadingClasses}>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classItem: any) => (
                    <SelectItem key={classItem.id} value={classItem.id.toString()}>
                      {classItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {classes.length === 0 && !isLoadingClasses && (
                <p className="text-xs text-destructive">
                  You are not assigned to any departments or there are no classes available.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> Location
              </Label>
              <Input
                id="location"
                placeholder="Room/Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> Duration (minutes)
              </Label>
              <Input
                id="duration"
                type="number"
                min="15"
                max="180"
                placeholder="60"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendance-window" className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> Attendance Window (minutes)
            </Label>
            <Input
              id="attendance-window"
              type="number"
              min="5"
              max="60"
              placeholder="30"
              value={attendanceWindowMinutes}
              onChange={(e) => setAttendanceWindowMinutes(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Time window during which students can mark attendance
            </p>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit}
          disabled={createInstantLessonMutation.isPending || classes.length === 0}
          className="w-full"
        >
          {createInstantLessonMutation.isPending ? "Creating..." : "Create Instant Lesson"}
        </Button>
      </CardFooter>
    </Card>
  );
}