
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
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
  AlertTriangle 
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  // Additional fields we'll create for UI display
  lastActivity?: string;
  caseNumber?: string;
  court?: string;
  filedDate?: string;
};

const CasesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [caseDetailsOpen, setCaseDetailsOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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
          `name.ilike.%${searchQuery}%,client.ilike.%${searchQuery}%,case_type.ilike.%${searchQuery}%`
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
    setSelectedCase(caseItem);
    setCaseDetailsOpen(true);
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
                      <TableCell>{caseItem.client}</TableCell>
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
                              handleActionClick(caseItem);
                            }}>
                              <FileText className="h-4 w-4 mr-2" />
                              Propound Discovery Request
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick(caseItem);
                            }}>
                              <FileText className="h-4 w-4 mr-2" />
                              Draft Discovery Response
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Send className="h-4 w-4 mr-2" />
                              Notify Client
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Users className="h-4 w-4 mr-2" />
                              Add Client
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Case
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
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
                    <span className="font-medium">{selectedCase.client}</span>
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
              <Button 
                variant="default"
                className="bg-doculaw-500 hover:bg-doculaw-600"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Case
              </Button>
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
              <Button className="w-full justify-start" variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Notify Client
              </Button>
              <Button className="w-full justify-start" variant="outline">
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
