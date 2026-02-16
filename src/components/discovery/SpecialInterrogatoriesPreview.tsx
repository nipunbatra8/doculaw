import { ComplaintInformation } from "@/integrations/gemini/client";
import { Card, CardContent } from "@/components/ui/card";
import { Save, X, Plus, FileText, Sparkles, RefreshCw } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { PDFViewer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";

interface SpecialInterrogatoriesPreviewProps {
  interrogatories: string[];
  definitions: string[];
  onSave: (interrogatories: string[], definitions: string[]) => void;
  onAIEditClick: (text: string, type: 'interrogatory' | 'definition', index: number) => void;
  onAIEditAllClick: (type: 'interrogatories' | 'definitions') => void;
  onRegenerate: () => void;
  extractedData: ComplaintInformation | null;
  caseId?: string;
}

const SpecialInterrogatoriesPreview = ({
  interrogatories,
  definitions,
  onSave,
  onAIEditClick,
  onAIEditAllClick,
  onRegenerate,
  extractedData,
  caseId,
}: SpecialInterrogatoriesPreviewProps) => {
  const [editableInterrogatories, setEditableInterrogatories] = useState<string[]>(interrogatories);
  const [editableDefinitions, setEditableDefinitions] = useState<string[]>(definitions);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();
  const initialRender = useRef(true);

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(interrogatories) !== JSON.stringify(editableInterrogatories) ||
      JSON.stringify(definitions) !== JSON.stringify(editableDefinitions)
    );
  }, [interrogatories, definitions, editableInterrogatories, editableDefinitions]);

  useEffect(() => {
    if (!hasChanges) {
      setEditableInterrogatories(interrogatories);
      setEditableDefinitions(definitions);
    }
  }, [interrogatories, definitions, hasChanges]);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    if (hasChanges) {
      toast({ title: "Unsaved Changes", description: "Don't forget to save your work.", duration: 5000 });
    }
  }, [hasChanges, toast]);

  const handleSaveClick = () => {
    onSave(editableInterrogatories, editableDefinitions);
  };

  const handleInterrogatoryChange = (index: number, value: string) => {
    const updated = [...editableInterrogatories];
    updated[index] = value;
    setEditableInterrogatories(updated);
  };

  const handleDefinitionChange = (index: number, value: string) => {
    const updated = [...editableDefinitions];
    updated[index] = value;
    setEditableDefinitions(updated);
  };

  const handleAddInterrogatory = () => {
    setEditableInterrogatories([...editableInterrogatories, 'State ']);
  };

  const handleRemoveInterrogatory = (index: number) => {
    const updated = editableInterrogatories.filter((_, i) => i !== index);
    setEditableInterrogatories(updated);
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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Edit Special Interrogatories</h3>
          <p className="text-muted-foreground text-sm">Review, edit, and save the generated interrogatories and definitions.</p>
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
        </div>
      </div>

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
                <Textarea value={definition} onChange={(e) => handleDefinitionChange(index, e.target.value)} className="flex-grow" rows={2} />
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onAIEditClick(definition, 'definition', index)} title="Edit with AI">
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveDefinition(index)} title="Remove Definition" className="text-red-500 hover:text-red-600">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold">Interrogatories</h4>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onAIEditAllClick('interrogatories')}>
                <Sparkles className="h-4 w-4 mr-2" />
                Edit All with AI
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddInterrogatory}>
                <Plus className="h-4 w-4 mr-2" />
                Add Interrogatory
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {editableInterrogatories.map((q, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-shrink-0 pt-2 font-medium">{index + 1}.</div>
                <Textarea value={q} onChange={(e) => handleInterrogatoryChange(index, e.target.value)} className="flex-grow" rows={3} />
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onAIEditClick(q, 'interrogatory', index)} title="Edit with AI">
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveInterrogatory(index)} title="Remove Interrogatory" className="text-red-500 hover:text-red-600">
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
              <SIPdfDocument extractedData={extractedData} vectorBasedInterrogatories={editableInterrogatories} vectorBasedDefinitions={editableDefinitions} />
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

Font.register({ family: 'Times-Roman', src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/times-new-roman@1.0.4/Times New Roman.ttf' });
Font.register({ family: 'Times-Bold', src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/times-new-roman-bold@1.0.4/Times New Roman Bold.ttf' });

const styles = StyleSheet.create({ page: { padding: 40, paddingLeft: 70, fontFamily: 'Times-Roman', fontSize: 12, lineHeight: 1.25 } });

const SIPdfDocument = ({ extractedData, vectorBasedInterrogatories, vectorBasedDefinitions }: { extractedData: ComplaintInformation; vectorBasedInterrogatories?: string[]; vectorBasedDefinitions?: string[]; }) => {
  const plaintiff = extractedData.plaintiff || 'PLAINTIFF';
  const defendant = extractedData.defendant || 'DEFENDANT';
  const caseNumber = extractedData.case?.caseNumber || extractedData.caseNumber || 'CASE-000';

  return (
    <Document title={`Special Interrogatories - ${plaintiff} v. ${defendant}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ textAlign: 'center', fontFamily: 'Times-Bold', fontSize: 14, marginBottom: 20 }}>
            SPECIAL INTERROGATORIES
          </Text>
          <Text>Case No.: {caseNumber}</Text>
          <Text>Propounding Party: {plaintiff}</Text>
          <Text>Responding Party: {defendant}</Text>
          <Text>Set Number: ONE</Text>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontFamily: 'Times-Bold' }}>DEFINITIONS</Text>
          {(vectorBasedDefinitions || []).map((d, i) => (
            <View key={i} style={{ marginTop: 5, marginLeft: 10 }}>
              <Text>{i + 1}. {d}</Text>
            </View>
          ))}
        </View>

        <View>
          <Text style={{ fontFamily: 'Times-Bold' }}>SPECIAL INTERROGATORIES</Text>
          {(vectorBasedInterrogatories || []).map((q, i) => (
            <View key={i} style={{ marginTop: 10, marginLeft: 10 }}>
              <Text>
                <Text style={{ fontFamily: 'Times-Bold' }}>INTERROGATORY NO. {i + 1}:</Text>
              </Text>
              <Text style={{ marginTop: 5 }}>{q}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export default SpecialInterrogatoriesPreview;
