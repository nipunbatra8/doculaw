
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronsUpDown, Loader2, User, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ClientSearchSelectProps {
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
  onAddNewClient?: () => void;
}

const ClientSearchSelect = ({
  selectedClientId,
  onSelectClient,
  onAddNewClient,
}: ClientSearchSelectProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Load clients
  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  // Load selected client details
  useEffect(() => {
    if (selectedClientId) {
      loadSelectedClient();
    } else {
      setSelectedClient(null);
    }
  }, [selectedClientId]);

  const fetchClients = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email')
        .eq('lawyer_id', user.id);
      
      if (error) throw error;
      
      setClients(data || []);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: "Failed to load clients list.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSelectedClient = async () => {
    if (!selectedClientId) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email')
        .eq('id', selectedClientId)
        .single();
      
      if (error) throw error;
      
      setSelectedClient(data);
    } catch (error: any) {
      console.error("Error fetching client details:", error);
    }
  };

  const handleSelectClient = (client: Client) => {
    onSelectClient(client.id);
    setSelectedClient(client);
    setOpen(false);
  };

  const filteredClients = searchTerm 
    ? clients.filter(client =>
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : clients;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {isLoading ? (
            <div className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Loading clients...</span>
            </div>
          ) : selectedClient ? (
            <div className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>{`${selectedClient.first_name} ${selectedClient.last_name}`}</span>
            </div>
          ) : (
            <span className="text-gray-400">Select a client</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput 
            placeholder="Search clients..." 
            className="h-9" 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>
              {onAddNewClient ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-gray-500 mb-2">No clients found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      if (onAddNewClient) onAddNewClient();
                    }}
                    className="flex items-center"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add New Client
                  </Button>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">No clients found</p>
              )}
            </CommandEmpty>
            <CommandGroup heading="Clients">
              {filteredClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`${client.first_name} ${client.last_name}`}
                  onSelect={() => handleSelectClient(client)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>{`${client.first_name} ${client.last_name}`}</span>
                  </div>
                  {client.id === selectedClientId && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {onAddNewClient && (
              <div className="p-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    if (onAddNewClient) onAddNewClient();
                  }}
                  className="w-full flex items-center justify-center"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add New Client
                </Button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ClientSearchSelect;
