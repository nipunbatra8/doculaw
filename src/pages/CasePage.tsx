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
  Upload,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import PdfEditor from "@/components/PdfEditor";
import DocumentViewer from "@/components/discovery/DocumentViewer";
import { ComplaintInformation } from "@/integrations/gemini/client";

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
  // Complaint related fields
  complaint_processed: boolean | null;
  complaint_data: ComplaintInformation | null;
  // Additional fields for UI display
  lastActivity?: string;
  caseNumber?: string;
  court?: string;
  filedDate?: string;
};

// Add this type definition for documents
interface Document {
  id: string;
  user_id: string;
  case_id: string | null;
  name: string;
  path: string;
  url: string;
  type: string;
  size: number;
  extracted_text: string | null;
  created_at: string;
  updated_at: string | null;
  // For documents from storage that aren't in the database
  fromStorage?: boolean;
}

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
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState<boolean>(false);
  const [showComplaintDetails, setShowComplaintDetails] = useState<boolean>(false);
  const [complaintInfo, setComplaintInfo] = useState<ComplaintInformation | null>(null);
  
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
      
      // Use a type that includes both existing fields and possible new fields
      type DatabaseCaseData = {
        id: string;
        name: string;
        client: string | null;
        case_type: string | null;
        status: string;
        created_at: string;
        updated_at: string;
        user_id: string;
        archived_at: string | null;
        complaint_processed?: boolean;
        complaint_data?: ComplaintInformation;
      };
      
      const dbData = data as DatabaseCaseData;
      
      // Enhance data with additional UI fields
      const enhancedData: CaseData = {
        ...data,
        complaint_processed: dbData.complaint_processed || null,
        complaint_data: dbData.complaint_data || null,
        lastActivity: formatRelativeTime(data.updated_at),
        caseNumber: `CV-${new Date(data.created_at).getFullYear()}-${data.id.substring(0, 5)}`,
        court: getCourt(data.case_type),
        filedDate: format(parseISO(data.created_at), 'MMM d, yyyy')
      };
      
      return enhancedData;
    },
    enabled: !!user && !!caseId
  });

  // Set form values when case data loads
  useEffect(() => {
    if (caseData) {
      setCaseForm({
        name: caseData.name,
        client: caseData.client || "",
        status: caseData.status,
      });
      
      if (caseData.client) {
        setClientName(caseData.client);
      }
      
      // Set complaint info from case data if available
      if (caseData.complaint_processed && caseData.complaint_data) {
        setComplaintInfo(caseData.complaint_data);
      } else {
        // Only fetch if we don't have it already
        fetchComplaintInfo();
      }
    }
  }, [caseData, caseId, user]);

  // Function to fetch complaint information from documents
  const fetchComplaintInfo = async () => {
    if (!user || !caseId) return;
    
    try {
      // First check if we have any complaint documents
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('case_id', caseId)
        .eq('type', 'complaint')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (!documents || documents.length === 0) {
        console.log('No complaint documents found for this case');
        return;
      }
      
      // If we have complaint documents but no processed data,
      // set default complaint info as a fallback
      setComplaintInfo({
        defendant: caseData?.client || "Unknown Defendant",
        plaintiff: "State of California",
        caseNumber: caseData?.caseNumber || "Unknown",
        filingDate: caseData?.filedDate || "Unknown",
        chargeDescription: "Unknown Charges",
        courtName: caseData?.court || "Unknown Court"
      });
      
    } catch (fetchError) {
      console.error('Error fetching complaint documents:', fetchError);
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
                        <span className="text-gray-500">Last Updated:</span>
                        <span>{caseData.lastActivity}</span>
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
                    </div>
                    
                    {/* Complaint Information Dropdown */}
                    <div className="md:col-span-2 mt-3">
                      <button
                        onClick={() => setShowComplaintDetails(!showComplaintDetails)}
                        className="flex items-center justify-between w-full px-4 py-2 text-left border rounded-md hover:bg-gray-50"
                      >
                        <span className="font-medium">
                          View more information from complaint
                        </span>
                        {showComplaintDetails ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      
                      {showComplaintDetails && (
                        <div className="mt-3 border rounded-md p-4 bg-gray-50">
                          {complaintInfo ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div>
                                  <span className="text-gray-500">Court:</span>
                                  <p className="font-medium">{complaintInfo.courtName}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Filing Date:</span>
                                  <p className="font-medium">{complaintInfo.filingDate}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Plaintiff:</span>
                                  <p className="font-medium">{complaintInfo.plaintiff}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <span className="text-gray-500">Defendant:</span>
                                  <p className="font-medium">{complaintInfo.defendant}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Case Number:</span>
                                  <p className="font-medium">{complaintInfo.caseNumber}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Charges:</span>
                                  <p className="font-medium">{complaintInfo.chargeDescription}</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-gray-500">No complaint information available.</p>
                              <p className="text-sm text-gray-400 mt-1">
                                Upload a complaint document using "Propound Discovery Request" to extract case details.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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
                    <Button variant="outline" className="justify-start" onClick={() => navigate(`/discovery-request/${caseId}`)}>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Case Documents</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/discovery-request/${caseId}`)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New Document
                </Button>
              </CardHeader>
              <CardContent>
                <CaseDocuments 
                  caseId={caseId} 
                  onViewDocument={(documentId) => {
                    setViewingDocumentId(documentId);
                    setShowDocumentViewer(true);
                  }}
                />
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
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowPdfEditor(false)}>Close</Button>
              <Button>Save Changes</Button>
              <Button variant="secondary">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Delete Case
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the case "{caseData.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="sm:flex-1"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="sm:flex-1"
              onClick={handleDeleteCase}
            >
              Delete Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Archive className="h-5 w-5 mr-2" />
              Archive Case
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to archive the case "{caseData.name}"? You can unarchive it later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="sm:flex-1"
              onClick={() => setArchiveConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="sm:flex-1"
              onClick={handleArchiveCase}
            >
              Archive Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify Client Dialog */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Send className="h-5 w-5 mr-2" />
              Notify Client
            </DialogTitle>
            <DialogDescription>
              Send a notification to {caseData.client || "the client"} regarding this case.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <Input
                value={notificationSubject}
                onChange={(e) => setNotificationSubject(e.target.value)}
                placeholder="Case update regarding..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <Textarea
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Enter your message to the client..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="sm:flex-1"
              onClick={() => setNotifyDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="sm:flex-1"
              disabled={!notificationSubject || !notificationMessage}
              onClick={handleSendNotification}
            >
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Client Dialog */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Add Client
            </DialogTitle>
            <DialogDescription>
              Add client information to this case.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name
              </label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                type="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(555) 123-4567"
                type="tel"
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="sm:flex-1"
              onClick={() => setClientDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="sm:flex-1"
              disabled={!clientName}
              onClick={handleAddClient}
            >
              Add Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer */}
      <DocumentViewer
        documentId={viewingDocumentId}
        caseId={caseId}
        open={showDocumentViewer}
        onClose={() => {
          setShowDocumentViewer(false);
          setViewingDocumentId(null);
        }}
      />
    </DashboardLayout>
  );
};

// CaseDocuments component
const CaseDocuments = ({ 
  caseId, 
  onViewDocument 
}: { 
  caseId: string | undefined;
  onViewDocument: (documentId: string) => void;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const getSignedUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('doculaw')
        .createSignedUrl(filePath, 3600);
      
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  };

  useEffect(() => {
    if (!user || !caseId) return;
    
    const fetchDocuments = async () => {
      setIsLoading(true);
      try {
        // Fetch database records first
        const { data: dbDocuments, error: dbError } = await supabase
          .from('documents')
          .select('*')
          .eq('case_id', caseId)
          .order('created_at', { ascending: false });
        
        if (dbError) throw dbError;
        
        // Also check the storage bucket directly
        const { data: storageData, error: storageError } = await supabase.storage
          .from('doculaw')
          .list(`cases/${caseId}`, {
            sortBy: { column: 'name', order: 'desc' }
          });
        
        if (storageError) throw storageError;
        
        // Create document objects for storage files that aren't in the database
        const dbPaths = new Set((dbDocuments || []).map(doc => doc.path));
        const storageDocuments: Document[] = [];
        
        for (const item of storageData || []) {
          if (!item.id || item.id === '.emptyFolderPlaceholder') continue;
          
          const filePath = `cases/${caseId}/${item.name}`;
          
          // Skip if this file is already in the database
          if (dbPaths.has(filePath)) continue;
          
          // Get a signed URL for the file
          const signedUrl = await getSignedUrl(filePath);
          
          if (!signedUrl) continue;
          
          // Create a document object
          storageDocuments.push({
            id: item.id,
            user_id: user.id,
            case_id: caseId,
            name: item.name,
            path: filePath,
            url: signedUrl,
            type: getFileType(item.name),
            size: item.metadata?.size || 0,
            extracted_text: null,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: null,
            fromStorage: true
          });
        }
        
        // Get signed URLs for database documents as well
        const dbDocumentsWithSignedUrls = await Promise.all((dbDocuments || []).map(async (doc) => {
          const signedUrl = await getSignedUrl(doc.path);
          return {
            ...doc,
            url: signedUrl || doc.url // Fall back to stored URL if signed URL fails
          };
        }));
        
        // Merge database and storage documents
        setDocuments([...dbDocumentsWithSignedUrls, ...storageDocuments]);
      } catch (error) {
        console.error('Error fetching documents:', error);
        toast({
          title: "Error",
          description: "Failed to load documents. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocuments();
  }, [user, caseId, toast]);
  
  // Helper function to determine file type from filename
  const getFileType = (fileName: string) => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('complaint')) {
      return 'complaint';
    } else if (lowerName.includes('interrogator')) {
      return 'interrogatories';
    } else if (lowerName.includes('admission')) {
      return 'admissions';
    } else if (lowerName.includes('production')) {
      return 'production';
    } else {
      return 'document';
    }
  };
  
  const handleDeleteDocument = async () => {
    if (!documentToDelete || !user || !caseId) return;
    
    try {
      // Find the document
      const docToDelete = documents.find(doc => doc.id === documentToDelete);
      if (!docToDelete) throw new Error("Document not found");
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('doculaw')
        .remove([docToDelete.path]);
        
      if (storageError) throw storageError;
      
      // If it's in the database (not just storage), delete from database too
      if (!docToDelete.fromStorage) {
        const { error: deleteError } = await supabase
          .from('documents')
          .delete()
          .eq('id', documentToDelete);
          
        if (deleteError) throw deleteError;
      }
      
      toast({
        title: "Document Deleted",
        description: "The document has been removed from this case."
      });
      
      // Update the UI by removing the deleted document
      setDocuments(documents.filter(doc => doc.id !== documentToDelete));
      setDocumentToDelete(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete the document. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Add or update document in database (for storage-only files)
  const handleImportDocument = async (doc: Document) => {
    if (!user || !caseId || !doc.fromStorage) return;
    
    try {
      // Try to extract text if needed
      let extractedText = null;
      
      try {
        // Download the file from storage
        const { data, error } = await supabase.storage
          .from('doculaw')
          .download(doc.path);
          
        if (error) throw error;
        
        // Use pdf-to-text to extract text
        const file = new File([data], doc.name, { type: 'application/pdf' });
        const pdfToText = (await import('react-pdftotext')).default;
        extractedText = await pdfToText(file);
      } catch (extractError) {
        console.error('Error extracting text:', extractError);
        // Continue even if text extraction fails
      }
      
      // Add to database
      const { data: insertData, error: insertError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          case_id: caseId,
          name: doc.name,
          path: doc.path,
          url: doc.url,
          type: doc.type,
          size: doc.size,
          extracted_text: extractedText,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single();
      
      if (insertError) throw insertError;
      
      // Update documents list
      setDocuments(prevDocs => 
        prevDocs.map(d => d.id === doc.id ? { ...insertData, fromStorage: false } : d)
      );
      
      toast({
        title: "Document Imported",
        description: "The document has been added to the database."
      });
    } catch (error) {
      console.error('Error importing document:', error);
      toast({
        title: "Error",
        description: "Failed to import the document. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Reset confirmation text when dialog closes
  useEffect(() => {
    if (!documentToDelete) {
      setDeleteConfirmText("");
    }
  }, [documentToDelete]);
  
  // Rest of the component with minor updates to support storage files
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-16 bg-gray-200 rounded"></div>
        <div className="h-16 bg-gray-200 rounded"></div>
      </div>
    );
  }
  
  if (documents.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-medium text-gray-800 mb-3">Documents</h3>
          <div className="border rounded-md p-6 text-center text-gray-500">
            <p>No documents have been uploaded to this case yet.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate(`/discovery-request/${caseId}`)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-gray-800 mb-3">All Case Documents</h3>
        <div className="border rounded-md divide-y">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-blue-500 mr-3" />
                <div>
                  <div className="flex items-center">
                    <p className="font-medium">{doc.name}</p>
                    {doc.fromStorage && (
                      <Badge variant="outline" className="ml-2 text-amber-600 bg-amber-50">
                        Storage Only
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Uploaded: {format(parseISO(doc.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                {doc.fromStorage ? (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleImportDocument(doc)}
                    title="Import to database"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onViewDocument(doc.id)}
                    title="View and Edit Document"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.open(doc.url, '_blank')}
                  title="Download Document"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setDocumentToDelete(doc.id)}
                  title="Delete Document"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={!!documentToDelete} 
        onOpenChange={(open) => {
          if (!open) setDocumentToDelete(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Delete Document
            </DialogTitle>
            <DialogDescription>
              <p className="mb-2">
                Are you <strong>absolutely sure</strong> you want to delete this document? 
              </p>
              <p className="mb-2 text-red-500">
                This action <strong>cannot be undone</strong> and all document data will be permanently lost.
              </p>
              <p>
                Type <strong>DELETE</strong> below to confirm:
              </p>
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-2">
            <Input 
              placeholder="Type DELETE to confirm" 
              className="border-red-200"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="sm:flex-1"
              onClick={() => setDocumentToDelete(null)}
            >
              Cancel
            </Button>
            <Button 
              id="confirm-delete-btn"
              variant="destructive" 
              className="sm:flex-1"
              disabled={deleteConfirmText !== "DELETE"}
              onClick={handleDeleteDocument}
            >
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CasePage;
