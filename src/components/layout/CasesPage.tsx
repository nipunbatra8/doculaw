import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import CreateCaseModal from "@/components/CreateCaseModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  PlusCircle, 
  MoreHorizontal, 
  FileText, 
  Send, 
  Users, 
  Edit, 
  Trash2, 
  Archive, 
  AlertTriangle,
  UserPlus
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import ClientInviteModal from "@/components/clients/ClientInviteModal";

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
  // Additional fields we'll create for UI display
  lastActivity?: string;
  caseNumber?: string;
  court?: string;
  filedDate?: string;
};

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

const CasesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [caseDetailsOpen, setCaseDetailsOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  
  // Form fields
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notificationSubject, setNotificationSubject] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");

  // New state variables
  const [clientSearchQuery, setClientSearchQuery] = useState<string>("");
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState<boolean>(false);
  const [caseClientDetails, setCaseClientDetails] = useState<Client[]>([]);
  const [isLoadingCaseClients, setIsLoadingCaseClients] = useState<boolean>(false);
  const [clientInviteModalOpen, setClientInviteModalOpen] = useState<boolean>(false);

  // Fetch cases for the logged-in user
  const { data: casesData = [], isLoading, error, refetch } = useQuery({
    queryKey: ['cases', user?.id, activeTab, searchQuery],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('cases')
        .select('*')
        .eq('user_id', user.id);
      
      // Apply tab filter
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab.charAt(0).toUpperCase() + activeTab.slice(1));
      }
      
      // Apply search query
      if (searchQuery) {
        query = query.or(
          `name.ilike.%${searchQuery}%,case_type.ilike.%${searchQuery}%`
        );
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Enhance data with additional UI fields
      return data.map((caseItem: CaseData) => ({
        ...caseItem,
        lastActivity: formatRelativeTime(caseItem.updated_at),
        caseNumber: `CV-${new Date(caseItem.created_at).getFullYear()}-${caseItem.id.substring(0, 5)}`,
        court: getCourt(caseItem.case_type),
        filedDate: format(parseISO(caseItem.created_at), 'MMM d, yyyy')
      }));
    },
    enabled: !!user
  });

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

  const handleCaseClick = (caseItem: CaseData) => {
    navigate(`/case/${caseItem.id}`);
  };

  const handleActionClick = (caseItem: CaseData) => {
    setSelectedCase(caseItem);
    setActionModalOpen(true);
  };

  const handleDeleteCase = async () => {
    if (!selectedCase) return;
    
    try {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', selectedCase.id);
        
      if (error) throw error;
      
      toast({
        title: "Case Deleted",
        description: "The case has been permanently deleted.",
      });
      
      setDeleteConfirmOpen(false);
      setCaseDetailsOpen(false);
      refetch();
    } catch (error) {
      console.error('Error deleting case:', error);
      toast({
        title: "Error",
        description: "Failed to delete the case. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleArchiveCase = async () => {
    if (!selectedCase) return;
    
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          archived_at: new Date().toISOString(),
          status: 'Inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCase.id);
        
      if (error) throw error;
      
      toast({
        title: "Case Archived",
        description: "The case has been moved to the archive.",
      });
      
      setArchiveConfirmOpen(false);
      setCaseDetailsOpen(false);
      refetch();
    } catch (error) {
      console.error('Error archiving case:', error);
      toast({
        title: "Error",
        description: "Failed to archive the case. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddClient = async () => {
    if (!selectedCase || selectedClients.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          clients: selectedClients,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCase.id);
        
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

  const fetchCaseClientDetails = async (caseItem: CaseData) => {
    if (!user || !caseItem?.clients || caseItem.clients.length === 0) {
      setCaseClientDetails([]);
      return;
    }
    
    setIsLoadingCaseClients(true);
    try {
      // Fetch details for all clients assigned to this case
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .in('id', caseItem.clients);
      
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

  const handleClientInvited = () => {
    toast({
      title: "Success",
      description: "Client has been invited. You can now add them to this case.",
    });
    setClientInviteModalOpen(false);
    // Refresh the clients list
    searchClients("");
  };

  useEffect(() => {
    if (clientDialogOpen && selectedCase) {
      searchClients("");
      // Initialize selected clients from case
      if (selectedCase.clients) {
        setSelectedClients(selectedCase.clients);
      } else {
        setSelectedClients([]);
      }
    }
  }, [clientDialogOpen, selectedCase]);

  useEffect(() => {
    if (selectedCase) {
      fetchCaseClientDetails(selectedCase);
    }
  }, [selectedCase]);

  const handleSendNotification = () => {
    if (!selectedCase) return;
    
    if (!selectedCase.clients || selectedCase.clients.length === 0) {
      toast({
        title: "No Clients Assigned",
        description: "Please add clients to this case first.",
        variant: "destructive"
      });
      setNotifyDialogOpen(false);
      return;
    }
    
    // In a real app, this would be an API call to send an email/message
    toast({
      title: "Notification Sent",
      description: `A notification has been sent to ${caseClientDetails.length} client(s).`,
    });
    
    setNotifyDialogOpen(false);
  };

  return (
    <div>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cases</h1>
            <p className="text-gray-600 mt-1">Manage your legal cases and discovery workflows</p>
          </div>
          <Button 
            className="bg-doculaw-500 hover:bg-doculaw-600 text-white"
            onClick={() => setIsCreateCaseModalOpen(true)}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search cases by name, client, or number..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs defaultValue="all" className="flex-none" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Case Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading cases...
                    </TableCell>
                  </TableRow>
                ) : casesData.length > 0 ? (
                  casesData.map((caseItem: CaseData) => (
                    <TableRow key={caseItem.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleCaseClick(caseItem)}>
                      <TableCell className="font-medium">{caseItem.name}</TableCell>
                      <TableCell>
                        {caseItem.clients && caseItem.clients.length > 0 ? 
                          `${caseItem.clients.length} client(s)` : 
                          "No clients"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{caseItem.case_type}</TableCell>
                      <TableCell className="hidden md:table-cell">{caseItem.caseNumber}</TableCell>
                      <TableCell>
                        <Badge variant={
                          caseItem.status === "Active" ? "default" : 
                          caseItem.status === "Pending" ? "secondary" : 
                          "outline"
                        }>
                          {caseItem.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{caseItem.lastActivity}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/discovery-request/${caseItem.id}`);
                            }}>
                              <FileText className="h-4 w-4 mr-2" />
                              Propound Discovery Request
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/discovery-response/${caseItem.id}`);
                            }}>
                              <FileText className="h-4 w-4 mr-2" />
                              Draft Discovery Response
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCase(caseItem);
                              setNotifyDialogOpen(true);
                            }}>
                              <Send className="h-4 w-4 mr-2" />
                              Notify Client
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCase(caseItem);
                              setClientDialogOpen(true);
                            }}>
                              <Users className="h-4 w-4 mr-2" />
                              Add Client
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/case/${caseItem.id}`);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Case
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCase(caseItem);
                              setArchiveConfirmOpen(true);
                            }}>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive Case
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCase(caseItem);
                                setDeleteConfirmOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Case
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                      No cases found. Try adjusting your search or filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Case Details Dialog */}
      <Dialog open={caseDetailsOpen} onOpenChange={setCaseDetailsOpen}>
        {selectedCase && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedCase.name}</DialogTitle>
              <DialogDescription>
                <Badge variant={
                  selectedCase.status === "Active" ? "default" : 
                  selectedCase.status === "Pending" ? "secondary" : 
                  "outline"
                } className="mt-2">
                  {selectedCase.status}
                </Badge>
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Case Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Case Number:</span>
                    <span className="font-medium">{selectedCase.caseNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Filing Date:</span>
                    <span>{selectedCase.filedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Court:</span>
                    <span>{selectedCase.court}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type:</span>
                    <span>{selectedCase.case_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Activity:</span>
                    <span>{selectedCase.lastActivity}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Client Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Client Name:</span>
                    <span className="font-medium">{selectedCase.clients ? selectedCase.clients.length.toString() : "No clients"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contact:</span>
                    <span>client@example.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span>(555) 123-4567</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="font-semibold text-gray-800 mb-2">Discovery Status</h3>
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
            </div>
            
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between mt-4">
              <div className="flex flex-col xs:flex-row gap-2">
                <Button variant="outline" asChild>
                  <Link to={`/discovery-request/${selectedCase.id}`}>
                    <FileText className="h-4 w-4 mr-2" />
                    Propound Request
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/discovery-response/${selectedCase.id}`}>
                    <FileText className="h-4 w-4 mr-2" />
                    Draft Response
                  </Link>
                </Button>
              </div>
              <div className="flex flex-col xs:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCaseDetailsOpen(false);
                    setNotifyDialogOpen(true);
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Notify Client
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCaseDetailsOpen(false);
                    setClientDialogOpen(true);
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Add Client
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setCaseDetailsOpen(false);
                    setArchiveConfirmOpen(true);
                  }}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
                <Button 
                  variant="default"
                  className="bg-doculaw-500 hover:bg-doculaw-600"
                  asChild
                >
                  <Link to={`/case/${selectedCase.id}`}>
                    <Edit className="h-4 w-4 mr-2" />
                    View Case
                  </Link>
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Action Modal */}
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        {selectedCase && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Choose Action for {selectedCase.name}</DialogTitle>
              <DialogDescription>
                Select a discovery action to perform for this case.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 my-2">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to={`/discovery-request/${selectedCase.id}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Propound Discovery Request
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to={`/discovery-response/${selectedCase.id}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Draft Discovery Response
                </Link>
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => {
                  setActionModalOpen(false);
                  setNotifyDialogOpen(true);
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Notify Client
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => {
                  setActionModalOpen(false);
                  setClientDialogOpen(true);
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        {selectedCase && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Delete Case
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the case "{selectedCase.name}"? This action cannot be undone.
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
        )}
      </Dialog>

      {/* Archive Confirmation */}
      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        {selectedCase && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Archive className="h-5 w-5 mr-2" />
                Archive Case
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to archive the case "{selectedCase.name}"? You can access it later from the Archive section.
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
        )}
      </Dialog>

      {/* Notify Client Dialog */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        {selectedCase && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Send className="h-5 w-5 mr-2" />
                Notify Client
              </DialogTitle>
              <DialogDescription>
                Send a notification to {selectedCase.clients ? selectedCase.clients.length.toString() : "the clients"} regarding this case.
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
                  placeholder="Enter your message to the clients..."
                  className="min-h-[120px]"
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
        )}
      </Dialog>

      {/* Add Client Dialog */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        {selectedCase && (
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
        )}
      </Dialog>

      {/* Client Invite Modal */}
      <ClientInviteModal 
        open={clientInviteModalOpen}
        onClose={() => setClientInviteModalOpen(false)}
        onSuccess={handleClientInvited}
      />

      {/* Create Case Modal */}
      <CreateCaseModal 
        isOpen={isCreateCaseModalOpen} 
        onOpenChange={setIsCreateCaseModalOpen} 
        onCaseCreated={() => refetch()}
      />
    </div>
  );
};

export default CasesPage;
