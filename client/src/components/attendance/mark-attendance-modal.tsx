import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Timer, CheckCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Lesson } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface MarkAttendanceModalProps {
  isOpen: boolean;
  lesson: Lesson | null;
  onClose: () => void;
}

export function MarkAttendanceModal({ isOpen, lesson, onClose }: MarkAttendanceModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isMarking, setIsMarking] = useState(false);

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!lesson || !user) return;
      const res = await apiRequest("POST", "/api/attendance", {
        lessonId: lesson.id,
        studentId: user.id,
        status: "present"
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your attendance has been marked.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons/today"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsMarking(false);
    }
  });

  const handleMarkAttendance = () => {
    setIsMarking(true);
    markAttendanceMutation.mutate();
  };

  if (!lesson) return null;

  // Calculate when the attendance window closes
  const startTime = new Date(lesson.startTime);
  const windowCloses = new Date(startTime.getTime() + lesson.attendanceWindowMinutes * 60000);
  const timeRemaining = windowCloses > new Date() ? formatDistanceToNow(windowCloses, { addSuffix: true }) : "Closed";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-neutral-500">Mark Attendance</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Confirm your attendance for:
          </DialogDescription>
        </DialogHeader>
        
        <div className="mb-6">
          <p className="font-medium text-neutral-500">
            {lesson.subject} ({format(startTime, "hh:mm a")} - {format(new Date(lesson.endTime), "hh:mm a")})
          </p>
          <p className="text-sm text-neutral-300 mb-4">
            {lesson.location || "No location specified"}
          </p>
          
          <div className="bg-primary bg-opacity-10 rounded-md p-4 mb-4">
            <div className="flex items-center">
              <Timer className="text-primary mr-2 h-5 w-5" />
              <span className="text-sm text-primary">
                Attendance window closes: {timeRemaining}
              </span>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex items-center justify-center mb-4">
          <Button 
            onClick={handleMarkAttendance} 
            className="bg-primary hover:bg-primary-dark text-white font-medium"
            disabled={isMarking}
          >
            {isMarking ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                I'm Present
              </>
            )}
          </Button>
        </DialogFooter>
        
        <p className="text-xs text-center text-neutral-300">
          By confirming, you acknowledge that you are physically present in this class. False attendance marking is prohibited.
        </p>
      </DialogContent>
    </Dialog>
  );
}
