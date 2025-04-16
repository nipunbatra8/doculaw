
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Activity, BarChart2, FileText, Briefcase, ArrowRight, Users, Clock, PlusCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// Mock data for dashboard
const recentCases = [
  { id: "1", name: "Smith v. Johnson", status: "Active", lastUpdated: "Today", type: "Personal Injury" },
  { id: "2", name: "Davidson LLC v. Metro Corp", status: "Active", lastUpdated: "Yesterday", type: "Business Dispute" },
  { id: "3", name: "Thompson Divorce", status: "Pending", lastUpdated: "2 days ago", type: "Family Law" },
  { id: "4", name: "Williams Estate", status: "Active", lastUpdated: "3 days ago", type: "Estate Planning" },
];

const upcomingDeadlines = [
  { id: "1", title: "File Discovery Response", case: "Smith v. Johnson", dueDate: "Tomorrow", priority: "High" },
  { id: "2", title: "Client Meeting", case: "Davidson LLC v. Metro Corp", dueDate: "Aug 21", priority: "Medium" },
  { id: "3", title: "Draft Motion", case: "Thompson Divorce", dueDate: "Aug 25", priority: "Medium" },
];

const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome message */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0] || "Counselor"}</h1>
            <p className="text-gray-600 mt-1">Here's what's happening with your cases today.</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <Button 
              className="bg-doculaw-500 hover:bg-doculaw-600 text-white"
              asChild
            >
              <Link to="/cases">View All Cases</Link>
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Active Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">12</div>
                <Briefcase className="h-6 w-6 text-doculaw-500" />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <span className="text-green-500 font-medium">↑ 8%</span> from last month
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Discovery Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">7</div>
                <FileText className="h-6 w-6 text-doculaw-500" />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <span className="text-amber-500 font-medium">3</span> awaiting response
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Active Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">18</div>
                <Users className="h-6 w-6 text-doculaw-500" />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <span className="text-green-500 font-medium">↑ 12%</span> from last month
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Time Saved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">43h</div>
                <Clock className="h-6 w-6 text-doculaw-500" />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Last 30 days
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent cases */}
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Cases</CardTitle>
                <CardDescription>Your most recently updated cases</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/cases">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCases.map((caseItem) => (
                  <div key={caseItem.id} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{caseItem.name}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${
                          caseItem.status === "Active" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {caseItem.status}
                        </span>
                        <span className="text-xs text-gray-500">{caseItem.type}</span>
                        <span className="text-xs text-gray-500">Updated: {caseItem.lastUpdated}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-doculaw-500" asChild>
                      <Link to={`/cases/${caseItem.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}

                <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                  <Link to="/cases/new">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add New Case
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Deadlines and tasks */}
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Upcoming Deadlines</CardTitle>
                <CardDescription>Tasks that need your attention</CardDescription>
              </div>
              <Button variant="outline" size="sm">View all</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingDeadlines.map((deadline) => (
                  <div key={deadline.id} className="flex items-start space-x-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className={`mt-0.5 h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center ${
                      deadline.priority === "High" 
                        ? "bg-red-100" 
                        : "bg-amber-100"
                    }`}>
                      <AlertCircle className={`h-3.5 w-3.5 ${
                        deadline.priority === "High" 
                          ? "text-red-600" 
                          : "text-amber-600"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{deadline.title}</p>
                        <span className={`text-xs font-medium ${
                          deadline.dueDate === "Tomorrow" 
                            ? "text-red-600" 
                            : "text-gray-500"
                        }`}>
                          {deadline.dueDate}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Case: {deadline.case}</p>
                      
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="flex-1">
                          <Progress value={
                            deadline.dueDate === "Tomorrow" ? 90 : 
                            deadline.dueDate === "Aug 21" ? 60 : 40
                          } className="h-1.5" />
                        </div>
                        <span className="text-xs text-gray-500">
                          {deadline.dueDate === "Tomorrow" ? "Due Soon" : "In Progress"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" size="sm" className="w-full mt-4">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity and Stats */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Activity feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5 text-doculaw-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex">
                  <div className="mr-4 flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-doculaw-100">
                      <FileText className="h-4 w-4 text-doculaw-700" />
                    </div>
                    <div className="h-full w-px bg-gray-200" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Discovery response drafted</p>
                    <p className="text-xs text-gray-500">Smith v. Johnson &bull; 2 hours ago</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="mr-4 flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <Users className="h-4 w-4 text-blue-700" />
                    </div>
                    <div className="h-full w-px bg-gray-200" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Client questionnaire completed</p>
                    <p className="text-xs text-gray-500">Davidson LLC v. Metro Corp &bull; 5 hours ago</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="mr-4 flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <FileText className="h-4 w-4 text-green-700" />
                    </div>
                    <div className="h-full w-px bg-gray-200" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Discovery request sent</p>
                    <p className="text-xs text-gray-500">Thompson Divorce &bull; Yesterday</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="mr-4 flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                      <Users className="h-4 w-4 text-purple-700" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">New client added</p>
                    <p className="text-xs text-gray-500">Williams Estate &bull; Yesterday</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart2 className="mr-2 h-5 w-5 text-doculaw-500" />
                Discovery Performance
              </CardTitle>
              <CardDescription>
                Time spent on discovery responses
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-10">
              <div className="flex flex-col items-center justify-center h-48 space-y-2">
                <BarChart2 className="h-16 w-16 text-doculaw-200" />
                <p className="text-xl font-bold">84% Time Reduction</p>
                <p className="text-sm text-gray-500 max-w-xs">
                  Your firm is spending 84% less time on discovery responses compared to industry average.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
