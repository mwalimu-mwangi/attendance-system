import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Printer, Download } from 'lucide-react';

const StudentReport = () => {
  const { id } = useParams();
  const [, navigate] = useLocation();
  
  const studentId = id ? parseInt(id) : 0;
  
  const { data: report, isLoading } = useQuery({
    queryKey: [`/api/students/${studentId}/attendance-report`],
    enabled: !!studentId,
    refetchOnWindowFocus: false,
  });
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleBack = () => {
    navigate('/admin/students');
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-500">Late</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!report) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Student Not Found</CardTitle>
            <CardDescription>
              The requested student could not be found or you don't have permission to view this report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Students
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const { student, stats, records } = report;
  
  // Calculate percentages for attendance stats
  const totalSessions = stats.totalSessions || 0;
  const presentPercentage = totalSessions > 0 
    ? Math.round((stats.presentCount / totalSessions) * 100) 
    : 0;
  const absentPercentage = totalSessions > 0 
    ? Math.round((stats.absentCount / totalSessions) * 100) 
    : 0;
  const latePercentage = totalSessions > 0 
    ? Math.round((stats.lateCount / totalSessions) * 100) 
    : 0;
  
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="print:hidden flex justify-between items-center mb-4">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Students
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>
      
      <Card className="border-0 print:shadow-none">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle className="text-2xl">Student Attendance Report</CardTitle>
              <CardDescription className="text-lg">
                {student.fullName} ({student.username})
              </CardDescription>
            </div>
            <div className="mt-2 sm:mt-0 text-right print:text-left">
              <div className="font-medium">{student.className || 'No Class Assigned'}</div>
              <div className="text-muted-foreground">{student.departmentName || 'No Department'}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Present:</span>
                    <span className="font-medium">{stats.presentCount} of {totalSessions} ({presentPercentage}%)</span>
                  </div>
                  <Progress value={presentPercentage} className="h-2 bg-muted" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Absent:</span>
                    <span className="font-medium">{stats.absentCount} of {totalSessions} ({absentPercentage}%)</span>
                  </div>
                  <Progress value={absentPercentage} className="h-2 bg-muted" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Late:</span>
                    <span className="font-medium">{stats.lateCount} of {totalSessions} ({latePercentage}%)</span>
                  </div>
                  <Progress value={latePercentage} className="h-2 bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              {records && records.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Marked At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {record.date 
                              ? format(new Date(record.date), 'PPP')
                              : 'Unknown date'}
                          </TableCell>
                          <TableCell>{record.subject}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell>
                            {record.markedAt 
                              ? format(new Date(record.markedAt), 'PPp')
                              : 'Not marked'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center p-6 text-muted-foreground">
                  No attendance records found for this student.
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentReport;