import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ComplaintInformation } from "@/integrations/gemini/client";

interface ExtractedDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: ComplaintInformation | null;
  onUpdateExtractedData: (data: ComplaintInformation) => void;
  onConfirm: () => void;
}

const ExtractedDataDialog = ({
  open,
  onOpenChange,
  extractedData,
  onUpdateExtractedData,
  onConfirm
}: ExtractedDataDialogProps) => {
  if (!extractedData) return null;

  const handleInputChange = (
    field: keyof ComplaintInformation,
    value: string
  ) => {
    onUpdateExtractedData({
      ...extractedData,
      [field]: value
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Extracted Information</DialogTitle>
          <DialogDescription>
            We've extracted the following information from the uploaded complaint. Please verify or edit it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Defendant
              </label>
              <Input
                value={extractedData.defendant}
                onChange={(e) => handleInputChange('defendant', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plaintiff
              </label>
              <Input
                value={extractedData.plaintiff}
                onChange={(e) => handleInputChange('plaintiff', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case Number
              </label>
              <Input
                value={extractedData.caseNumber}
                onChange={(e) => handleInputChange('caseNumber', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filing Date
              </label>
              <Input
                value={extractedData.filingDate}
                onChange={(e) => handleInputChange('filingDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Court
              </label>
              <Input
                value={extractedData.courtName}
                onChange={(e) => handleInputChange('courtName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Charge Description
              </label>
              <Textarea
                value={extractedData.chargeDescription}
                onChange={(e) => handleInputChange('chargeDescription', e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex space-x-2 pt-4">
          <Button className="flex-1" onClick={onConfirm}>
            Confirm & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExtractedDataDialog; 