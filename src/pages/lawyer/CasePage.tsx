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
  UserPlus,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import PdfEditor from "@/components/PdfEditor";
import DocumentViewer from "@/components/discovery/DocumentViewer";
import { ComplaintInformation } from "@/integrations/gemini/client";
import ClientInviteModal from "@/components/clients/ClientInviteModal";
import { sendSms } from "@/integrations/sms/client";

// Type for case data from Supabase
type CaseData = {
  id: string;
  name: string;
  clients: string[] | null; // Array of client UUIDs
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

// Define the Client interface
interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  case_type: string | null;
  created_at: string;
  user_id: string | null;
  lawyer_id: string;
  // For display purposes
  fullName?: string;
}

const CasePage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("details");
  const [editMode, setEditMode] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState<boolean>(false);
  const [unarchiveConfirmOpen, setUnarchiveConfirmOpen] = useState<boolean>(false);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState<boolean>(false);
  const [clientDialogOpen, setClientDialogOpen] = useState<boolean>(false);
  const [clientInviteModalOpen, setClientInviteModalOpen] = useState<boolean>(false);
  const [showPdfEditor, setShowPdfEditor] = useState<boolean>(false);
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState<boolean>(false);
  const [showComplaintDetails, setShowComplaintDetails] = useState<boolean>(false);
  const [complaintInfo, setComplaintInfo] = useState<ComplaintInformation | null>(null);
  
  // Client search handling
  const [clientSearchQuery, setClientSearchQuery] = useState<string>("");
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState<boolean>(false);
  const [caseClientDetails, setCaseClientDetails] = useState<Client[]>([]);
  const [isLoadingCaseClients, setIsLoadingCaseClients] = useState<boolean>(false);
  
  // Notification form
  const [notificationSubject, setNotificationSubject] = useState<string>("");
  const [notificationMessage, setNotificationMessage] = useState<string>("");

  // Case form for editing
  const [caseForm, setCaseForm] = useState({
    name: "",
    clients: [] as string[],
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
        clients: caseData.clients || [],
        status: caseData.status,
      });
      
      if (caseData.clients && caseData.clients.length > 0) {
        setSelectedClients(caseData.clients);
      }
      
      // Set complaint info from case data if available
      if (caseData.complaint_processed && caseData.complaint_data) {
        setComplaintInfo(caseData.complaint_data);
      } else {
        // Only fetch if we don't have it already
        fetchComplaintInfo();
      }
      
      // Fetch client details when case data first loads
      fetchCaseClientDetails();
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
        defendant: caseData?.clients?.length ? caseData.clients[0] : "Unknown Defendant",
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
          clients: caseForm.clients,
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
      
      setArchiveConfirmOpen(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error archiving case:', error);
      toast({
        title: "Error",
        description: "Failed to archive the case. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handler for case unarchiving
  const handleUnarchiveCase = async () => {
    if (!user || !caseId) return;
    
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          archived_at: null,
          status: 'Active',
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId);
        
      if (error) throw error;
      
      toast({
        title: "Case Unarchived",
        description: "The case has been restored from the archive.",
      });
      
      setUnarchiveConfirmOpen(false);
      refetch();
    } catch (error) {
      console.error('Error unarchiving case:', error);
      toast({
        title: "Error",
        description: "Failed to unarchive the case. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handler for client notification via SMS
  const handleSendNotification = async () => {
    if (!caseData.clients || caseData.clients.length === 0) {
      toast({
        title: "No Clients Assigned",
        description: "Please add clients to this case first.",
        variant: "destructive"
      });
      setNotifyDialogOpen(false);
      return;
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const clientId of caseData.clients) {
      try {
        // Look up client phone number
        const { data: clientInfo } = await supabase
          .from('clients')
          .select('phone, first_name, last_name')
          .eq('id', clientId)
          .single();

        if (!clientInfo?.phone) {
          console.warn(`No phone for client ${clientId}, skipping SMS`);
          failedCount++;
          continue;
        }

        const fullMessage = notificationSubject 
          ? `${notificationSubject}: ${notificationMessage}`
          : notificationMessage;

        const result = await sendSms({
          to_phone: clientInfo.phone,
          message_type: 'custom',
          client_id: clientId,
          lawyer_id: user?.id,
          case_id: caseId,
          custom_message: fullMessage,
          client_name: clientInfo.first_name || 'there',
          lawyer_name: profile?.name || 'your attorney',
          case_name: caseData.name,
        });

        if (result.success) {
          sentCount++;
        } else {
          console.error(`SMS failed for client ${clientId}:`, result.error);
          failedCount++;
        }
      } catch (err) {
        console.error(`Error sending to client ${clientId}:`, err);
        failedCount++;
      }
    }

    if (sentCount > 0) {
      toast({
        title: "Notifications Sent",
        description: `SMS sent to ${sentCount} client(s).${failedCount > 0 ? ` ${failedCount} failed.` : ''}`,
      });
    } else {
      toast({
        title: "Notifications Failed",
        description: "Could not send SMS to any clients. Check phone numbers.",
        variant: "destructive"
      });
    }
    
    setNotifyDialogOpen(false);
    setNotificationSubject("");
    setNotificationMessage("");
  };

  // Handler for adding client
  const handleAddClient = async () => {
    if (selectedClients.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one client to add to this case.",
        variant: "destructive"
      });
      return;
    }
    
    if (!user || !caseId) return;
    
    try {
      // Update the case with the selected client UUIDs
      const { error } = await supabase
        .from('cases')
        .update({
          clients: selectedClients,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId);
        
      if (error) throw error;
      
      toast({
        title: "Clients Added",
        description: `${selectedClients.length} client(s) have been added to this case.`,
      });
      
      setClientDialogOpen(false);
      setSelectedClients([]);
      setClientSearchQuery("");
      refetch();
    } catch (error) {
      console.error('Error adding clients:', error);
      toast({
        title: "Error",
        description: "Failed to add the client(s). Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle client invitation success
  const handleClientInvited = () => {
    toast({
      title: "Success",
      description: "Client has been invited. You can now add them to this case.",
    });
    setClientInviteModalOpen(false);
    // Refresh the clients list
    searchClients("");
  };

  // Function to search for clients
  const searchClients = async (query: string) => {
    if (!user) return;
    
    setIsLoadingClients(true);
    try {
      // Search for clients belonging to this lawyer
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('lawyer_id', user.id)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process clients to include full name for display
      const clientsWithFullName = (data || []).map(client => ({
        ...client,
        fullName: `${client.first_name} ${client.last_name}`
      }));
      
      setAvailableClients(clientsWithFullName);
    } catch (error) {
      console.error('Error searching clients:', error);
      toast({
        title: "Error",
        description: "Failed to search for clients. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingClients(false);
    }
  };
  
  // Initial client search when the add client dialog opens
  useEffect(() => {
    if (clientDialogOpen) {
      searchClients("");
    }
  }, [clientDialogOpen, user]);

  // Function to fetch client details for the case
  const fetchCaseClientDetails = async () => {
    if (!user || !caseId || !caseData?.clients || caseData.clients.length === 0) {
      setCaseClientDetails([]);
      return;
    }
    
    setIsLoadingCaseClients(true);
    try {
      // Fetch details for all clients assigned to this case
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .in('id', caseData.clients);
      
      if (error) throw error;
      
      // Process clients to include full name for display
      const clientsWithFullName = (data || []).map(client => ({
        ...client,
        fullName: `${client.first_name} ${client.last_name}`
      }));
      
      setCaseClientDetails(clientsWithFullName);
    } catch (error) {
      console.error('Error fetching case client details:', error);
      toast({
        title: "Error",
        description: "Failed to load client information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCaseClients(false);
    }
  };
  
  // Fetch client details when case data changes
  useEffect(() => {
    fetchCaseClientDetails();
  }, [caseData, user, caseId]);

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
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mt-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
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
                {caseData.archived_at && (
                  <Badge variant="outline" className="ml-2">
                    Archived
                  </Badge>
                )}
              </div>
              <p className="text-gray-600 mt-1">Case Number: {caseData.caseNumber}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* <Button
                onClick={() => navigate(`/ai-chat/${caseId}`)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Chat
            </Button> */}
            <Button
              variant="outline"
              onClick={() => setEditMode(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Case
            </Button>
            {caseData.archived_at ? (
              <Button 
                variant="outline"
                onClick={() => setUnarchiveConfirmOpen(true)}
              >
                <Archive className="h-4 w-4 mr-2" />
                Unarchive Case
              </Button>
            ) : (
              <Button 
                variant="outline"
                onClick={() => setArchiveConfirmOpen(true)}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive Case
              </Button>
            )}
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
            {/* <TabsTrigger value="timeline">Timeline</TabsTrigger> */}
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
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Clients
                      </label>
                      <div className="mb-2 flex flex-wrap gap-2">
                        {caseForm.clients.map((clientId, index) => {
                          const client = caseClientDetails.find(c => c.id === clientId);
                          return (
                            <Badge key={clientId} variant="secondary" className="flex items-center gap-1">
                              {client ? `${client.first_name} ${client.last_name}` : clientId}
                              <button
                                onClick={() => {
                                  const updatedClients = [...caseForm.clients];
                                  updatedClients.splice(index, 1);
                                  setCaseForm({...caseForm, clients: updatedClients});
                                }}
                                className="ml-1 hover:text-red-500"
                                aria-label="Remove client"
                              >
                                ×
                              </button>
                            </Badge>
                          );
                        })}
                        {caseForm.clients.length === 0 && (
                          <span className="text-gray-500 text-sm">No clients assigned</span>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        type="button" 
                        size="sm"
                        onClick={() => setClientDialogOpen(true)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Manage Clients
                      </Button>
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
                  <h3 className="font-medium text-gray-800">Discovery Documents</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Button variant="outline" className="justify-start h-auto py-3 flex-col items-start" onClick={() => navigate(`/form-interrogatories/${caseId}`)}>
                      <div className="flex items-center w-full mb-1">
                        <FileText className="h-4 w-4 mr-2" />
                        <span className="font-medium">Form Interrogatories</span>
                      </div>
                      <span className="text-xs text-gray-500 text-left">Standard questions for your case type</span>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-3 flex-col items-start" onClick={() => navigate(`/special-interrogatories/${caseId}`)}>
                      <div className="flex items-center w-full mb-1">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        <span className="font-medium">Special Interrogatories</span>
                      </div>
                      <span className="text-xs text-gray-500 text-left">Custom questions for this case</span>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-3 flex-col items-start" onClick={() => navigate(`/request-for-admissions/${caseId}`)}>
                      <div className="flex items-center w-full mb-1">
                        <FileText className="h-4 w-4 mr-2" />
                        <span className="font-medium">Request for Admissions</span>
                      </div>
                      <span className="text-xs text-gray-500 text-left">Ask party to admit/deny facts</span>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-3 flex-col items-start" onClick={() => navigate(`/request-for-production/${caseId}`)}>
                      <div className="flex items-center w-full mb-1">
                        <FileText className="h-4 w-4 mr-2" />
                        <span className="font-medium">Request for Production</span>
                      </div>
                      <span className="text-xs text-gray-500 text-left">Request documents and items</span>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-3 flex-col items-start" onClick={() => navigate(`/demand-letter/${caseId}`)}>
                      <div className="flex items-center w-full mb-1">
                        <FileText className="h-4 w-4 mr-2" />
                        <span className="font-medium">Demand Letter</span>
                      </div>
                      <span className="text-xs text-gray-500 text-left">Generate a demand letter</span>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-3 flex-col items-start" onClick={() => navigate(`/discovery-response/${caseId}`)}>
                      <div className="flex items-center w-full mb-1">
                        <FileText className="h-4 w-4 mr-2" />
                        <span className="font-medium">Discovery Response</span>
                      </div>
                      <span className="text-xs text-gray-500 text-left">Draft responses to discovery</span>
                    </Button>
                  </div>
                  
                  <h3 className="font-medium text-gray-800 mt-6">Other Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
                {isLoadingCaseClients ? (
                  <div className="py-8 text-center">
                    <div className="animate-pulse space-y-4 mx-auto max-w-md">
                      <div className="h-6 bg-gray-200 rounded"></div>
                      <div className="h-16 bg-gray-200 rounded"></div>
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ) : caseClientDetails.length > 0 ? (
                  <div className="space-y-6">
                    {caseClientDetails.map((client) => (
                      <div key={client.id} className="border rounded-md p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Name:</span>
                              <span className="font-medium">{client.first_name} {client.last_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Email:</span>
                              <span>{client.email || "No email provided"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Phone:</span>
                              <span>{client.phone || "No phone provided"}</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Client Since:</span>
                              <span>{format(parseISO(client.created_at), 'MMMM d, yyyy')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Status:</span>
                              <Badge>{client.user_id ? "Active" : "Pending"}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-end">
                      <Button onClick={() => setClientDialogOpen(true)}>
                        <Users className="h-4 w-4 mr-2" />
                        Add More Clients
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-2">No Clients Assigned</h3>
                    <p className="text-gray-500 mb-4">This case doesn't have any clients assigned yet.</p>
                    <Button onClick={() => setClientDialogOpen(true)}>
                      <Users className="h-4 w-4 mr-2" />
                      Add Clients
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

      {/* Unarchive Confirmation Dialog */}
      <Dialog open={unarchiveConfirmOpen} onOpenChange={setUnarchiveConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Archive className="h-5 w-5 mr-2" />
              Unarchive Case
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to unarchive the case "{caseData.name}"? This will restore it to active status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="sm:flex-1"
              onClick={() => setUnarchiveConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="sm:flex-1"
              onClick={handleUnarchiveCase}
            >
              Unarchive Case
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
              Notify Clients
            </DialogTitle>
            <DialogDescription>
              Send a notification to {caseData.clients?.length ? `${caseData.clients.length} client(s)` : "the clients"} regarding this case.
            </DialogDescription>
          </DialogHeader>
          
          {caseClientDetails.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipients
              </label>
              <div className="flex flex-wrap gap-2">
                {caseClientDetails.map((client) => (
                  <Badge key={client.id} variant="secondary">
                    {client.first_name} {client.last_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
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
              Add Clients to Case
            </DialogTitle>
            <DialogDescription>
              Select existing clients to add to this case.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-2">
            {/* Search existing clients */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Search Clients
                </label>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setClientDialogOpen(false);
                    setClientInviteModalOpen(true);
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite New Client
                </Button>
              </div>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={clientSearchQuery}
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value);
                    searchClients(e.target.value);
                  }}
                />
                
                <div className="border rounded-md max-h-60 overflow-y-auto">
                  {isLoadingClients ? (
                    <div className="text-center p-2 text-gray-500">Loading clients...</div>
                  ) : availableClients.length > 0 ? (
                    <div className="divide-y">
                      {availableClients.map(client => (
                        <div 
                          key={client.id}
                          className="flex items-center p-2 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            id={`client-${client.id}`}
                            checked={selectedClients.includes(client.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClients(prev => [...prev, client.id]);
                              } else {
                                setSelectedClients(prev => 
                                  prev.filter(id => id !== client.id)
                                );
                              }
                            }}
                            className="mr-2 h-4 w-4"
                          />
                          <label
                            htmlFor={`client-${client.id}`}
                            className="flex-1 flex flex-col cursor-pointer"
                          >
                            <span className="font-medium">
                              {client.first_name} {client.last_name}
                            </span>
                            <span className="text-sm text-gray-500">
                              {client.email}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-2 text-gray-500">
                      {clientSearchQuery 
                        ? "No clients found matching your search." 
                        : "No clients available. Click 'Invite New Client' to add one."}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Selected clients summary */}
            {selectedClients.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selected Clients ({selectedClients.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedClients.map((clientId) => {
                    const client = availableClients.find(c => c.id === clientId);
                    return (
                      <Badge key={clientId} variant="secondary" className="flex items-center gap-1">
                        {client ? `${client.first_name} ${client.last_name}` : clientId}
                        <button 
                          onClick={() => setSelectedClients(prev => 
                            prev.filter(id => id !== clientId)
                          )}
                          className="ml-1 hover:text-red-500"
                          aria-label="Remove client"
                        >
                          ×
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="sm:flex-1"
              onClick={() => {
                setClientDialogOpen(false);
                setSelectedClients([]);
                setClientSearchQuery("");
              }}
            >
              Cancel
            </Button>
            <Button 
              className="sm:flex-1"
              disabled={selectedClients.length === 0}
              onClick={handleAddClient}
            >
              Add to Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Invite Modal */}
      <ClientInviteModal 
        open={clientInviteModalOpen}
        onClose={() => setClientInviteModalOpen(false)}
        onSuccess={handleClientInvited}
      />

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
          .list(`${user.id}/cases/${caseId}`, {
            sortBy: { column: 'name', order: 'desc' }
          });
        
        if (storageError) throw storageError;
        
        // Create document objects for storage files that aren't in the database
        const dbPaths = new Set((dbDocuments || []).map(doc => doc.path));
        const storageDocuments: Document[] = [];
        
        for (const item of storageData || []) {
          if (!item.id || item.id === '.emptyFolderPlaceholder') continue;
          
          const filePath = `${user.id}/cases/${caseId}/${item.name}`;
          
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