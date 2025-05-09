import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Activity, BarChart2, FileText, Briefcase, ArrowRight, Users, Clock, PlusCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import CasesPage from "../components/layout/CasesPage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const DashboardPage = () => {
  const { user } = useAuth();
  
  // Get the user metadata
  const userData = user?.user_metadata || {};
  const userName = userData.name || "Counselor";
  const firstName = userName.split(' ')[0];

  // Fetch case statistics
  const { data: activeCasesCount = 0 } = useQuery({
    queryKey: ['active-cases-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'Active');
      
      if (error) {
        console.error('Error fetching active cases count:', error);
        return 0;
      }
      
      return count || 0;
    },
    enabled: !!user
  });

  // Fetch discovery requests count
  const { data: discoveryRequestsCount = 0 } = useQuery({
    queryKey: ['discovery-requests-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      // This is a placeholder - in a real app, you would fetch this from a discovery_requests table
      return 7; // Currently hardcoded value
    },
    enabled: !!user
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome message */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {firstName}</h1>
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
                <div className="text-3xl font-bold">{activeCasesCount}</div>
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
                <div className="text-3xl font-bold">{discoveryRequestsCount}</div>
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
