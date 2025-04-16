
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search, 
  PlusCircle, 
  MoreHorizontal, 
  FileText, 
  Mail, 
  Phone, 
  Edit, 
  Trash2, 
  AlertTriangle,
  CheckCircle2,
  ListFilter,
  Briefcase
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Mock data for clients
const clientsData = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "(555) 123-4567",
    type: "Individual",
    activeCases: 2,
    status: "Active",
    lastActivity: "Today"
  },
  {
    id: "2",
    name: "Davidson LLC",
    email: "contact@davidsonllc.com",
    phone: "(555) 987-6543",
    type: "Business",
    activeCases: 1,
    status: "Active",
    lastActivity: "Yesterday"
  },
  {
    id: "3",
    name: "Sarah Thompson",
    email: "sarah.thompson@example.com",
    phone: "(555) 234-5678",
    type: "Individual",
    activeCases: 1,
    status: "Active",
    lastActivity: "2 days ago"
  },
  {
    id: "4",
    name: "Williams Family",
    email: "williams.estate@example.com",
    phone: "(555) 345-6789",
    type: "Family",
    activeCases: 1,
    status: "Active",
    lastActivity: "3 days ago"
  },
  {
    id: "5",
    name: "Elena Martinez",
    email: "elena.martinez@example.com",
    phone: "(555) 456-7890",
    type: "Individual",
    activeCases: 1,
    status: "Active",
    lastActivity: "1 week ago"
  },
  {
    id: "6",
    name: "Tom Roberts",
    email: "tom.roberts@example.com",
    phone: "(555) 567-8901",
    type: "Individual",
    activeCases: 1,
    status: "Inactive",
    lastActivity: "2 weeks ago"
  },
  {
    id: "7",
    name: "Anderson LLC",
    email: "info@andersonllc.com",
    phone: "(555) 678-9012",
    type: "Business",
    activeCases: 1,
    status: "Active",
    lastActivity: "3 weeks ago"
  },
  {
    id: "8",
    name: "Carlos Garcia",
    email: "carlos.garcia@example.com",
    phone: "(555) 789-0123",
    type: "Individual",
    activeCases: 0,
    status: "Inactive",
    lastActivity: "1 month ago"
  },
];

// Mock data for client cases
const clientCases = [
  { id: "c1", name: "Smith v. Johnson", type: "Personal Injury", status: "Active", filed: "Jun 15, 2023" },
  { id: "c2", name: "Smith v. Acme Corp", type: "Employment", status: "Active", filed: "Apr 10, 2023" }
];

// Mock data for client questionnaires
const clientQuestionnaires = [
  { id: "q1", title: "Smith v. Johnson - Interrogatories", status: "Completed", sent: "Jul 5, 2023", completed: "Jul 10, 2023" },
  { id: "q2", title: "Smith v. Johnson - Deposition Prep", status: "Pending", sent: "Jul 15, 2023", completed: null }
];

const ClientsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [clientDetailsOpen, setClientDetailsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    email: "",
    phone: "",
    type: "Individual"
  });

  // Filter clients based on search query
  const filteredClients = clientsData.filter(client => {
    return (
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery) ||
      client.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleClientClick = (client: any) => {
    setSelectedClient(client);
    setClientDetailsOpen(true);
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would add the client to the database
    console.log("New client data:", newClientForm);
    setAddClientOpen(false);
    
    // Reset form
    setNewClientForm({
      name: "",
      email: "",
      phone: "",
      type: "Individual"
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600 mt-1">Manage your clients and their case information</p>
          </div>
          <Button 
            className="bg-doculaw-500 hover:bg-doculaw-600 text-white"
            onClick={() => setAddClientOpen(true)}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search clients by name, email, or phone..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="flex-none">
            <ListFilter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead>Cases</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <TableRow key={client.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleClientClick(client)}>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-3">
                            <AvatarFallback className="bg-doculaw-200 text-doculaw-700">
                              {client.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{client.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{client.email}</TableCell>
                      <TableCell className="hidden md:table-cell">{client.phone}</TableCell>
                      <TableCell className="hidden sm:table-cell">{client.type}</TableCell>
                      <TableCell>{client.activeCases}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={client.status === "Active" ? "default" : "outline"}>
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Client Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Mail className="h-4 w-4 mr-2" />
                              Email Client
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <FileText className="h-4 w-4 mr-2" />
                              Send Questionnaire
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Briefcase className="h-4 w-4 mr-2" />
                              Add to Case
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Client
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClient(client);
                                setDeleteConfirmOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Client
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                      No clients found. Try adjusting your search or filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Client Details Dialog */}
      <Dialog open={clientDetailsOpen} onOpenChange={setClientDetailsOpen}>
        {selectedClient && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Client Details</DialogTitle>
            </DialogHeader>
            
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex flex-col items-center">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-3xl bg-doculaw-200 text-doculaw-700">
                    {selectedClient.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-2 font-bold text-lg">{selectedClient.name}</p>
                <Badge variant={selectedClient.status === "Active" ? "default" : "outline"} className="mt-1">
                  {selectedClient.status}
                </Badge>
              </div>
              
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Contact Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-500 mr-2" />
                      <span>{selectedClient.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-500 mr-2" />
                      <span>{selectedClient.phone}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Client Cases</h3>
                  {clientCases.length > 0 ? (
                    <div className="space-y-2">
                      {clientCases.map((caseItem) => (
                        <div key={caseItem.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                          <div>
                            <p className="font-medium">{caseItem.name}</p>
                            <p className="text-sm text-gray-500">{caseItem.type} • Filed: {caseItem.filed}</p>
                          </div>
                          <Badge variant={caseItem.status === "Active" ? "default" : "outline"}>
                            {caseItem.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No active cases for this client.</p>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Questionnaires</h3>
                  {clientQuestionnaires.length > 0 ? (
                    <div className="space-y-2">
                      {clientQuestionnaires.map((questionnaire) => (
                        <div key={questionnaire.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                          <div>
                            <p className="font-medium">{questionnaire.title}</p>
                            <p className="text-sm text-gray-500">Sent: {questionnaire.sent}</p>
                          </div>
                          <div className="flex items-center">
                            {questionnaire.status === "Completed" ? (
                              <div className="flex items-center text-green-600">
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                <span>Completed</span>
                              </div>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No questionnaires sent to this client.</p>
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between mt-4">
              <div className="flex flex-col xs:flex-row gap-2">
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  New Questionnaire
                </Button>
              </div>
              <Button 
                variant="default"
                className="bg-doculaw-500 hover:bg-doculaw-600"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Add Client Dialog */}
      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Enter the client's information to add them to your client list.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddClient}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Client Name
                </label>
                <Input
                  id="name"
                  placeholder="Enter client name"
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm({...newClientForm, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="client@example.com"
                  value={newClientForm.email}
                  onChange={(e) => setNewClientForm({...newClientForm, email: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  placeholder="(555) 123-4567"
                  value={newClientForm.phone}
                  onChange={(e) => setNewClientForm({...newClientForm, phone: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="type" className="text-sm font-medium">
                  Client Type
                </label>
                <select
                  id="type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newClientForm.type}
                  onChange={(e) => setNewClientForm({...newClientForm, type: e.target.value})}
                >
                  <option value="Individual">Individual</option>
                  <option value="Business">Business</option>
                  <option value="Family">Family</option>
                </select>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setAddClientOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-doculaw-500 hover:bg-doculaw-600">
                Add Client
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        {selectedClient && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Delete Client
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the client "{selectedClient.name}"? This action cannot be undone.
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
                Delete Client
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </DashboardLayout>
  );
};

export default ClientsPage;
