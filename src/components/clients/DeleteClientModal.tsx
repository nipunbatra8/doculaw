
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";

interface DeleteClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_id?: string | null;
  } | null;
}

const DeleteClientModal = ({ open, onClose, onSuccess, client }: DeleteClientModalProps) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    
    setIsDeleting(true);
    try {
      // 1. Delete associated documents
      const { error: documentsError } = await supabase
        .from('documents')
        .delete()
        .eq('user_id', client.user_id || '')
        .ilike('path', `%/clients/${client.id}/%`);

      if (documentsError) {
        console.error("Error deleting client documents:", documentsError);
        // Continue with deletion even if document deletion fails
      }

      // 2. Update any cases linked to this client
      const { data: casesData, error: casesFetchError } = await supabase
        .from('cases')
        .select('id, name, clients')
        .contains('clients', [client.id]);

      if (casesFetchError) {
        console.error("Error fetching client cases:", casesFetchError);
      } else if (casesData && casesData.length > 0) {
        // For each case, remove the client from the clients array
        for (const caseItem of casesData) {
          const updatedClients = (caseItem.clients || []).filter(clientId => clientId !== client.id);
          
          await supabase
            .from('cases')
            .update({
              clients: updatedClients.length > 0 ? updatedClients : null,
              name: updatedClients.length === 0 
                ? `${caseItem.name} (Client Deleted: ${client.first_name} ${client.last_name})`
                : caseItem.name
            })
            .eq('id', caseItem.id);
        }
      }

      // 3. Delete the client from auth if they have a user account
      if (client.user_id) {
        const { error: authError } = await supabase.functions.invoke("delete-client-user", {
          body: {
            userId: client.user_id,
          },
        });

        if (authError) {
          console.error("Error deleting client user:", authError);
          // Continue with deletion even if auth deletion fails
        }
      }

      // 4. Delete the client record
      const { error: clientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);

      if (clientError) throw clientError;

      toast({
        title: "Client deleted",
        description: `${client.first_name} ${client.last_name} has been removed from your clients.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete client. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Delete Client
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {client.first_name} {client.last_name}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm">
            This will permanently delete the client, all their data, and remove their access to your documents.
          </p>
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Any cases associated with this client will be preserved, but the client reference will be replaced with "(Client Deleted)" to maintain your case history.
            </p>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteClientModal; 
