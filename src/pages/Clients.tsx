import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users } from "lucide-react";
import ClientsFilters from "@/components/filters/ClientsFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

// Mock client data
const mockClients = [
  { id: "1", name: "John Smith", email: "john.smith@example.com", phone: "(555) 123-4567", caseType: "Personal Injury", status: "Active", casesCount: 2 },
  { id: "2", name: "Sarah Johnson", email: "sarah.j@example.com", phone: "(555) 987-6543", caseType: "Family Law", status: "Active", casesCount: 1 },
  { id: "3", name: "Davidson LLC", email: "contact@davidsonllc.com", phone: "(555) 456-7890", caseType: "Business Dispute", status: "Active", casesCount: 3 },
  { id: "4", name: "Michael Thompson", email: "m.thompson@example.com", phone: "(555) 369-8521", caseType: "Estate Planning", status: "Inactive", casesCount: 1 },
  { id: "5", name: "Elizabeth Parker", email: "e.parker@example.com", phone: "(555) 741-9632", caseType: "Civil Rights", status: "Active", casesCount: 2 },
];

const ClientsPage = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState(mockClients);
  const [filteredClients, setFilteredClients] = useState(mockClients);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    caseType: "all",
  });

  useEffect(() => {
    filterClients();
  }, [filters]);

  const filterClients = () => {
    let filtered = [...clients];

    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.email.toLowerCase().includes(searchLower) ||
          c.phone.toLowerCase().includes(searchLower)
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
      filtered = filtered.filter((c) => c.caseType === filters.caseType);
    }

    setFilteredClients(filtered);
  };

  const handleSearch = (query: string) => {
    setFilters({ ...filters, search: query });
  };

  const handleFilterChange = (type: string, value: string) => {
    setFilters({ ...filters, [type]: value });
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
            <Button className="bg-doculaw-500 hover:bg-doculaw-600">
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
                            {client.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{client.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{client.email}</div>
                      <div className="text-sm text-gray-500">{client.phone}</div>
                    </TableCell>
                    <TableCell>{client.caseType}</TableCell>
                    <TableCell>
                      <Badge
                        variant={client.status === "Active" ? "default" : "secondary"}
                      >
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{client.casesCount} active cases</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ClientsPage;
