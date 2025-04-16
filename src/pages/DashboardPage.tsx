
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Activity, BarChart2, FileText, Briefcase, ArrowRight, Users, Clock, PlusCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import CasesPage from "./CasesPage";

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

        <CasesPage />
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
