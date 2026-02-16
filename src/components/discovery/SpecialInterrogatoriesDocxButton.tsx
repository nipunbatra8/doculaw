import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import { ComplaintInformation } from '@/integrations/gemini/client';
import { generateSiDoc } from '@/integrations/docx/si-generator';

interface SpecialInterrogatoriesDocxButtonProps {
  extractedData: ComplaintInformation;
  interrogatories: string[];
  definitions: string[];
  caseId?: string;
}

const SpecialInterrogatoriesDocxButton = ({ extractedData, interrogatories, definitions, caseId }: SpecialInterrogatoriesDocxButtonProps) => {
  const handleDownload = async () => {
    const doc = generateSiDoc(extractedData, interrogatories, definitions);
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Special_Interrogatories_${caseId || 'document'}.docx`);
  };

  return (
    <Button variant="outline" onClick={handleDownload}>
      <Download className="h-4 w-4 mr-2" />
      Download DOCX
    </Button>
  );
};

export default SpecialInterrogatoriesDocxButton;
