
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import ClientSearchSelect from "./ClientSearchSelect";

interface CaseFormData {
  name: string;
  status: string;
  caseType: string;
  clientId: string | null;
}

interface CaseEditModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  caseId?: string;
  defaultValues?: {
    name: string;
    status: string;
    case_type: string;
    client: string | null;
  };
}

const CaseEditModal = ({
  open,
  onClose,
  onSuccess,
  caseId,
  defaultValues,
}: CaseEditModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  const [formData, setFormData] = useState<CaseFormData>({
    name: "",
    status: "Active",
    caseType: "",
    clientId: null,
  });

  // Initialize form data from default values
  useEffect(() => {
    if (defaultValues) {
      setFormData({
        name: defaultValues.name || "",
        status: defaultValues.status || "Active",
        caseType: defaultValues.case_type || "",
        clientId: defaultValues.client || null,
      });
    } else {
      // Reset form for new cases
      setFormData({
        name: "",
        status: "Active",
        caseType: "",
        clientId: null,
      });
    }
  }, [defaultValues, open]);

  const handleChange = (field: keyof CaseFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create cases",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name) {
      toast({
        title: "Error",
        description: "Case name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const caseData = {
        name: formData.name,
        status: formData.status,
        case_type: formData.caseType || null,
        client: formData.clientId || null,
        user_id: user.id,
      };

      let result;
      if (caseId) {
        // Update existing case
        const { data, error } = await supabase
          .from("cases")
          .update(caseData)
          .eq("id", caseId)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new case
        const { data, error } = await supabase
          .from("cases")
          .insert(caseData)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      toast({
        title: "Success",
        description: caseId
          ? "Case updated successfully"
          : "Case created successfully",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "Failed to save case. Please try again.",
        variant: "destructive",
      });
      console.error("Error saving case:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{caseId ? "Edit Case" : "New Case"}</DialogTitle>
            <DialogDescription>
              {caseId
                ? "Update the details of your case"
                : "Enter the details to create a new case"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Case Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter case name"
              />
            </div>

            <div>
              <Label htmlFor="caseType">Case Type</Label>
              <Select
                value={formData.caseType}
                onValueChange={(value) => handleChange("caseType", value)}
              >
                <SelectTrigger id="caseType">
                  <SelectValue placeholder="Select case type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personal Injury">Personal Injury</SelectItem>
                  <SelectItem value="Family Law">Family Law</SelectItem>
                  <SelectItem value="Criminal Defense">Criminal Defense</SelectItem>
                  <SelectItem value="Estate Planning">Estate Planning</SelectItem>
                  <SelectItem value="Business Dispute">Business Dispute</SelectItem>
                  <SelectItem value="Civil Rights">Civil Rights</SelectItem>
                  <SelectItem value="Immigration">Immigration</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="client">Client</Label>
              <div className="mt-1">
                <ClientSearchSelect
                  selectedClientId={formData.clientId}
                  onSelectClient={(clientId) => handleChange("clientId", clientId || "")}
                  onAddNewClient={() => setShowClientModal(true)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-doculaw-500 hover:bg-doculaw-600"
            >
              {isSubmitting
                ? "Saving..."
                : caseId
                ? "Update Case"
                : "Create Case"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CaseEditModal;
