
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
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, 
  MoreHorizontal, 
  FileText, 
  Download, 
  AlertTriangle,
  Folder,
  FolderOpen,
  RefreshCw,
  Trash2,
  Filter,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Mock data for archived cases
const archivedCasesData = [
  { 
    id: "1", 
    name: "Rodriguez v. Smith Corp", 
    client: "Maria Rodriguez", 
    type: "Employment", 
    outcome: "Settlement",
    archiveDate: "Jun 15, 2023",
    closedDate: "Jun 10, 2023",
    documentsCount: 24
  },
  { 
    id: "2", 
    name: "Johnson Estate", 
    client: "Johnson Family", 
    type: "Estate Planning", 
    outcome: "Closed",
    archiveDate: "May 22, 2023",
    closedDate: "May 20, 2023",
    documentsCount: 15
  },
  { 
    id: "3", 
    name: "Taylor Divorce", 
    client: "Robert Taylor", 
    type: "Family Law", 
    outcome: "Judgment",
    archiveDate: "Apr 10, 2023",
    closedDate: "Apr 5, 2023",
    documentsCount: 32
  },
  { 
    id: "4", 
    name: "Wilson v. City Hospital", 
    client: "James Wilson", 
    type: "Medical Malpractice", 
    outcome: "Settlement",
    archiveDate: "Mar 5, 2023",
    closedDate: "Mar 1, 2023",
    documentsCount: 48
  },
  { 
    id: "5", 
    name: "Martínez Immigration", 
    client: "Ana Martínez", 
    type: "Immigration", 
    outcome: "Approved",
    archiveDate: "Feb 18, 2023",
    closedDate: "Feb 15, 2023",
    documentsCount: 18
  },
  { 
    id: "6", 
    name: "ABC Corp Merger", 
    client: "ABC Corporation", 
    type: "Corporate", 
    outcome: "Completed",
    archiveDate: "Jan 30, 2023",
    closedDate: "Jan 25, 2023",
    documentsCount: 57
  },
  { 
    id: "7", 
    name: "Parker Bankruptcy", 
    client: "Susan Parker", 
    type: "Bankruptcy", 
    outcome: "Discharged",
    archiveDate: "Dec 12, 2022",
    closedDate: "Dec 8, 2022",
    documentsCount: 29
  },
  { 
    id: "8", 
    name: "Thomas v. Insurance Co", 
    client: "William Thomas", 
    type: "Insurance Claim", 
    outcome: "Settlement",
    archiveDate: "Nov 8, 2022",
    closedDate: "Nov 5, 2022",
    documentsCount: 36
  },
];

// Mock data for archived case documents
const caseDocumentsData = [
  { id: "d1", name: "Complaint", type: "Legal Filing", date: "Jan 15, 2023", size: "1.2 MB" },
  { id: "d2", name: "Answer", type: "Legal Filing", date: "Feb 10, 2023", size: "876 KB" },
  { id: "d3", name: "First Set of Interrogatories", type: "Discovery", date: "Mar 5, 2023", size: "1.8 MB" },
  { id: "d4", name: "Response to Interrogatories", type: "Discovery", date: "Apr 2, 2023", size: "2.3 MB" },
  { id: "d5", name: "Settlement Agreement", type: "Agreement", date: "Jun 1, 2023", size: "1.5 MB" }
];

const ArchivePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [caseDetailsOpen, setCaseDetailsOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Filter cases based on search query
  const filteredCases = archivedCasesData.filter(caseItem => {
    return (
      caseItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseItem.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseItem.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseItem.outcome.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCaseClick = (caseItem: any) => {
    setSelectedCase(caseItem);
    setCaseDetailsOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Archive</h1>
            <p className="text-gray-600 mt-1">Access closed and archived cases and their documents</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search archived cases..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-none">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" className="flex-none">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case Name</TableHead>
                  <TableHead className="hidden md:table-cell">Client</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="hidden sm:table-cell">Archived Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Documents</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.length > 0 ? (
                  filteredCases.map((caseItem) => (
                    <TableRow key={caseItem.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleCaseClick(caseItem)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <FolderOpen className="h-4 w-4 mr-2 text-doculaw-300" />
                          {caseItem.name}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{caseItem.client}</TableCell>
                      <TableCell className="hidden md:table-cell">{caseItem.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-100">
                          {caseItem.outcome}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{caseItem.archiveDate}</TableCell>
                      <TableCell className="hidden lg:table-cell">{caseItem.documentsCount}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Archive Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleCaseClick(caseItem);
                            }}>
                              <FileText className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Download className="h-4 w-4 mr-2" />
                              Download All Files
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Restore Case
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCase(caseItem);
                                setDeleteConfirmOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                      No archived cases found. Try adjusting your search or filters.
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
              <DialogTitle className="text-xl flex items-center">
                <Folder className="h-5 w-5 mr-2 text-doculaw-500" />
                {selectedCase.name}
              </DialogTitle>
              <DialogDescription>
                Archived on {selectedCase.archiveDate}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Case Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Client:</span>
                    <span className="font-medium">{selectedCase.client}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Case Type:</span>
                    <span>{selectedCase.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Outcome:</span>
                    <Badge variant="outline" className="bg-gray-100">
                      {selectedCase.outcome}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Closed Date:</span>
                    <span>{selectedCase.closedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Archive Date:</span>
                    <span>{selectedCase.archiveDate}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Archive Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Documents:</span>
                    <span className="font-medium">{selectedCase.documentsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Storage Size:</span>
                    <span>~{Math.round(selectedCase.documentsCount * 1.5 * 10) / 10} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Accessed:</span>
                    <span>Never</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="font-semibold text-gray-800 mb-2">Case Documents</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caseDocumentsData.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-gray-400" />
                            {doc.name}
                          </div>
                        </TableCell>
                        <TableCell>{doc.type}</TableCell>
                        <TableCell>{doc.date}</TableCell>
                        <TableCell>{doc.size}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between mt-4">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download All Documents
              </Button>
              <div className="flex gap-2">
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restore Case
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setCaseDetailsOpen(false);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </Button>
              </div>
            </DialogFooter>
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
                Delete Permanently
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete "{selectedCase.name}" and all associated documents? This action cannot be undone.
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
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </DashboardLayout>
  );
};

export default ArchivePage;
