
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
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

// Mock data for cases
const casesData = [
  { 
    id: "1", 
    name: "Smith v. Johnson", 
    client: "John Smith", 
    type: "Personal Injury", 
    status: "Active", 
    lastActivity: "Today",
    filedDate: "Jun 15, 2023",
    court: "County Court",
    caseNumber: "CV-2023-12345"
  },
  { 
    id: "2", 
    name: "Davidson LLC v. Metro Corp", 
    client: "Davidson LLC", 
    type: "Business Dispute", 
    status: "Active", 
    lastActivity: "Yesterday",
    filedDate: "Apr 22, 2023",
    court: "District Court",
    caseNumber: "CV-2023-87654"
  },
  { 
    id: "3", 
    name: "Thompson Divorce", 
    client: "Sarah Thompson", 
    type: "Family Law", 
    status: "Pending", 
    lastActivity: "2 days ago",
    filedDate: "Jul 10, 2023",
    court: "Family Court",
    caseNumber: "FL-2023-56789"
  },
  { 
    id: "4", 
    name: "Williams Estate", 
    client: "Williams Family", 
    type: "Estate Planning", 
    status: "Active", 
    lastActivity: "3 days ago",
    filedDate: "Mar 5, 2023",
    court: "Probate Court",
    caseNumber: "PR-2023-43210"
  },
  { 
    id: "5", 
    name: "Martinez v. City", 
    client: "Elena Martinez", 
    type: "Civil Rights", 
    status: "Active", 
    lastActivity: "1 week ago",
    filedDate: "Feb 18, 2023",
    court: "Federal Court",
    caseNumber: "CV-2023-76543"
  },
  { 
    id: "6", 
    name: "Roberts Bankruptcy", 
    client: "Tom Roberts", 
    type: "Bankruptcy", 
    status: "Pending", 
    lastActivity: "2 weeks ago",
    filedDate: "May 30, 2023",
    court: "Bankruptcy Court",
    caseNumber: "BK-2023-98765"
  },
  { 
    id: "7", 
    name: "Anderson LLC Tax Appeal", 
    client: "Anderson LLC", 
    type: "Tax Law", 
    status: "Active", 
    lastActivity: "3 weeks ago",
    filedDate: "Jan 12, 2023",
    court: "Tax Court",
    caseNumber: "TX-2023-24680"
  },
  { 
    id: "8", 
    name: "Garcia Immigration", 
    client: "Carlos Garcia", 
    type: "Immigration", 
    status: "Inactive", 
    lastActivity: "1 month ago",
    filedDate: "Nov 8, 2022",
    court: "Immigration Court",
    caseNumber: "IM-2022-13579"
  },
];

const CasesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [caseDetailsOpen, setCaseDetailsOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Filter cases based on search query and active tab
  const filteredCases = casesData.filter(caseItem => {
    const matchesSearch = 
      caseItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseItem.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseItem.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseItem.caseNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "active") return matchesSearch && caseItem.status === "Active";
    if (activeTab === "pending") return matchesSearch && caseItem.status === "Pending";
    if (activeTab === "inactive") return matchesSearch && caseItem.status === "Inactive";
    
    return matchesSearch;
  });

  const handleCaseClick = (caseItem: any) => {
    setSelectedCase(caseItem);
    setCaseDetailsOpen(true);
  };

  const handleActionClick = (caseItem: any) => {
    setSelectedCase(caseItem);
    setActionModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cases</h1>
            <p className="text-gray-600 mt-1">Manage your legal cases and discovery workflows</p>
          </div>
          <Button className="bg-doculaw-500 hover:bg-doculaw-600 text-white">
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
                {filteredCases.length > 0 ? (
                  filteredCases.map((caseItem) => (
                    <TableRow key={caseItem.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleCaseClick(caseItem)}>
                      <TableCell className="font-medium">{caseItem.name}</TableCell>
                      <TableCell>{caseItem.client}</TableCell>
                      <TableCell className="hidden md:table-cell">{caseItem.type}</TableCell>
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
                    <span>{selectedCase.type}</span>
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
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Delete Case
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </DashboardLayout>
  );
};

export default CasesPage;
