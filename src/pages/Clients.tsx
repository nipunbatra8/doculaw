
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, AlertCircle } from "lucide-react";
import ClientsFilters from "@/components/filters/ClientsFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import ClientInviteModal from "@/components/clients/ClientInviteModal";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
}

const ClientsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
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
      // In a real app, we would join with the cases table to get actual case counts
      return data.map(client => ({
        ...client,
        name: `${client.first_name} ${client.last_name}`,
        status: 'Active', // Default status until we have real status tracking
        cases_count: 0,    // Default count until we implement case counting
      }));
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
                          variant={client.status === "Active" ? "default" : "secondary"}
                        >
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{client.cases_count} active cases</TableCell>
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
    </DashboardLayout>
  );
};

export default ClientsPage;
