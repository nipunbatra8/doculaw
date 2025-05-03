
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ClientCase {
  id: string;
  name: string;
  status: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  cases?: ClientCase[];
}

interface ClientDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string | null;
}

const ClientDetailsModal = ({ open, onClose, onSuccess, clientId }: ClientDetailsModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [clientCases, setClientCases] = useState<ClientCase[]>([]);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (clientId && open) {
      fetchClientDetails();
    } else {
      setIsLoading(false);
    }
  }, [clientId, open]);

  const fetchClientDetails = async () => {
    try {
      setIsLoading(true);
      
      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();
      
      if (clientError) throw clientError;
      
      // Fetch cases for this client
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("id, name, status")
        .eq("client", clientId);
      
      if (casesError) throw casesError;
      
      setClient(clientData);
      setClientCases(casesData || []);
      
      // Set form values
      setFirstName(clientData.first_name);
      setLastName(clientData.last_name);
      setEmail(clientData.email);
      setPhone(clientData.phone || "");
      
    } catch (error: any) {
      console.error("Error fetching client details:", error);
      toast({
        title: "Error",
        description: "Failed to load client details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clientId) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Client information updated successfully.",
      });
      
      onSuccess();
      
    } catch (error: any) {
      console.error("Error updating client:", error);
      toast({
        title: "Error",
        description: "Failed to update client information.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPasswordResetEmail = async () => {
    if (!client) return;
    
    setIsSendingEmail(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(client.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password Reset Email Sent",
        description: `An email has been sent to ${client.email} with instructions to set their password.`,
      });
      
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-doculaw-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Client Details</DialogTitle>
          <DialogDescription>
            View and edit client information.
          </DialogDescription>
        </DialogHeader>
        
        {client && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  placeholder="First name" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  placeholder="Last name" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                value={email} 
                readOnly 
                disabled 
                className="bg-gray-100" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="(555) 123-4567" 
              />
            </div>
            
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Associated Cases</h3>
              {clientCases.length > 0 ? (
                <div className="space-y-2">
                  {clientCases.map((caseItem) => (
                    <Card key={caseItem.id} className="border border-gray-200">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center">
                          <Briefcase className="h-4 w-4 text-doculaw-500 mr-2" />
                          <span>{caseItem.name}</span>
                        </div>
                        <span className={`text-sm ${caseItem.status === 'Active' ? 'text-green-600' : 'text-gray-500'}`}>
                          {caseItem.status}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No cases associated with this client yet.</p>
              )}
            </div>
            
            <div>
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center"
                onClick={handleSendPasswordResetEmail}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Send Password Reset Email
              </Button>
            </div>
          </div>
        )}
        
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            className="bg-doculaw-500 hover:bg-doculaw-600"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailsModal;
