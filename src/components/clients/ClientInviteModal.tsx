import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

// Form validation schema
const formSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().min(1, { message: "Phone number is required for the invitation" }),
  caseType: z.string().min(1, { message: "Preferred case type is required" }),
});

type FormValues = z.infer<typeof formSchema>;

interface ClientInviteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ClientInviteModal = ({ open, onClose, onSuccess }: ClientInviteModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      caseType: "",
    },
  });

  const resetForm = () => {
    form.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to invite clients",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Get lawyer name (needed for the email)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      const lawyerName = profileData?.name || "Your lawyer";

      // Store the client information in our clients table
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          lawyer_id: user.id,
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone || null,
          case_type: data.caseType, // Store the case type preference, but don't create a case
          status: 'pending'
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Generate a secure random password for the new user
      const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
      
      // Create a user account for the client in Supabase Auth
      const { data: authData, error: authError } = await supabase.functions.invoke("create-client-user", {
        body: {
          email: data.email,
          password: tempPassword,
          metadata: {
            full_name: `${data.firstName} ${data.lastName}`,
            client_id: clientData.id,
            lawyer_id: user.id,
            user_type: 'client'
          }
        }
      });

      if (authError) throw authError;

      // Generate the magic link and send SMS
      const { data: inviteData, error: magicLinkError } = await supabase.functions.invoke("send-client-invitation", {
        body: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          lawyerName: lawyerName,
          clientId: clientData.id,
          redirectTo: `${window.location.origin}/client-dashboard`,
          phone: data.phone // Send phone number for SMS
        },
      });

      if (magicLinkError) throw magicLinkError;

      // Check if we received a magic link in response
      if (inviteData && inviteData.magicLink) {
        try {
          await navigator.clipboard.writeText(inviteData.magicLink);
        } catch (clipboardError) {
          console.error("Failed to copy to clipboard:", clipboardError);
        }
        
        console.info("Magic Link for client:", inviteData.magicLink);
        
        // Store the link to local storage for later retrieval
        localStorage.setItem(`invitationLink_${clientData.id}`, inviteData.magicLink);

        // Check if SMS was sent successfully
        if (inviteData.success) {
          toast({
            title: "Client invited",
            description: `Client account created and invitation sent via SMS to ${data.phone}`,
            duration: 10000,
          });
        } else {
          // SMS failed but we have the magic link
          toast({
            title: "Client created - SMS sending failed",
            description: "The client was created but the SMS could not be sent. The magic link has been copied to your clipboard. Please send it to the client manually.",
            duration: 10000,
          });
        }
      } else {
        toast({
          title: "Client created",
          description: "Client created successfully, but no invitation link was generated.",
          variant: "destructive",
        });
      }

      resetForm();
      onSuccess();
      handleClose();
    } catch (error: unknown) {
      console.error("Error inviting client:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to invite client. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New Client</DialogTitle>
          <DialogDescription>
            Send an SMS invitation to add a new client to your client list. The client will receive a secure link to access their account. No cases or documents will be created automatically.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="client@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-gray-500 mt-1">
                    Required for sending the invitation via SMS.
                  </p>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="caseType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Case Type</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                    >
                      <option value="">Select Case Type</option>
                      <option value="Personal Injury">Personal Injury</option>
                      <option value="Family Law">Family Law</option>
                      <option value="Criminal Defense">Criminal Defense</option>
                      <option value="Estate Planning">Estate Planning</option>
                      <option value="Business Dispute">Business Dispute</option>
                      <option value="Civil Rights">Civil Rights</option>
                      <option value="Immigration">Immigration</option>
                      <option value="Other">Other</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-gray-500 mt-1">
                    This only indicates the client's matter type. You'll need to create cases separately.
                  </p>
                </FormItem>
              )}
            />
            
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="bg-doculaw-500 hover:bg-doculaw-600"
              >
                {isSubmitting ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientInviteModal;
