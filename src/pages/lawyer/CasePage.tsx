import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

// UI Components
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChevronLeft, Edit, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Types
type CaseData = {
  id: string;
  name: string;
  description: string | null;
  case_type: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
};

const CasePage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [caseName, setCaseName] = useState("");
  const [caseDescription, setCaseDescription] = useState("");
  const [caseStatus, setCaseStatus] = useState("");
  const [caseType, setCaseType] = useState("");

  // Fetch case details
  const { data: caseData, isLoading, error, refetch } = useQuery<CaseData>({
    queryKey: ['case', caseId],
    queryFn: async () => {
      if (!user || !caseId) return null;

      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!caseId
  });

  useEffect(() => {
    if (caseData) {
      setCaseName(caseData.name);
      setCaseDescription(caseData.description || "");
      setCaseStatus(caseData.status);
      setCaseType(caseData.case_type || "");
    }
  }, [caseData]);

  const handleUpdateCase = async () => {
    if (!caseId) return;

    try {
      const { error } = await supabase
        .from('cases')
        .update({
          name: caseName,
          description: caseDescription,
          status: caseStatus,
          case_type: caseType,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId);

      if (error) throw error;

      toast({
        title: "Case Updated",
        description: "The case has been updated successfully.",
      });

      setIsEditModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error updating case:', error);
      toast({
        title: "Error",
        description: "Failed to update the case. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-4"
              onClick={() => navigate('/dashboard')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {caseData?.name || "Loading..."}
            </h1>
            <p className="text-gray-600">
              Case Number: {caseData ? `CV-${new Date(caseData.created_at).getFullYear()}-${caseData.id.substring(0, 5)}` : "Loading..."}
            </p>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={() => navigate(`/ai-chat/${caseId}`)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Chat
            </Button>
            <Button
              onClick={() => setIsEditModalOpen(true)}
              variant="outline"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Case
            </Button>
          </div>
        </div>

        <Separator />

        {/* Case Details Section */}
        {isLoading ? (
          <p>Loading case details...</p>
        ) : error ? (
          <p className="text-red-500">Error: {error.message}</p>
        ) : caseData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Case Information</CardTitle>
                <CardDescription>Details about this case</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Case Name
                    </p>
                    <p>{caseData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Description
                    </p>
                    <p>{caseData.description || "No description provided."}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Case Type
                    </p>
                    <p>{caseData.case_type || "No case type specified."}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Status
                    </p>
                    <p>{caseData.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Created At
                    </p>
                    <p>{format(new Date(caseData.created_at), 'MMM d, yyyy hh:mm a')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Last Updated
                    </p>
                    <p>{format(new Date(caseData.updated_at), 'MMM d, yyyy hh:mm a')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Perform actions related to this case</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button asChild>
                    <Link to={`/discovery-request/${caseId}`}>
                      Propound Discovery Request
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link to={`/discovery-response/${caseId}`}>
                      Draft Discovery Response
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <p>No case data found.</p>
        )}
      </div>
      
      {/* Edit Case Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Case</DialogTitle>
            <DialogDescription>
              Update the details of this case.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={caseName}
                onChange={(e) => setCaseName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={caseDescription}
                onChange={(e) => setCaseDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Input
                id="status"
                value={caseStatus}
                onChange={(e) => setCaseStatus(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="caseType" className="text-right">
                Case Type
              </Label>
              <Input
                id="caseType"
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateCase}>
              Update Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CasePage;
