
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, PlusCircle, Archive, AlertCircle, Loader2, ArchiveX } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CaseEditModal from "@/components/cases/CaseEditModal";
import { useToast } from "@/hooks/use-toast";

interface Case {
  id: string;
  name: string;
  case_type: string | null;
  status: string;
  created_at: string;
  client: string | null;
  client_name?: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

const CasesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("active");
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const { toast } = useToast();

  const fetchCases = async ({ status }: { status: string }) => {
    if (!user) return [];

    // Fetch cases based on the status
    const query = supabase
      .from("cases")
      .select("*")
      .eq("user_id", user.id);

    if (status === "active") {
      query.eq("status", "Active");
    } else if (status === "archived") {
      query.eq("status", "Archived");
    }

    const { data: cases, error } = await query;

    if (error) {
      throw error;
    }

    // Get client details for each case
    const casesWithClientNames = await Promise.all(
      cases.map(async (caseItem) => {
        if (caseItem.client) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("first_name, last_name")
            .eq("id", caseItem.client)
            .single();

          return {
            ...caseItem,
            client_name: clientData
              ? `${clientData.first_name} ${clientData.last_name}`
              : "Unknown Client",
          };
        }
        return {
          ...caseItem,
          client_name: "No Client Assigned",
        };
      })
    );

    return casesWithClientNames;
  };

  const {
    data: activeCases = [],
    isLoading: isLoadingActive,
    isError: isErrorActive,
    refetch: refetchActive,
  } = useQuery({
    queryKey: ["cases", user?.id, "active"],
    queryFn: () => fetchCases({ status: "active" }),
    enabled: !!user,
  });

  const {
    data: archivedCases = [],
    isLoading: isLoadingArchived,
    isError: isErrorArchived,
    refetch: refetchArchived,
  } = useQuery({
    queryKey: ["cases", user?.id, "archived"],
    queryFn: () => fetchCases({ status: "archived" }),
    enabled: !!user && activeTab === "archived",
  });

  const handleCaseCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["cases", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["active-cases-count", user?.id] });
  };

  const handleEditCase = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setShowCaseModal(true);
  };

  const handleArchiveCase = async (caseId: string, action: 'archive' | 'unarchive') => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({ 
          status: action === 'archive' ? 'Archived' : 'Active',
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: action === 'archive' 
          ? "Case has been archived" 
          : "Case has been restored from archive"
      });
      
      refetchActive();
      refetchArchived();
      queryClient.invalidateQueries({ queryKey: ["active-cases-count", user?.id] });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} case`,
        variant: "destructive"
      });
    }
  };
  
  const renderCasesTable = (cases: Case[], isLoading: boolean, isError: boolean, isArchived: boolean) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-doculaw-500" />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-medium">Error Loading Cases</h3>
          <p className="text-gray-500 mt-2">There was a problem loading your cases</p>
        </div>
      );
    }

    if (cases.length === 0) {
      return (
        <div className="text-center p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            {isArchived ? <ArchiveX className="h-8 w-8 text-gray-500" /> : <AlertCircle className="h-8 w-8 text-gray-500" />}
          </div>
          <h3 className="text-lg font-medium">No {isArchived ? "archived" : "active"} cases found</h3>
          <p className="text-gray-500 mt-2">
            {isArchived
              ? "You don't have any archived cases yet."
              : "You don't have any active cases yet."}
          </p>
          {!isArchived && (
            <Button
              className="mt-4 bg-doculaw-500 hover:bg-doculaw-600"
              onClick={() => {
                setSelectedCase(null);
                setShowCaseModal(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Your First Case
            </Button>
          )}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Case Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((caseItem) => (
            <TableRow key={caseItem.id}>
              <TableCell className="font-medium">{caseItem.name}</TableCell>
              <TableCell>{caseItem.case_type || "Not specified"}</TableCell>
              <TableCell>{caseItem.client_name}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  {isArchived ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchiveCase(caseItem.id, 'unarchive')}
                    >
                      Restore
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="bg-doculaw-500 hover:bg-doculaw-600"
                        onClick={() => handleEditCase(caseItem)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchiveCase(caseItem.id, 'archive')}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Cases</CardTitle>
            <CardDescription>Manage and track your legal cases</CardDescription>
          </div>
          <Button
            className="bg-doculaw-500 hover:bg-doculaw-600"
            onClick={() => {
              setSelectedCase(null);
              setShowCaseModal(true);
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Case
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active Cases</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-4">
            {renderCasesTable(activeCases, isLoadingActive, isErrorActive, false)}
          </TabsContent>
          <TabsContent value="archived" className="space-y-4">
            {renderCasesTable(archivedCases, isLoadingArchived, isErrorArchived, true)}
          </TabsContent>
        </Tabs>
      </CardContent>

      <CaseEditModal
        open={showCaseModal}
        onClose={() => {
          setShowCaseModal(false);
          setSelectedCase(null);
        }}
        onSuccess={handleCaseCreated}
        caseId={selectedCase?.id}
        defaultValues={selectedCase || undefined}
      />
    </Card>
  );
};

export default CasesPage;
