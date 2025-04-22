import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { 
  BarChart, 
  Calendar, 
  Clock, 
  FileText, 
  Users, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  Plus
} from "lucide-react";

// Mock data for the dashboard
const recentClients = [
  { id: "1", name: "John Smith", status: "Active", questionnaires: 2, lastActive: "2 hours ago" },
  { id: "2", name: "Sarah Johnson", status: "Pending", questionnaires: 1, lastActive: "1 day ago" },
  { id: "3", name: "Michael Brown", status: "Active", questionnaires: 3, lastActive: "Just now" },
  { id: "4", name: "Emily Davis", status: "Inactive", questionnaires: 0, lastActive: "1 week ago" },
];

const upcomingDeadlines = [
  { id: "1", title: "File Motion for Summary Judgment", case: "Johnson v. Smith", dueDate: "Tomorrow", priority: "High" },
  { id: "2", title: "Client Meeting", case: "Estate of Williams", dueDate: "In 2 days", priority: "Medium" },
  { id: "3", title: "Document Review", case: "Brown Bankruptcy", dueDate: "In 3 days", priority: "Low" },
];

const recentActivity = [
  { id: "1", action: "Questionnaire completed", user: "John Smith", time: "2 hours ago" },
  { id: "2", action: "New client added", user: "You", time: "Yesterday" },
  { id: "3", action: "Document generated", user: "You", time: "Yesterday" },
  { id: "4", action: "Questionnaire sent", user: "You", time: "3 days ago" },
];

const getInitials = (user) => {
  if (user?.email) {
    return user.email.charAt(0).toUpperCase();
  }
  return "U";
};

