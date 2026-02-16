import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Activity, BarChart2, FileText, Briefcase, ArrowRight, Users, Clock, PlusCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import CasesPage from "../../components/layout/CasesPage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const DashboardPage = () => {
  const { user } = useAuth();
  
  // Get the user metadata
  const userData = user?.user_metadata || {};
  const userName = userData.name || "Counselor";
  const firstName = userName.split(' ')[0];

  // Fetch active case statistics
  const { data: activeCasesCount = 0, isLoading: loadingCases } = useQuery({
    queryKey: ['active-cases-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'Active')
        .is('archived_at', null);  // Ensure we only count non-archived cases
      
      if (error) {
        console.error('Error fetching active cases count:', error);
        return 0;
      }
      
      return count || 0;
    },
    enabled: !!user
  });

  // Fetch active clients count
  const { data: activeClientsCount = 0, isLoading: loadingClients } = useQuery({
    queryKey: ['active-clients-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('lawyer_id', user.id);
      
      if (error) {
        console.error('Error fetching active clients count:', error);
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

  // Fetch cases with pending client responses
  const { data: casesWithPendingResponses = [] } = useQuery({
    queryKey: ['cases-pending-responses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get all questionnaires for this lawyer that are pending or in_progress
      const { data: questionnaires, error } = await supabase
        .from('client_questionnaires')
        .select('case_id, case_name, status, completed_questions, total_questions, response_deadline')
        .eq('lawyer_id', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('sent_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching pending responses:', error);
        return [];
      }
      
      // Group by case_id to avoid duplicates
      const caseMap = new Map();
      questionnaires?.forEach((q) => {
        if (!caseMap.has(q.case_id)) {
          caseMap.set(q.case_id, {
            case_id: q.case_id,
            case_name: q.case_name,
            status: q.status,
            completed_questions: q.completed_questions,
            total_questions: q.total_questions,
            response_deadline: q.response_deadline
          });
        }
      });
      
      return Array.from(caseMap.values());
    },
    enabled: !!user,
    refetchInterval: 10000 // Refetch every 10 seconds
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
                <div className="text-3xl font-bold">
                  {loadingCases ? (
                    <span className="text-gray-400">...</span>
                  ) : (
                    activeCasesCount
                  )}
                </div>
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
                <div className="text-3xl font-bold">
                  {loadingClients ? (
                    <span className="text-gray-400">...</span>
                  ) : (
                    activeClientsCount
                  )}
                </div>
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

        {/* Cases with Pending Client Responses */}
        {casesWithPendingResponses.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Awaiting Client Responses</CardTitle>
                  <CardDescription>Cases where clients need to answer discovery questions</CardDescription>
                </div>
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {casesWithPendingResponses.map((caseData) => (
                  <Link 
                    key={caseData.case_id} 
                    to={`/discovery-response/${caseData.case_id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{caseData.case_name}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {caseData.completed_questions} of {caseData.total_questions} questions answered
                          </p>
                        </div>
                        <div className="w-48">
                          <Progress 
                            value={(caseData.completed_questions / caseData.total_questions) * 100} 
                            className="h-2"
                          />
                        </div>
                        {caseData.response_deadline && (
                          <div className="text-sm text-gray-500">
                            Due: {new Date(caseData.response_deadline).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 ml-4" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <CasesPage />
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
