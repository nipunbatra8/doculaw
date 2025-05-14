
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Archive, Calendar } from "lucide-react";
import ArchiveFilters from "@/components/filters/ArchiveFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format, parseISO, isAfter, isBefore, isValid } from "date-fns";

interface Case {
  id: string;
  name: string;
  client: string;
  case_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  archived_at: string;
}

const ArchivePage = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    caseType: "all",
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
  });

  useEffect(() => {
    if (user) {
      fetchArchivedCases();
    }
  }, [user]);

  useEffect(() => {
    filterCases();
  }, [cases, filters]);

  const fetchArchivedCases = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        // .not('archived_at', 'is', null)
        .eq('user_id', user.id)
        .eq('status', 'Active');

      if (error) {
        throw error;
      }

      setCases(data || []);
      setFilteredCases(data || []);
    } catch (error) {
      console.error("Error fetching archived cases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterCases = () => {
    let filtered = [...cases];

    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.client.toLowerCase().includes(searchLower) ||
          c.case_type.toLowerCase().includes(searchLower)
      );
    }

    // Filter by case type
    if (filters.caseType !== "all") {
      filtered = filtered.filter((c) => c.case_type === filters.caseType);
    }

    // Filter by date range
    if (filters.dateFrom && isValid(filters.dateFrom)) {
      filtered = filtered.filter((c) => {
        const archivedDate = parseISO(c.archived_at);
        return isAfter(archivedDate, filters.dateFrom as Date) || archivedDate.getTime() === (filters.dateFrom as Date).getTime();
      });
    }

    if (filters.dateTo && isValid(filters.dateTo)) {
      filtered = filtered.filter((c) => {
        const archivedDate = parseISO(c.archived_at);
        return isBefore(archivedDate, filters.dateTo as Date) || archivedDate.getTime() === (filters.dateTo as Date).getTime();
      });
    }

    setFilteredCases(filtered);
  };

  const handleSearch = (query: string) => {
    setFilters({ ...filters, search: query });
  };

  const handleFilterChange = (type: string, value: string) => {
    setFilters({ ...filters, [type]: value });
  };

  const handleDateChange = (dates: { from?: Date; to?: Date }) => {
    setFilters({
      ...filters,
      dateFrom: dates.from || null,
      dateTo: dates.to || null,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Archive</h1>
            <p className="text-gray-600 mt-1">View and manage your archived cases</p>
          </div>
          <Button className="bg-doculaw-500 hover:bg-doculaw-600">
            <Calendar className="mr-2 h-4 w-4" />
            Book a Demo
          </Button>
        </div>

        <ArchiveFilters
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          onDateChange={handleDateChange}
        />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <Archive className="h-5 w-5 mr-2 text-doculaw-500" />
              Archived Cases
            </CardTitle>
            <CardDescription>Cases that have been archived</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-doculaw-500"></div>
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No archived cases found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Archived Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarFallback className="text-xs">
                              {item.client.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {item.client}
                        </div>
                      </TableCell>
                      <TableCell>{item.case_type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-100">
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.archived_at && format(parseISO(item.archived_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ArchivePage;
