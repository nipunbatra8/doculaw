
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
import CalendlyEmbed from "@/components/CalendlyEmbed";

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

type DateRange = {
  from?: Date;
  to?: Date;
};

const ArchivePage = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState({
    status: null as string | null,
    date: null as DateRange | null,
    query: null as string | null,
  });

  useEffect(() => {
    if (user) {
      fetchArchivedCases();
    }
  }, [user]);

  useEffect(() => {
    filterCases();
  }, [cases, activeFilters]);

  const fetchArchivedCases = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .not('archived_at', 'is', null)
        .eq('user_id', user?.id);

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
    if (activeFilters.query) {
      const searchLower = activeFilters.query.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.client.toLowerCase().includes(searchLower) ||
          c.case_type.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (activeFilters.status) {
      filtered = filtered.filter((c) => c.status === activeFilters.status);
    }

    // Filter by date range
    if (activeFilters.date?.from && isValid(activeFilters.date.from)) {
      filtered = filtered.filter((c) => {
        const archivedDate = parseISO(c.archived_at);
        return isAfter(archivedDate, activeFilters.date?.from as Date) || archivedDate.getTime() === (activeFilters.date?.from as Date).getTime();
      });
    }

    if (activeFilters.date?.to && isValid(activeFilters.date.to)) {
      filtered = filtered.filter((c) => {
        const archivedDate = parseISO(c.archived_at);
        return isBefore(archivedDate, activeFilters.date?.to as Date) || archivedDate.getTime() === (activeFilters.date?.to as Date).getTime();
      });
    }

    setFilteredCases(filtered);
  };

  const handleFilter = (status: string | null, date: DateRange | null, query: string | null) => {
    setActiveFilters({
      status,
      date,
      query
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
            <CalendlyEmbed url="https://calendly.com/nipunbatra8/30min?hide_gdpr_banner=1&background_color=F3F4F6&text_color=000000&primary_color=5bb5a2" />
            Book a Demo
          </Button>
        </div>

        <ArchiveFilters onFilter={handleFilter} />

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