const DashboardPage = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {profile?.name || "User"}</p>
        </div>

        <Tabs defaultValue="overview" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Stats Cards */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                    <Users className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">24</div>
                    <p className="text-xs text-gray-500 mt-1">
                      +2 from last month
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Pending Questionnaires</CardTitle>
                    <FileText className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">7</div>
                    <p className="text-xs text-gray-500 mt-1">
                      3 due this week
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
                    <Calendar className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">12</div>
                    <p className="text-xs text-gray-500 mt-1">
                      5 high priority
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 mt-6 md:grid-cols-2">
                {/* Recent Clients */}
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Recent Clients</CardTitle>
                    <CardDescription>
                      Your most recently active clients
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentClients.map((client) => (
                        <div key={client.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-doculaw-200 text-doculaw-700">
                                {client.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="ml-3">
                              <p className="text-sm font-medium">{client.name}</p>
                              <p className="text-xs text-gray-500">
                                {client.questionnaires} questionnaires
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Badge 
                              variant={
                                client.status === "Active" ? "default" : 
                                client.status === "Pending" ? "secondary" : "outline"
                              }
                              className="mr-2"
                            >
                              {client.status}
                            </Badge>
                            <p className="text-xs text-gray-500">{client.lastActive}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/clients">
                          View All Clients
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Deadlines */}
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Upcoming Deadlines</CardTitle>
                    <CardDescription>
                      Tasks and deadlines requiring attention
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {upcomingDeadlines.map((deadline) => (
                        <div key={deadline.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                          <div>
                            <div className="flex items-center">
                              {deadline.priority === "High" ? (
                                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                              ) : deadline.priority === "Medium" ? (
                                <Clock className="h-4 w-4 text-amber-500 mr-2" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                              )}
                              <p className="text-sm font-medium">{deadline.title}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 ml-6">
                              {deadline.case}
                            </p>
                          </div>
                          <Badge 
                            variant={
                              deadline.priority === "High" ? "destructive" : 
                              deadline.priority === "Medium" ? "secondary" : "outline"
                            }
                          >
                            {deadline.dueDate}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <Button variant="outline" className="w-full">
                        View Calendar
                        <Calendar className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Clients Tab */}
            <TabsContent value="clients">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Your Clients</h2>
                <Button className="bg-doculaw-500 hover:bg-doculaw-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Client
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {recentClients.map((client) => (
                  <Card key={client.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-doculaw-200 text-doculaw-700">
                              {client.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="ml-3">
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-gray-500">
                              Last active: {client.lastActive}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={
                            client.status === "Active" ? "default" : 
                            client.status === "Pending" ? "secondary" : "outline"
                          }
                        >
                          {client.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Questionnaires:</span>
                          <span className="font-medium">{client.questionnaires}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Documents:</span>
                          <span className="font-medium">5</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Status:</span>
                          <span className="font-medium">{client.status}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex space-x-2">
                        <Button variant="outline" className="flex-1 text-xs">
                          View Details
                        </Button>
                        <Button className="flex-1 text-xs bg-doculaw-500 hover:bg-doculaw-600">
                          Send Questionnaire
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Add New Client Card */}
                <Card className="border-dashed border-2 flex items-center justify-center">
                  <CardContent className="pt-6 flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-doculaw-100 flex items-center justify-center mb-4">
                      <Plus className="h-6 w-6 text-doculaw-500" />
                    </div>
                    <h3 className="font-medium text-center">Add New Client</h3>
                    <p className="text-sm text-gray-500 text-center mt-1">
                      Create a new client profile
                    </p>
                    <Button className="mt-4 bg-doculaw-500 hover:bg-doculaw-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Client
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Your recent actions and client activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {recentActivity.map((activity, index) => (
                      <div key={activity.id} className="relative pl-6">
                        {/* Timeline connector */}
                        {index < recentActivity.length - 1 && (
                          <div className="absolute left-2 top-2 bottom-0 w-0.5 bg-gray-200" />
                        )}
                        
                        {/* Timeline dot */}
                        <div className="absolute left-0 top-2 h-4 w-4 rounded-full bg-doculaw-200 border-2 border-doculaw-500" />
                        
                        <div>
                          <p className="font-medium">{activity.action}</p>
                          <div className="flex items-center mt-1 text-sm text-gray-500">
                            <span>{activity.user}</span>
                            <span className="mx-2">•</span>
                            <span>{activity.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid gap-6 mt-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Document Activity</CardTitle>
                    <CardDescription>
                      Recent document generation and edits
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <FileText className="h-5 w-5 text-doculaw-500 mr-3 mt-0.5" />
                          <div>
                            <p className="font-medium">Will and Testament</p>
                            <p className="text-xs text-gray-500">Generated for John Smith</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                      
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <FileText className="h-5 w-5 text-doculaw-500 mr-3 mt-0.5" />
                          <div>
                            <p className="font-medium">Power of Attorney</p>
                            <p className="text-xs text-gray-500">Edited by you</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">Yesterday</p>
                      </div>
                      
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <FileText className="h-5 w-5 text-doculaw-500 mr-3 mt-0.5" />
                          <div>
                            <p className="font-medium">Living Trust</p>
                            <p className="text-xs text-gray-500">Generated for Sarah Johnson</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">3 days ago</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Questionnaire Activity</CardTitle>
                    <CardDescription>
                      Recent questionnaire completions and updates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                          <div>
                            <p className="font-medium">Estate Planning Questionnaire</p>
                            <p className="text-xs text-gray-500">Completed by John Smith</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                      
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <ArrowUpRight className="h-5 w-5 text-amber-500 mr-3 mt-0.5" />
                          <div>
                            <p className="font-medium">Business Formation Questionnaire</p>
                            <p className="text-xs text-gray-500">Sent to Michael Brown</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">Yesterday</p>
                      </div>
                      
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <ArrowUpRight className="h-5 w-5 text-amber-500 mr-3 mt-0.5" />
                          <div>
                            <p className="font-medium">Divorce Questionnaire</p>
                            <p className="text-xs text-gray-500">Sent to Emily Davis</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">1 week ago</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
