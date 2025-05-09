import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { BarChart, Calendar, GraduationCap, School, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch system overview stats
  const { data: systemStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error("Failed to fetch system statistics");
        return res.json();
      } catch (error) {
        console.error("Error fetching system stats:", error);
        return {
          totalStudents: 0,
          totalTeachers: 0,
          totalDepartments: 0,
          totalClasses: 0,
          totalLessons: 0,
          overallAttendanceRate: 0
        };
      }
    },
  });

  // Fetch departments
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ["/api/departments"],
  });

  // Fetch users (teachers and admins)
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) throw new Error("Failed to fetch users");
        return res.json();
      } catch (error) {
        console.error("Error fetching users:", error);
        return [];
      }
    },
  });

  // Fetch recent attendance records
  const { data: recentAttendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ["/api/admin/recent-attendance"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/admin/recent-attendance");
        if (!res.ok) throw new Error("Failed to fetch recent attendance");
        return res.json();
      } catch (error) {
        console.error("Error fetching recent attendance:", error);
        return [];
      }
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage the attendance system and view analytics
          </p>
        </div>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview">System Overview</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="staff">Staff Management</TabsTrigger>
          </TabsList>
          
          {/* System Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stat Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {statsLoading ? (
                      <div className="animate-pulse bg-neutral-100 h-9 w-16 rounded"></div>
                    ) : (
                      systemStats?.totalStudents || 0
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total registered students
                  </p>
                </CardContent>
                <CardFooter className="pt-2 pb-6">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/admin/students">
                      View All Students
                    </a>
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Teachers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {statsLoading ? (
                      <div className="animate-pulse bg-neutral-100 h-9 w-16 rounded"></div>
                    ) : (
                      systemStats?.totalTeachers || 0
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Active teaching staff
                  </p>
                </CardContent>
                <CardFooter className="pt-2 pb-6">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/admin/teachers">
                      Manage Teaching Staff
                    </a>
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Attendance Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {statsLoading ? (
                      <div className="animate-pulse bg-neutral-100 h-9 w-16 rounded"></div>
                    ) : (
                      `${Math.round((systemStats?.overallAttendanceRate || 0) * 100)}%`
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    System-wide attendance average
                  </p>
                </CardContent>
                <CardFooter className="pt-2 pb-6">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/admin/attendance-reports">
                      View Detailed Reports
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            {/* Recent Attendance */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Recent Attendance Activity</CardTitle>
                    <CardDescription>
                      Latest attendance records across all classes
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/admin/attendance-logs">
                      View All Logs
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {attendanceLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : recentAttendance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p>No recent attendance records found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Lesson</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentAttendance.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.studentName}</TableCell>
                          <TableCell>{record.className}</TableCell>
                          <TableCell>{record.subject}</TableCell>
                          <TableCell>
                            <span 
                              className={
                                record.status === "present" 
                                  ? "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800" 
                                  : "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                              }
                            >
                              {record.status === "present" ? "Present" : "Absent"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(record.markedAt), "MMM d, h:mm a")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Departments</h2>
              <Button asChild>
                <a href="/admin/departments/new">
                  Add Department
                </a>
              </Button>
            </div>
            
            {departmentsLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : departments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <School className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p>No departments have been created yet</p>
                <Button className="mt-4" asChild>
                  <a href="/admin/departments/new">
                    Create Department
                  </a>
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {departments.map((department: any) => (
                  <Card key={department.id}>
                    <CardHeader>
                      <CardTitle>{department.name}</CardTitle>
                      <CardDescription>
                        Created {format(new Date(department.createdAt), "MMMM d, yyyy")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Classes:</span>
                          <span className="text-sm font-medium">{department.classCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Students:</span>
                          <span className="text-sm font-medium">{department.studentCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Teachers:</span>
                          <span className="text-sm font-medium">{department.teacherCount || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/admin/departments/${department.id}`}>
                          View Details
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/admin/departments/${department.id}/edit`}>
                          Edit
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Staff Management Tab */}
          <TabsContent value="staff" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Staff Management</h2>
              <Button asChild>
                <a href="/admin/users/new">
                  Add Staff Member
                </a>
              </Button>
            </div>
            
            {usersLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p>No staff members found</p>
                <Button className="mt-4" asChild>
                  <a href="/admin/users/new">
                    Add Staff Member
                  </a>
                </Button>
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.fullName}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>
                            <span 
                              className={
                                user.role === "admin" 
                                  ? "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800" 
                                  : "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              }
                            >
                              {user.role === "admin" ? "Admin" : "Teacher"}
                            </span>
                          </TableCell>
                          <TableCell>{user.departmentName || "—"}</TableCell>
                          <TableCell>{format(new Date(user.createdAt), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <a href={`/admin/users/${user.id}/edit`}>
                                  Edit
                                </a>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}