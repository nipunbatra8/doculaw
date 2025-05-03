import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  FileText,
  Send,
  Edit,
  Archive,
  Trash2,
  AlertTriangle,
  Download,
  Clock,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import PdfEditor from "@/components/PdfEditor";
import CriminalComplaintUploader from "@/components/upload/CriminalComplaintUploader";

// Type for case data from Supabase
type CaseData = {
  id: string;
  name: string;
  client: string | null;
  case_type: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  archived_at: string | null;
  // Additional fields for UI display
  lastActivity?: string;
  caseNumber?: string;
  court?: string;
  filedDate?: string;
  complaint_processed?: boolean;
  complaint_data?: any;
};

const CasePage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("details");
  const [editMode, setEditMode] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState<boolean>(false);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState<boolean>(false);
  const [clientDialogOpen, setClientDialogOpen] = useState<boolean>(false);
  const [showPdfEditor, setShowPdfEditor] = useState<boolean>(false);
  
  // Client form
  const [clientName, setClientName] = useState<string>("");
  const [clientEmail, setClientEmail] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  
  // Notification form
  const [notificationSubject, setNotificationSubject] = useState<string>("");
  const [notificationMessage, setNotificationMessage] = useState<string>("");

  // Case form for editing
  const [caseForm, setCaseForm] = useState({
    name: "",
    client: "",
    case_type: "",
    status: "",
  });

  // Check if we are coming from discovery request selection
  useEffect(() => {
    if (location.state?.showPdfEditor && location.state?.formType === "form-interrogatories") {
      setShowPdfEditor(true);
    }
  }, [location.state]);

  // Fetch case details
  const { data: caseData, isLoading, error, refetch } = useQuery({
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
      
      if (!data) return null;
      
      // Enhance data with additional UI fields
      return {
        ...data,
        lastActivity: formatRelativeTime(data.updated_at),
        caseNumber: data.complaint_data?.caseNumber || `CV-${new Date(data.created_at).getFullYear()}-${data.id.substring(0, 5)}`,
        court: data.complaint_data?.court || getCourt(data.case_type),
        filedDate: data.complaint_data?.filingDate ? format(parseISO(data.complaint_data.filingDate), 'MMM d, yyyy') : format(parseISO(data.created_at), 'MMM d, yyyy')
      };
    },
    enabled: !!user && !!caseId
  });

  // Set form values when case data loads
  useEffect(() => {
    if (caseData) {
      setCaseForm({
        name: caseData.name,
        client: caseData.client || "",
        case_type: caseData.case_type || "",
        status: caseData.status,
      });
      
      if (caseData.client) {
        setClientName(caseData.client);
      }
    }
  }, [caseData]);

  // Handle criminal complaint processing
  const handleComplaintProcessed = async (complaintData: any) => {
    if (!user || !caseId) return;
    
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          complaint_processed: true,
          complaint_data: complaintData,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId);
        
      if (error) throw error;
      
      refetch();
    } catch (error) {
      console.error('Error updating case with complaint data:', error);
      toast({
        title: "Error",
        description: "Failed to update case data. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Utility function to determine court based on case type
  const getCourt = (caseType: string | null): string => {
    if (!caseType) return "County Court";
    
    switch(caseType) {
      case "Family Law": return "Family Court";
      case "Estate Planning": return "Probate Court";
      case "Business Dispute": return "District Court";
      case "Civil Rights": return "Federal Court";
      case "Tax Law": return "Tax Court";
      case "Immigration": return "Immigration Court";
      case "Bankruptcy": return "Bankruptcy Court";
      default: return "County Court";
    }
  };

  // Utility function to format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return format(date, 'MMM d, yyyy');
  };

  // Handler for case update
  const handleUpdateCase = async () => {
    if (!user || !caseId) return;
    
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          name: caseForm.name,
          client: caseForm.client,
          case_type: caseForm.case_type,
          status: caseForm.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId);
        
      if (error) throw error;
      
      toast({
        title: "Case Updated",
        description: "The case details have been successfully updated.",
      });
      
      setEditMode(false);
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

  // Handler for case deletion
  const handleDeleteCase = async () => {
    if (!user || !caseId) return;
    
    try {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseId);
        
      if (error) throw error;
      
      toast({
        title: "Case Deleted",
        description: "The case has been permanently deleted.",
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting case:', error);
      toast({
        title: "Error",
        description: "Failed to delete the case. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handler for case archiving
  const handleArchiveCase = async () => {
    if (!user || !caseId) return;
    
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          archived_at: new Date().toISOString(),
          status: 'Inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId);
        
      if (error) throw error;
      
      toast({
        title: "Case Archived",
        description: "The case has been moved to the archive.",
      });
      
      navigate('/archive');
    } catch (error) {
      console.error('Error archiving case:', error);
      toast({
        title: "Error",
        description: "Failed to archive the case. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handler for client notification
  const handleSendNotification = async () => {
    if (!clientName) {
      toast({
        title: "No Client Assigned",
        description: "Please add a client to this case first.",
        variant: "destructive"
      });
      setNotifyDialogOpen(false);
      return;
    }
    
    // In a real app, you would send an email/SMS here
    toast({
      title: "Notification Sent",
      description: `A notification has been sent to ${clientName}.`,
    });
    
    setNotifyDialogOpen(false);
    setNotificationSubject("");
    setNotificationMessage("");
  };

  // Handler for adding client
  const handleAddClient = async () => {
    if (!clientName) {
      toast({
        title: "Error",
        description: "Client name is required.",
        variant: "destructive"
      });
      return;
    }
    
    if (!user || !caseId) return;
    
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          client: clientName,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId);
        
      if (error) throw error;
      
      toast({
        title: "Client Added",
        description: `${clientName} has been added as the client for this case.`,
      });
      
      setClientDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error adding client:', error);
      toast({
        title: "Error",
        description: "Failed to add the client. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded w-1/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error || !caseData) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-10">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Case Not Found</h2>
                <p className="text-gray-600 mb-4">
                  The case you're looking for doesn't exist or you don't have access to view it.
                </p>
                <Button onClick={() => navigate('/dashboard')}>
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{caseData.name}</h1>
              <Badge variant={
                caseData.status === "Active" ? "default" : 
                caseData.status === "Pending" ? "secondary" : 
                "outline"
              }>
                {caseData.status}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">Case Number: {caseData.caseNumber}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditMode(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Case
            </Button>
            <Button 
              variant="outline"
              onClick={() => setArchiveConfirmOpen(true)}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Case
            </Button>
            <Button 
              variant="destructive"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Case
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Case Details</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="client">Client Information</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Case Information</CardTitle>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Case Name
                        </label>
                        <Input
                          value={caseForm.name}
                          onChange={(e) => setCaseForm({...caseForm, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Client Name
                        </label>
                        <Input
                          value={caseForm.client}
                          onChange={(e) => setCaseForm({...caseForm, client: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Case Type
                        </label>
                        <Input
                          value={caseForm.case_type}
                          onChange={(e) => setCaseForm({...caseForm, case_type: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={caseForm.status}
                          onChange={(e) => setCaseForm({...caseForm, status: e.target.value})}
                          className="w-full border border-gray-300 rounded-md p-2"
                        >
                          <option value="Active">Active</option>
                          <option value="Pending">Pending</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setEditMode(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateCase}>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Case Number:</span>
                        <span className="font-medium">{caseData.caseNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Filing Date:</span>
                        <span>{caseData.filedDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Court:</span>
                        <span>{caseData.court}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type:</span>
                        <span>{caseData.case_type || "Not specified"}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <Badge variant={
                          caseData.status === "Active" ? "default" : 
                          caseData.status === "Pending" ? "secondary" : 
                          "outline"
                        }>
                          {caseData.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created:</span>
                        <span>{format(parseISO(caseData.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Updated:</span>
                        <span>{caseData.lastActivity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Client:</span>
                        <span className="font-medium">{caseData.client || "No client assigned"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Criminal Complaint Upload */}
            {!caseData.complaint_processed && (
              <CriminalComplaintUploader 
                caseId={caseData.id} 
                onComplaintProcessed={handleComplaintProcessed} 
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle>Discovery Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm">Requests Sent</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-2xl font-bold">3</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm">Responses Due</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-2xl font-bold">1</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm">Completed</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-2xl font-bold">2</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6 space-y-4">
                  <h3 className="font-medium text-gray-800">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <Button 
                      variant="outline" 
                      className="justify-start" 
                      onClick={() => navigate(`/discovery-request/${caseId}`)}
                      disabled={!caseData.complaint_processed}
                      title={!caseData.complaint_processed ? "Upload Criminal Complaint first" : ""}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Propound Discovery Request
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={() => navigate(`/discovery-response/${caseId}`)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Draft Discovery Response
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={() => setNotifyDialogOpen(true)}>
                      <Send className="h-4 w-4 mr-2" />
                      Notify Client
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={() => setClientDialogOpen(true)}>
                      <Users className="h-4 w-4 mr-2" />
                      Add Client
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Case Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-800 mb-3">Discovery Documents</h3>
                    <div className="border rounded-md divide-y">
                      {caseData.complaint_processed && caseData.complaint_data && (
                        <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-blue-500 mr-3" />
                            <div>
                              <p className="font-medium">Criminal Complaint</p>
                              <p className="text-sm text-gray-500">Uploaded: {format(new Date(), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-blue-500 mr-3" />
                          <div>
                            <p className="font-medium">Form Interrogatories</p>
                            <p className="text-sm text-gray-500">Sent: May 15, 2023</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-blue-500 mr-3" />
                          <div>
                            <p className="font-medium">Request for Production</p>
                            <p className="text-sm text-gray-500">Sent: June 2, 2023</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-blue-500 mr-3" />
                          <div>
                            <p className="font-medium">Request for Admissions</p>
                            <p className="text-sm text-gray-500">Sent: June 10, 2023</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-800 mb-3">Court Filings</h3>
                    {!caseData.complaint_processed ? (
                      <div className="border rounded-md p-6 text-center text-gray-500">
                        <p>No court filings have been uploaded yet.</p>
                        <Button variant="outline" className="mt-4" onClick={() => setActiveTab("details")}>
                          Upload Criminal Complaint
                        </Button>
                      </div>
                    ) : (
                      <div className="border rounded-md divide-y">
                        <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-blue-500 mr-3" />
                            <div>
                              <p className="font-medium">Criminal Complaint</p>
                              <p className="text-sm text-gray-500">Case Number: {caseData.complaint_data?.caseNumber}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Case Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    
                    <div className="relative pl-10 pb-8">
                      <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="font-medium">Case Created</div>
                      <div className="text-sm text-gray-500">{format(parseISO(caseData.created_at), 'MMMM d, yyyy - h:mm a')}</div>
                    </div>
                    
                    {caseData.complaint_processed && (
                      <div className="relative pl-10 pb-8">
                        <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="font-medium">Criminal Complaint Uploaded</div>
                        <div className="text-sm text-gray-500">{format(new Date(), 'MMMM d, yyyy - h:mm a')}</div>
                        <div className="mt-2 text-sm">Case details were updated from the criminal complaint</div>
                      </div>
                    )}
                    
                    <div className="relative pl-10 pb-8">
                      <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="font-medium">Discovery Request Sent</div>
                      <div className="text-sm text-gray-500">May 15, 2023 - 10:23 AM</div>
                      <div className="mt-2 text-sm">Form Interrogatories were sent to opposing counsel</div>
                    </div>
                    
                    <div className="relative pl-10 pb-8">
                      <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="font-medium">Discovery Request Sent</div>
                      <div className="text-sm text-gray-500">June 2, 2023 - 2:45 PM</div>
                      <div className="mt-2 text-sm">Request for Production was sent to opposing counsel</div>
                    </div>
                    
                    <div className="relative pl-10">
                      <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="font-medium">Discovery Request Sent</div>
                      <div className="text-sm text-gray-500">June 10, 2023 - 11:17 AM</div>
                      <div className="mt-2 text-sm">Request for Admissions was sent to opposing counsel</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="client" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent>
                {caseData.client ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Name:</span>
                        <span className="font-medium">{caseData.client}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span>client@example.com</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone:</span>
                        <span>(555) 123-4567</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Client Since:</span>
                        <span>{format(parseISO(caseData.created_at), 'MMMM d, yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <Badge>Active Client</Badge>
                      </div>
                    </div>
                    
                    <div className="md:col-span-2 mt-4">
                      <h3 className="font-medium text-gray-800 mb-3">Client Notes</h3>
                      <Textarea className="min-h-[100px]" placeholder="Add notes about this client..." />
                      <div className="mt-2 flex justify-end">
                        <Button size="sm">Save Notes</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-2">No Client Assigned</h3>
                    <p className="text-gray-500 mb-4">This case doesn't have a client assigned yet.</p>
                    <Button onClick={() => setClientDialogOpen(true)}>
                      <Users className="h-4 w-4 mr-2" />
                      Add Client
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* PDF Editor Dialog */}
      {showPdfEditor && (
        <Dialog open={showPdfEditor} onOpenChange={setShowPdfEditor}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Form Interrogatories Editor</DialogTitle>
              <DialogDescription>
                Edit the form interrogatories document for {caseData.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-grow overflow-auto">
              <PdfEditor pdfUrl="https://courts.ca.gov/sites/default/files/courts/default/2024-11/disc001.pdf" />
            </div>
