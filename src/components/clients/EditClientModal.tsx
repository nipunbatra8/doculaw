import { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

// Define the component props
interface EditClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  } | null;
}

// Define the form schema
const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().optional(),
});

// Define the form data type
type FormData = z.infer<typeof formSchema>;

const EditClientModal = ({ open, onClose, onSuccess, client }: EditClientModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize the form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: client?.first_name || "",
      lastName: client?.last_name || "",
      email: client?.email || "",
      phone: client?.phone || "",
    },
  });

  // Update form values when client changes
  if (client && 
      (form.getValues("firstName") !== client.first_name ||
       form.getValues("lastName") !== client.last_name ||
       form.getValues("email") !== client.email ||
       form.getValues("phone") !== (client.phone || ""))) {
    form.reset({
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
      phone: client.phone || "",
    });
  }

  const onSubmit = async (data: FormData) => {
    if (!user || !client) return;
    
    setIsSubmitting(true);
    
    try {
      // Update client in the database
      const { error } = await supabase
        .from('clients')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          // email: data.email, // Email is no longer editable
          phone: data.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.id);
      
      if (error) throw error;
      
      // Call success callback
      onSuccess();
    } catch (error) {
      console.error("Error updating client:", error);
      toast({
        title: "Error",
        description: "Failed to update client information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !isSubmitting && !value && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>
            Update client information. For email changes or client deletion, contact support.
          </DialogDescription>
        </DialogHeader>
        
        <Alert className="mb-4 bg-amber-50 text-amber-800 border-amber-200">
          <InfoIcon className="h-4 w-4 mr-2" />
          <AlertDescription>
            For security reasons, email changes and client deletion require support assistance.
          </AlertDescription>
        </Alert>
        
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
                    <Input 
                      type="email" 
                      placeholder="client@example.com" 
                      {...field} 
                      disabled 
                      className="bg-gray-50"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-amber-600">
                    To change a client's email, please contact support.
                  </FormDescription>
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
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-doculaw-500 hover:bg-doculaw-600" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientModal; 