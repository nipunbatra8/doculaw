import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import { ComplaintInformation } from '@/integrations/gemini/client';
import { generateRfpDoc } from '@/integrations/docx/rfp-generator';

interface RequestForProductionDocxButtonProps {
  extractedData: ComplaintInformation;
  productions: string[];
  definitions: string[];
  caseId?: string;
}

const RequestForProductionDocxButton = ({
  extractedData,
  productions,
  definitions,
  caseId,
}: RequestForProductionDocxButtonProps) => {
  const handleDownload = async () => {
    const doc = generateRfpDoc(extractedData, productions, definitions);

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Request_for_Production_${caseId || 'document'}.docx`);
  };

  return (
    <Button variant="outline" onClick={handleDownload}>
      <Download className="h-4 w-4 mr-2" />
      Download DOCX
    </Button>
  );
};

export default RequestForProductionDocxButton;
