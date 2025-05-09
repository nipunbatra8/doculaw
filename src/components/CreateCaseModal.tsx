import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ClientInviteModal from "@/components/clients/ClientInviteModal";

// Updated type to use clients array of UUIDs instead of a single client string
type CaseFormData = {
  name: string;
  clients: string[]; // Array of client UUIDs
  caseType: string;
  status: string;
};

// Define the Client interface
interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  user_id: string | null;
  lawyer_id: string;
  // For display purposes
  fullName?: string;
}

const caseTypes = [
  "Personal Injury",
  "Business Dispute",
  "Family Law",
  "Estate Planning",
  "Civil Rights",
  "Criminal Defense",
  "Immigration",
  "Tax Law",
  "Other"
];

const CreateCaseModal = ({ 
  isOpen, 
  onOpenChange,
  onCaseCreated
}: { 
  isOpen: boolean, 
  onOpenChange: (open: boolean) => void,
  onCaseCreated?: () => void
}) => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CaseFormData>({
    defaultValues: {
      clients: [],
      status: 'Active'
    }
  });
  
  // Client selection states
  const [clientSearchQuery, setClientSearchQuery] = useState<string>("");
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState<boolean>(false);
  const [clientInviteModalOpen, setClientInviteModalOpen] = useState<boolean>(false);
  
  // Watch selectedClients to update the form value
  useEffect(() => {
    setValue('clients', selectedClients);
  }, [selectedClients, setValue]);

  const onSubmit = async (data: CaseFormData) => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a case",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: newCase, error } = await supabase
        .from('cases')
        .insert({
          name: data.name,
          clients: data.clients,
          case_type: data.caseType,
          status: data.status || 'Active',
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Case Created",
        description: `Case "${data.name}" has been successfully created.`
      });

      reset();
      setSelectedClients([]);
      setClientSearchQuery("");
      onOpenChange(false);
      
      // Call the callback function if provided
      if (onCaseCreated) {
        onCaseCreated();
      }
    } catch (error) {
      console.error('Error creating case:', error);
      toast({
        title: "Error",
        description: "Failed to create case. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Function to search for clients
  const searchClients = async (query: string) => {
    if (!user) return;
    
    setIsLoadingClients(true);
    try {
      // Search for clients belonging to this lawyer
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('lawyer_id', user.id)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process clients to include full name for display
      const clientsWithFullName = (data || []).map(client => ({
        ...client,
        fullName: `${client.first_name} ${client.last_name}`
      }));
      
      setAvailableClients(clientsWithFullName);
    } catch (error) {
      console.error('Error searching clients:', error);
      toast({
        title: "Error",
        description: "Failed to search for clients. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingClients(false);
    }
  };
  
  // Initial client search when modal opens
  useEffect(() => {
    if (isOpen) {
      searchClients("");
    }
  }, [isOpen, user]);
  
  // Handle client invitation success
  const handleClientInvited = () => {
    toast({
      title: "Success",
      description: "Client has been invited. You can now add them to this case.",
    });
    setClientInviteModalOpen(false);
    // Refresh the clients list
    searchClients("");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Case</DialogTitle>
            <DialogDescription>
              Fill out the details for your new legal case.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case Name
              </label>
              <Input 
                placeholder="Case Name" 
                {...register('name', { required: 'Case name is required' })}
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Clients
                </label>
                <Button 
                  size="sm" 
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setClientInviteModalOpen(true);
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite New Client
                </Button>
              </div>
              
              <div className="mb-2">
                <Input
                  type="text"
                  placeholder="Search clients by name or email..."
                  value={clientSearchQuery}
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value);
                    searchClients(e.target.value);
                  }}
                />
              </div>
              
              {/* Selected clients display */}
              {selectedClients.length > 0 && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Selected Clients
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedClients.map((clientId) => {
                      const client = availableClients.find(c => c.id === clientId);
                      return (
                        <Badge key={clientId} variant="secondary" className="flex items-center gap-1">
                          {client ? `${client.first_name} ${client.last_name}` : clientId}
                          <button 
                            type="button"
                            onClick={() => setSelectedClients(prev => 
                              prev.filter(id => id !== clientId)
                            )}
                            className="ml-1 hover:text-red-500"
                            aria-label="Remove client"
                          >
                            ×
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Client search results */}
              <div className="border rounded-md max-h-40 overflow-y-auto mb-2">
                {isLoadingClients ? (
                  <div className="text-center p-2 text-gray-500">Loading clients...</div>
                ) : availableClients.length > 0 ? (
                  <div className="divide-y">
                    {availableClients.map(client => (
                      <div 
                        key={client.id}
                        className="flex items-center p-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          id={`client-${client.id}`}
                          checked={selectedClients.includes(client.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClients(prev => [...prev, client.id]);
                            } else {
                              setSelectedClients(prev => 
                                prev.filter(id => id !== client.id)
                              );
                            }
                          }}
                          className="mr-2 h-4 w-4"
                        />
                        <label
                          htmlFor={`client-${client.id}`}
                          className="flex-1 flex flex-col cursor-pointer"
                        >
                          <span className="font-medium">
                            {client.first_name} {client.last_name}
                          </span>
                          <span className="text-sm text-gray-500">
                            {client.email}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-2 text-gray-500">
                    {clientSearchQuery 
                      ? "No clients found matching your search." 
                      : "No clients available. Click 'Invite New Client' to add one."}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case Type
              </label>
              <Select onValueChange={(value) => setValue('caseType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Case Type" />
                </SelectTrigger>
                <SelectContent>
                  {caseTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select 
                defaultValue="Active"
                onValueChange={(value) => setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Case Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-doculaw-500 hover:bg-doculaw-600 text-white">
                Create Case
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Client Invite Modal */}
      <ClientInviteModal 
        open={clientInviteModalOpen}
        onClose={() => setClientInviteModalOpen(false)}
        onSuccess={handleClientInvited}
      />
    </>
  );
};

export default CreateCaseModal;
