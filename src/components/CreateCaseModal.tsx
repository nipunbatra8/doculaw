
import React, { useState } from 'react';
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

type CaseFormData = {
  name: string;
  client: string;
  caseType: string;
  status: string;
};

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
  const { user } = useAuth();
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CaseFormData>();

  const onSubmit = async (data: CaseFormData) => {
    if (!user) {
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
          client: data.client,
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

  return (
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
            <Input 
              placeholder="Case Name" 
              {...register('name', { required: 'Case name is required' })}
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>
          
          <div>
            <Input 
              placeholder="Client Name" 
              {...register('client', { required: 'Client name is required' })}
            />
            {errors.client && <p className="text-red-500 text-sm">{errors.client.message}</p>}
          </div>
          
          <div>
            <Select onValueChange={(value) => register('caseType').onChange({ target: { value } })}>
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
            <Select 
              defaultValue="Active"
              onValueChange={(value) => register('status').onChange({ target: { value } })}
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
  );
};

export default CreateCaseModal;
