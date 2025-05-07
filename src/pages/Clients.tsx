import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, AlertCircle, MoreHorizontal, Trash2, ExternalLink, Mail } from "lucide-react";
import ClientsFilters from "@/components/filters/ClientsFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import ClientInviteModal from "@/components/clients/ClientInviteModal";
import DeleteClientModal from "@/components/clients/DeleteClientModal";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  case_type: string | null;
  status: string;
  created_at: string;
  cases_count: number;
  user_id: string | null;
}

const ClientsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    caseType: "all",
  });

  // Fetch clients from the database
  const { data: clients = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('lawyer_id', user.id);
      
      if (error) {
        throw error;
      }
      
      // Transform the data to include status and cases_count
      // Note: status is added here since it's not in the database schema
      return data.map(client => {
        // Determine status based on user_id or other fields
        let status = 'Active';
        if (!client.user_id) {
          status = 'Pending';
        }
        
        return {
          ...client,
          name: `${client.first_name} ${client.last_name}`,
          status: status, // Add status property
          cases_count: 0, // Default count until we implement case counting
        };
      });
    },
    enabled: !!user
  });

  useEffect(() => {
    if (clients) {
      filterClients();
    }
  }, [filters, clients]);

  const filterClients = () => {
    if (!clients) return;
    
    let filtered = [...clients];

    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchLower) ||
          c.email.toLowerCase().includes(searchLower) ||
          (c.phone && c.phone.toLowerCase().includes(searchLower))
      );
    }

    // Filter by status
    if (filters.status !== "all") {
      filtered = filtered.filter(
        (c) => c.status.toLowerCase() === filters.status.toLowerCase()
      );
    }

    // Filter by case type
    if (filters.caseType !== "all") {
      filtered = filtered.filter((c) => c.case_type === filters.caseType);
    }

    setFilteredClients(filtered);
  };

  const handleSearch = (query: string) => {
    setFilters({ ...filters, search: query });
  };

  const handleFilterChange = (type: string, value: string) => {
    setFilters({ ...filters, [type]: value });
  };

  const handleClientInvited = () => {
    refetch();
    toast({
      title: "Success",
      description: "Client has been invited and added to your clients list.",
    });
  };

  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const handleClientDeleted = () => {
    refetch();
    setShowDeleteModal(false);
    setClientToDelete(null);
  };

  const handleResendInvite = async (client: Client) => {
    if (!user) return;
    
    try {
      // Get lawyer name for the email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      const lawyerName = profileData?.name || "Your lawyer";

      // Resend the invitation email
      const { error } = await supabase.functions.invoke("send-client-invitation", {
        body: {
          email: client.email,
          firstName: client.first_name,
          lastName: client.last_name,
          lawyerName: lawyerName,
          clientId: client.id,
          redirectTo: `${window.location.origin}/client-dashboard`
        },
      });

      if (error) throw error;

      toast({
        title: "Invitation resent",
        description: `A new invitation email has been sent to ${client.email}`,
      });
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast({
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600 mt-1">Manage your clients and their cases</p>
          </div>
          <div className="flex gap-3">
            <Button 
              className="bg-doculaw-500 hover:bg-doculaw-600"
              onClick={() => setShowInviteModal(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </div>
        </div>

        <ClientsFilters 
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
        />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <Users className="h-5 w-5 mr-2 text-doculaw-500" />
              All Clients
            </CardTitle>
            <CardDescription>A list of all your clients and their active cases</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-doculaw-500"></div>
              </div>
            ) : isError ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-medium">Error Loading Clients</h3>
                <p className="text-gray-500 mt-2">There was a problem loading your clients. Please refresh the page.</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center p-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Users className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium">No clients found</h3>
                <p className="text-gray-500 mt-2">
                  {clients.length === 0 
                    ? "You haven't added any clients yet." 
                    : "No clients match your current filters."}
                </p>
                {clients.length === 0 && (
                  <Button 
                    className="mt-4 bg-doculaw-500 hover:bg-doculaw-600"
                    onClick={() => setShowInviteModal(true)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Your First Client
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Case Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cases</TableHead>
                    {/* <TableHead className="w-[80px]">Actions</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback className="bg-doculaw-200 text-doculaw-700">
                              {client.first_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{`${client.first_name} ${client.last_name}`}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{client.email}</div>
                        <div className="text-sm text-gray-500">{client.phone || "No phone"}</div>
                      </TableCell>
                      <TableCell>{client.case_type || "Not specified"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={client.status.toLowerCase() === "active" ? "default" : 
                                 client.status.toLowerCase() === "invited" ? "secondary" :
                                 client.status.toLowerCase() === "pending" ? "outline" : "secondary"}
                        >
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{client.cases_count} active cases</TableCell>
                      {/* <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end"> */}
                            {/* <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => window.open(`/clients/${client.id}`, '_blank')}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem> */}
                            
                            {/* {client.status.toLowerCase() === "invited" && (
                              <DropdownMenuItem 
                                className="cursor-pointer"
                                onClick={() => handleResendInvite(client)}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Resend Invitation
                              </DropdownMenuItem>
                            )} */}
                            
                            {/* <DropdownMenuSeparator /> */}
                            
                            {/* <DropdownMenuItem 
                              className="cursor-pointer text-red-600"
                              onClick={() => handleDeleteClient(client)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Client
                            </DropdownMenuItem> */}
                          {/* </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell> */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ClientInviteModal 
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={handleClientInvited}
      />
      
      <DeleteClientModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={handleClientDeleted}
        client={clientToDelete}
      />
    </DashboardLayout>
  );
};

export default ClientsPage;
