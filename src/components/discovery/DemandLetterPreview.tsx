import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DemandLetterData } from '@/integrations/gemini/client';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 12,
    paddingTop: 50,
    paddingLeft: 60,
    paddingright: 60,
    paddingBottom: 50,
    backgroundColor: '#FFFFFF',
  },
  header: {
    fontSize: 10,
    marginBottom: 20,
    textAlign: 'right',
  },
  reLine: {
    fontSize: 12,
    marginBottom: 15,
    fontWeight: 'bold',
  },
  salutation: {
    fontSize: 12,
    marginBottom: 15,
  },
  paragraph: {
    fontSize: 12,
    marginBottom: 15,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
  },
  bulletList: {
    marginLeft: 20,
    marginBottom: 15,
  },
  bulletPoint: {
    fontSize: 12,
    marginBottom: 5,
    lineHeight: 1.3,
  },
  closing: {
    fontSize: 12,
    marginTop: 20,
    marginBottom: 15,
  },
  signature: {
    marginTop: 30,
    marginBottom: 10,
  },
  signatureLine: {
    fontSize: 12,
    marginBottom: 5,
  }
});

interface DemandLetterPreviewProps {
  data: DemandLetterData;
  isOpen: boolean;
  onClose: () => void;
}

const DemandLetterDocument: React.FC<{ data: DemandLetterData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text>{data.header}</Text>
      </View>

      {/* RE Line */}
      <View style={styles.reLine}>
        <Text>{data.re_line}</Text>
      </View>

      {/* Salutation */}
      <View style={styles.salutation}>
        <Text>{data.salutation}</Text>
      </View>

      {/* Opening Paragraph */}
      <View style={styles.paragraph}>
        <Text>{data.opening_paragraph}</Text>
      </View>

      {/* Medical Providers Section */}
      {data.medical_providers && (
        <View>
          <Text style={styles.sectionTitle}>MEDICAL PROVIDERS</Text>
          <View style={styles.paragraph}>
            <Text>{data.medical_providers}</Text>
          </View>
        </View>
      )}

      {/* Injuries Section */}
      {data.injuries && (
        <View>
          <Text style={styles.sectionTitle}>INJURIES SUSTAINED</Text>
          <View style={styles.bulletList}>
            {data.injuries.split('\n').filter(line => line.trim()).map((injury, index) => (
              <Text key={index} style={styles.bulletPoint}>
                • {injury.trim()}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* Damages Summary */}
      {data.damages_summary && (
        <View>
          <Text style={styles.sectionTitle}>DAMAGES</Text>
          <View style={styles.paragraph}>
            <Text>{data.damages_summary}</Text>
          </View>
        </View>
      )}

      {/* Settlement Demand */}
      <View>
        <Text style={styles.sectionTitle}>SETTLEMENT DEMAND</Text>
        <View style={styles.paragraph}>
          <Text>{data.settlement_demand}</Text>
        </View>
      </View>

      {/* Closing */}
      <View style={styles.closing}>
        <Text>{data.closing}</Text>
      </View>

      {/* Signature */}
      <View style={styles.signature}>
        <Text style={styles.signatureLine}>Sincerely,</Text>
        <Text style={styles.signatureLine}> </Text>
        <Text style={styles.signatureLine}> </Text>
        <Text style={styles.signatureLine}>_________________________</Text>
        <Text style={styles.signatureLine}>Attorney Name</Text>
        <Text style={styles.signatureLine}>Attorney for Plaintiff</Text>
      </View>
    </Page>
  </Document>
);

export const DemandLetterPreview: React.FC<DemandLetterPreviewProps> = ({ data, isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Demand Letter Preview</DialogTitle>
        </DialogHeader>
        <div className="flex-1 h-full">
          <PDFViewer width="100%" height="100%">
            <DemandLetterDocument data={data} />
          </PDFViewer>
        </div>
      </DialogContent>
    </Dialog>
  );
};
