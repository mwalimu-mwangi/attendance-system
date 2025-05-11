import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Info, Settings, Upload, School, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Form schema for system settings
const systemSettingsSchema = z.object({
  defaultAttendanceWindow: z.preprocess(
    (val) => parseInt(val as string, 10) || 30,
    z.number().min(1, "Attendance window must be at least 1 minute")
  ),
  autoDisableAttendance: z.boolean().default(true),
  allowTeacherOverride: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
  attendanceReminders: z.boolean().default(true),
  lowAttendanceAlerts: z.boolean().default(true),
  schoolName: z.string().optional(),
  schoolLogo: z.string().optional(),
  letterhead: z.string().optional(),
});

type SystemSettingsFormValues = z.infer<typeof systemSettingsSchema>;

export default function AdminSystemSettings() {
  const { toast } = useToast();
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Fetch system settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/system-settings"],
    queryFn: async () => {
      const response = await fetch("/api/system-settings");
      if (!response.ok) throw new Error("Failed to fetch system settings");
      return response.json();
    },
  });

  // Setup form
  const form = useForm<SystemSettingsFormValues>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      defaultAttendanceWindow: 30,
      autoDisableAttendance: true,
      allowTeacherOverride: true,
      emailNotifications: true,
      attendanceReminders: true,
      lowAttendanceAlerts: true,
    },
  });

  // Update form values when settings are loaded
  useState(() => {
    if (settings) {
      form.reset({
        defaultAttendanceWindow: settings.defaultAttendanceWindow,
        autoDisableAttendance: settings.autoDisableAttendance,
        allowTeacherOverride: settings.allowTeacherOverride,
        emailNotifications: settings.emailNotifications,
        attendanceReminders: settings.attendanceReminders,
        lowAttendanceAlerts: settings.lowAttendanceAlerts,
        schoolName: settings.schoolName || "",
        schoolLogo: settings.schoolLogo || "",
        letterhead: settings.letterhead || "",
      });
    }
  });

  // Watch for form changes
  useState(() => {
    const subscription = form.watch(() => {
      setIsFormDirty(true);
    });
    return () => subscription.unsubscribe();
  });

  // Update system settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SystemSettingsFormValues) => {
      const response = await apiRequest("PUT", "/api/system-settings", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "System settings updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] });
      setIsFormDirty(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SystemSettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };

  return (
    <DashboardLayout>
      <div className="fade-in">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-neutral-500 mb-2">System Settings</h2>
          <p className="text-neutral-300">Configure global settings for the attendance system</p>
        </div>
        
        <Card>
          <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
            <div className="flex items-center">
              <Settings className="mr-2 h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium text-neutral-500">System Configuration</h3>
            </div>
            
            {isFormDirty && (
              <Alert className="py-2 px-4 max-w-md bg-amber-50 text-amber-800 border-amber-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You have unsaved changes
                </AlertDescription>
              </Alert>
            )}
          </div>
          <CardContent className="p-6">
            {settingsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <h4 className="text-md font-medium text-neutral-500 mb-4">Attendance Settings</h4>
                    
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="defaultAttendanceWindow"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Attendance Window (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                {...field}
                                onChange={(e) => field.onChange(e.target.value)}
                                value={field.value.toString()}
                              />
                            </FormControl>
                            <FormDescription>
                              The default time window in minutes during which students can mark attendance after a lesson starts.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="autoDisableAttendance"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Auto-disable Attendance Marking</FormLabel>
                              <FormDescription>
                                Automatically disable attendance marking after the attendance window time has passed.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="allowTeacherOverride"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Allow Teacher Override</FormLabel>
                              <FormDescription>
                                Allow teachers to override the attendance window and mark attendance for students manually.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-md font-medium text-neutral-500 mb-4">Notification Settings</h4>
                    
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Email Notifications</FormLabel>
                              <FormDescription>
                                Enable system-wide email notifications for important events.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="attendanceReminders"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Attendance Reminders</FormLabel>
                              <FormDescription>
                                Send reminders to students to mark their attendance for upcoming lessons.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="lowAttendanceAlerts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Low Attendance Alerts</FormLabel>
                              <FormDescription>
                                Alert teachers and administrators when a student's attendance falls below a certain threshold.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-md font-medium text-neutral-500 mb-4">School Branding</h4>
                    
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="schoolName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>School Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter school name"
                              />
                            </FormControl>
                            <FormDescription>
                              School name to display on reports and the application header
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="schoolLogo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>School Logo URL</FormLabel>
                            <div className="flex gap-4 items-start">
                              <FormControl>
                                <div className="flex-1">
                                  <Input
                                    {...field}
                                    placeholder="Enter URL to school logo"
                                  />
                                </div>
                              </FormControl>
                              {field.value && (
                                <div className="w-16 h-16 rounded-md overflow-hidden border border-neutral-200">
                                  <img 
                                    src={field.value} 
                                    alt="School Logo Preview" 
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDIyQzE3LjUgMjIgMjIgMTcuNSAyMiAxMkMyMiA2LjUgMTcuNSAyIDEyIDJDNi41IDIgMiA2LjUgMiAxMkMyIDE3LjUgNi41IDIyIDEyIDIyWiIgc3Ryb2tlPSIjOTk5OTk5IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik05LjE3IDguODNMMTEuOTIgMTEuNThMOS4xNyAxNC4zMyIgc3Ryb2tlPSIjOTk5OTk5IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0xNC44MyAxNC4zM0wxMi4wOCAxMS41OEwxNC44MyA4LjgzIiBzdHJva2U9IiM5OTk5OTkiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==";
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                            <FormDescription>
                              URL to your school logo image. This will appear on reports and the application
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="letterhead"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Letterhead URL</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter URL to letterhead image"
                              />
                            </FormControl>
                            <FormDescription>
                              URL to your letterhead image that will appear at the top of printed reports
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Information</AlertTitle>
                    <AlertDescription>
                      These settings affect the entire system. Changes will take effect immediately.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateSettingsMutation.isPending || !isFormDirty}
                      className="bg-primary hover:bg-primary-dark text-white"
                    >
                      {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
