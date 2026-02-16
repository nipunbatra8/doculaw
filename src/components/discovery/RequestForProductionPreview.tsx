import { ComplaintInformation } from "@/integrations/gemini/client";
import { Card, CardContent } from "@/components/ui/card";
import { Save, X, Plus, FileText, Sparkles, RefreshCw } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import RequestForProductionDocxButton from "./RequestForProductionDocxButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  PDFViewer,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";

interface RequestForProductionPreviewProps {
  productions: string[];
  definitions: string[];
  onSave: (productions: string[], definitions: string[]) => void;
  onAIEditClick: (text: string, type: 'production' | 'definition', index: number) => void;
  onAIEditAllClick: (type: 'productions' | 'definitions') => void;
  onRegenerate: () => void;
  extractedData: ComplaintInformation | null;
  caseId?: string;
}

const RequestForProductionPreview = ({ 
  productions, 
  definitions,
  onSave,
  onAIEditClick,
  onAIEditAllClick,
  onRegenerate,
  extractedData,
  caseId,
}: RequestForProductionPreviewProps) => {
  const [editableProductions, setEditableProductions] = useState<string[]>(productions);
  const [editableDefinitions, setEditableDefinitions] = useState<string[]>(definitions);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();
  const initialRender = useRef(true);

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(productions) !== JSON.stringify(editableProductions) ||
      JSON.stringify(definitions) !== JSON.stringify(editableDefinitions)
    );
  }, [productions, definitions, editableProductions, editableDefinitions]);

  useEffect(() => {
    if (!hasChanges) {
      setEditableProductions(productions);
      setEditableDefinitions(definitions);
    }
  }, [productions, definitions, hasChanges]);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    if (hasChanges) {
      toast({
        title: "Unsaved Changes",
        description: "Don't forget to save your work.",
        duration: 5000,
      });
    }
  }, [hasChanges, toast]);

  const handleSaveClick = () => {
    onSave(editableProductions, editableDefinitions);
  };

  const handleProductionChange = (index: number, value: string) => {
    const updated = [...editableProductions];
    updated[index] = value;
    setEditableProductions(updated);
  };

  const handleDefinitionChange = (index: number, value: string) => {
    const updated = [...editableDefinitions];
    updated[index] = value;
    setEditableDefinitions(updated);
  };

  const handleAddProduction = () => {
    setEditableProductions([...editableProductions, '']);
  };

  const handleRemoveProduction = (index: number) => {
    const updated = editableProductions.filter((_, i) => i !== index);
    setEditableProductions(updated);
  };

  const handleAddDefinition = () => {
    setEditableDefinitions([...editableDefinitions, 'The term "" means ']);
  };

  const handleRemoveDefinition = (index: number) => {
    const updated = editableDefinitions.filter((_, i) => i !== index);
    setEditableDefinitions(updated);
  };

  if (!extractedData) {
    return <p>Loading complaint data...</p>;
  }

  return (
    <div className="p-4 text-sm space-y-6 pb-24">
        <div>
            <h3 className="text-lg font-semibold">Edit Request for Production</h3>
            <p className="text-muted-foreground text-sm">
            Review, edit, and save the generated productions and definitions.
            </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" onClick={onRegenerate}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate
            </Button>
            <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Preview PDF
            </Button>
            <RequestForProductionDocxButton
            extractedData={extractedData}
            productions={editableProductions}
            definitions={editableDefinitions}
            caseId={caseId}
            />
        </div>

      {/* Definitions Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold">Definitions</h4>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onAIEditAllClick('definitions')}>
                <Sparkles className="h-4 w-4 mr-2" />
                Edit All with AI
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddDefinition}>
                <Plus className="h-4 w-4 mr-2" />
                Add Definition
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {editableDefinitions.map((definition, index) => (
              <div key={index} className="flex items-start gap-2">
                <Textarea
                  value={definition}
                  onChange={(e) => handleDefinitionChange(index, e.target.value)}
                  className="flex-grow"
                  rows={2}
                />
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onAIEditClick(definition, 'definition', index)}
                    title="Edit with AI"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDefinition(index)}
                    title="Remove Definition"
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Productions Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold">Productions</h4>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onAIEditAllClick('productions')}>
                <Sparkles className="h-4 w-4 mr-2" />
                Edit All with AI
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddProduction}>
                <Plus className="h-4 w-4 mr-2" />
                Add Production
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {editableProductions.map((production, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-shrink-0 pt-2 font-medium">{index + 1}.</div>
                <Textarea
                  value={production}
                  onChange={(e) => handleProductionChange(index, e.target.value)}
                  className="flex-grow"
                  rows={3}
                />
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onAIEditClick(production, 'production', index)}
                    title="Edit with AI"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveProduction(index)}
                    title="Remove Production"
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>PDF Preview</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="absolute top-4 right-4">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="flex-grow">
            <PDFViewer width="100%" height="100%">
              <RFPdfDocument
                extractedData={extractedData}
                vectorBasedProductions={editableProductions}
                vectorBasedDefinitions={editableDefinitions}
              />
            </PDFViewer>
          </div>
        </DialogContent>
      </Dialog>

      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-center items-center shadow-lg z-50">
          <Button onClick={handleSaveClick} size="lg">
            <Save className="h-5 w-5 mr-2" />
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
};

// PDF Document Component
Font.register({
  family: 'Times-Roman',
  src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/times-new-roman@1.0.4/Times New Roman.ttf'
});

Font.register({
  family: 'Times-Bold',
  src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/times-new-roman-bold@1.0.4/Times New Roman Bold.ttf'
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingLeft: 70,
    fontFamily: 'Times-Roman',
    fontSize: 12,
    lineHeight: 1.25,
  },
  // ... other styles from RFA component
});

const RFPdfDocument = ({ 
  extractedData, 
  vectorBasedProductions, 
  vectorBasedDefinitions 
}: { 
  extractedData: ComplaintInformation;
  vectorBasedProductions?: string[];
  vectorBasedDefinitions?: string[];
}) => {
  const generateLineNumbers = (count: number) => Array.from({ length: count }, (_, i) => i + 1);
  const lineNumbers = generateLineNumbers(28);

  const attorney = {
    name: extractedData.attorney?.name || 'Shawna S. Nazari, Esq. SBN 214939',
    firmName: extractedData.attorney?.firm || 'NAZARI LAW',
    address: extractedData.attorney?.address?.street || '2625 Townsgate Rd., Suite 330',
    cityStateZip: `${extractedData.attorney?.address?.city || 'Westlake Village'}, ${extractedData.attorney?.address?.state || 'CA'} ${extractedData.attorney?.address?.zip || '91361'}`,
    phone: extractedData.attorney?.phone || '(818) 380-3015',
    fax: extractedData.attorney?.fax || '(818) 380-3016',
    email: extractedData.attorney?.email || 'eservice@ssnlegal.com',
    attorneyFor: extractedData.attorney?.attorneyFor || 'Plaintiff'
  };

  const courtCounty = extractedData.court?.county || (extractedData.courtName?.split('County of ')[1] || 'San Bernardino');
  const plaintiff = extractedData.plaintiff || 'CARLOS OMAR LEON ZAMUDIO, an individual';
  const plaintiffShort = extractedData.plaintiff?.split(',')[0] || 'CARLOS OMAR ZAMUDIO';
  const defendant = extractedData.defendant || 'INGRID GUADALUPE ZULETA, an individual; AND DOES 1 TO 25, inclusive';
  const caseNumber = extractedData.case?.caseNumber || extractedData.caseNumber || 'CIVSB2426204';

  return (
    <Document title={`Request for Production - ${plaintiffShort} v. ${extractedData.defendant?.split(',')[0] || 'Defendant'}`}>
      <Page size="LETTER" style={styles.page}>
        {/* This is a simplified version. You would replicate the full header from the RFA document here */}
        <View>
          <Text style={{ textAlign: 'center', fontFamily: 'Times-Bold', fontSize: 14, marginBottom: 20 }}>
            REQUEST FOR PRODUCTION OF DOCUMENTS
          </Text>
        </View>
        
        <View style={{ marginBottom: 20 }}>
          <Text><Text style={styles.bold}>Propounding Party:</Text> {plaintiff}</Text>
          <Text><Text style={styles.bold}>Responding Party:</Text> {defendant}</Text>
          <Text><Text style={styles.bold}>Set Number:</Text> ONE</Text>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={styles.bold}>DEFINITIONS</Text>
          {(vectorBasedDefinitions || []).map((definition, index) => (
            <View key={index} style={{ marginTop: 5, marginLeft: 10 }}>
              <Text>{index + 1}. {definition}</Text>
            </View>
          ))}
        </View>

        <View>
          <Text style={styles.bold}>REQUESTS FOR PRODUCTION</Text>
          {(vectorBasedProductions || []).map((production, index) => (
            <View key={index} style={{ marginTop: 10, marginLeft: 10 }}>
              <Text>
                <Text style={styles.bold}>REQUEST FOR PRODUCTION NO. {index + 1}:</Text>
              </Text>
              <Text style={{ marginTop: 5 }}>
                {production}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export default RequestForProductionPreview;
