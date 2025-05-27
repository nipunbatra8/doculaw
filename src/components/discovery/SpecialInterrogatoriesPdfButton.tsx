import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogClose 
} from '@/components/ui/dialog';
import { 
  Download, 
  FileText, 
  Eye, 
  Loader2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Printer 
} from 'lucide-react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  PDFViewer,
  Font,
} from '@react-pdf/renderer';
import { ComplaintInformation } from '@/integrations/gemini/client';
import { format } from 'date-fns';

// Register fonts
Font.register({
  family: 'Times-Roman',
  src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/times-new-roman@1.0.4/Times New Roman.ttf',
});

Font.register({
  family: 'Times-Bold',
  src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/times-new-roman-bold@1.0.4/Times New Roman Bold.ttf',
});

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingLeft: 70,
    fontFamily: 'Times-Roman',
    fontSize: 12,
    lineHeight: 1.25,
  },
  verticalLineLeft: {
    position: 'absolute',
    left: 65,
    top: 40,
    bottom: 40,
    borderColor: '#000',
    borderLeftWidth: 0.5,
  },
  verticalLineLeft2: {
    position: 'absolute',
    left: 68,
    top: 40,
    bottom: 40,
    borderColor: '#000',
    borderLeftWidth: 0.5,
  },
  lineNumbers: {
    position: 'absolute',
    left: 35,
    top: 45,
    width: 20,
    textAlign: 'right',
    fontSize: 10,
    lineHeight: 2,
  },
  headerLeft: {
    textAlign: 'left',
    fontSize: 12,
    marginBottom: 3,
  },
  bold: {
    fontFamily: 'Times-Bold',
  },
  headerInfo: {
    marginBottom: 15,
  },
  courtTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  countyTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  caseBlock: {
    marginTop: 10,
    flexDirection: 'row',
  },
  partiesLeft: {
    width: '50%',
  },
  rightSide: {
    width: '50%',
    paddingLeft: 5,
  },
  partyVs: {
    marginLeft: 70,
  },
  parenthesisRow: {
    flexDirection: 'row',
  },
  parenthesisRight: {
    paddingLeft: 5,
  },
  propoundingParties: {
    marginTop: 20,
    marginBottom: 5,
  },
  instructionsSection: {
    marginTop: 30,
  },
  interrogatorySection: {
    marginTop: 20,
  },
  underline: {
    textDecoration: 'underline',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 12,
  },
  footerLine: {
    borderTopWidth: 0.5,
    width: '100%',
    marginBottom: 5,
  },
  footerText: {
    textAlign: 'center',
    fontFamily: 'Times-Bold',
  },
  signatureBlock: {
    marginTop: 50,
    alignItems: 'flex-end',
  },
  spacer: {
    height: 10,
  },
  bigSpacer: {
    height: 20,
  },
  smallSpacer: {
    height: 4,
  },
  interrogatory: {
    marginBottom: 15,
  },
});

interface SpecialInterrogatoriesPdfButtonProps {
  extractedData?: ComplaintInformation;
  caseId?: string;
}

// Component to generate Special Interrogatories PDF
const SpecialInterrogatoriesPdfDocument: React.FC<{ extractedData: ComplaintInformation }> = ({ extractedData }) => {
  // Generate line numbers for the document (1-28 for first page)
  const generateLineNumbers = (count: number) => {
    const numbers = [];
    for (let i = 0; i < count; i++) {
      numbers.push(i + 1);
    }
    return numbers;
  };

  const lineNumbers = generateLineNumbers(28);

  // Generate interrogatories based on case type
  const generateInterrogatories = () => {
    const caseType = extractedData.caseType?.toLowerCase() || '';
    const interrogatories = [];

    // Common interrogatories for all case types
    interrogatories.push(
      "Please state your full legal name, date of birth, and all addresses at which you have resided for the past five (5) years.",
      "Please provide your current employment information, including the name and address of your employer, your position or title, your job duties, and your current income.",
      "Please identify all persons who have knowledge of any facts relating to this case and provide a brief description of their knowledge."
    );

    // Case-specific interrogatories
    if (caseType.includes('contract')) {
      interrogatories.push(
        `Please describe in detail the terms of the contract(s) at issue in this case between ${extractedData.plaintiff} and ${extractedData.defendant}.`,
        "Please state the date(s) on which the contract(s) was/were allegedly breached and describe in detail each alleged breach.",
        "Please identify all documents that evidence the contract(s) at issue in this case, including all written agreements, amendments, and related communications.",
        "Please state all facts supporting your contention that you performed all obligations required of you under the contract(s).",
        "Please state in detail all damages you claim to have suffered as a result of the alleged breach of contract, including the specific amount of each item of damage and the method used to calculate each item."
      );
    } else if (caseType.includes('personal injury') || extractedData.chargeDescription?.toLowerCase().includes('accident') || extractedData.chargeDescription?.toLowerCase().includes('injury')) {
      interrogatories.push(
        "Please describe in detail the incident that is the subject of this lawsuit, including the date, time, location, and circumstances.",
        "Please identify all injuries you claim to have sustained as a result of the incident, including the nature and extent of each injury.",
        "Please identify all healthcare providers who have treated you for the injuries alleged in this lawsuit, including the name, address, and specialty of each provider, and the dates of treatment.",
        "Please state whether you had any pre-existing injuries or medical conditions affecting the same parts of your body that were allegedly injured in the incident, and if so, describe such injuries or conditions.",
        "Please identify all medical expenses you claim were incurred as a result of the incident, including the name of the provider, the dates of service, and the amount of each expense."
      );
    } else if (caseType.includes('employment')) {
      interrogatories.push(
        `Please state the dates of your employment with ${extractedData.defendant} and describe all positions held, including job titles, duties, and reporting relationships.`,
        "Please identify all supervisors and managers to whom you reported during your employment, including their names, job titles, and dates of supervision.",
        "Please describe in detail each instance of alleged discrimination, harassment, retaliation, or other unlawful conduct that forms the basis of your claims.",
        "Please identify all persons who witnessed or have knowledge of the alleged unlawful conduct described in your complaint.",
        "Please identify all complaints you made regarding the alleged unlawful conduct, including the date of each complaint, the person(s) to whom you complained, the substance of each complaint, and any response received."
      );
    } else {
      // General interrogatories for other case types
      interrogatories.push(
        "Please state all facts that support each claim or cause of action alleged in your complaint.",
        "Please identify all documents that support each claim or cause of action alleged in your complaint.",
        "Please identify all witnesses who have knowledge of facts supporting each claim or cause of action alleged in your complaint.",
        "Please state in detail all damages you claim to have suffered in connection with this lawsuit, including the specific amount of each item of damage and the method used to calculate each item.",
        "Please identify all statements, whether written or oral, made by any party to this action or any witness concerning the subject matter of this lawsuit."
      );
    }

    // Additional interrogatories for all cases
    interrogatories.push(
      "Please identify all documents you intend to use as exhibits at trial.",
      "Please identify all expert witnesses you intend to call at trial, including their names, addresses, qualifications, and the subject matter on which each expert is expected to testify."
    );

    return interrogatories;
  };

  // Get court information from extracted data
  const getCourtInfo = () => {
    const { courtName, court } = extractedData;
    return {
      county: court?.county || (courtName?.split('County of ')[1] || "Los Angeles"),
      name: courtName || "Superior Court of California",
      branch: "" // Not available in the interface
    };
  };

  // Get attorney information from extracted data
  const getAttorneyInfo = () => {
    const { attorney, plaintiff } = extractedData;
    return {
      name: attorney?.name || "Attorney Name Not Specified",
      barNumber: attorney?.barNumber || "Bar Number Not Specified",
      firm: attorney?.firm || "Firm Not Specified",
      address: attorney?.address?.street || "Address Not Specified",
      cityStateZip: attorney?.address ? 
        `${attorney.address.city || ''}, ${attorney.address.state || ''} ${attorney.address.zip || ''}` 
        : "City, State ZIP",
      phone: attorney?.phone || "Phone Not Specified",
      fax: attorney?.fax || "Fax Not Specified",
      email: attorney?.email || "Email Not Specified",
      for: attorney?.attorneyFor || plaintiff || "Plaintiff Not Specified"
    };
  };
  
  const courtInfo = getCourtInfo();
  const attorneyInfo = getAttorneyInfo();
  const interrogatories = generateInterrogatories();
  const plaintiff = extractedData.plaintiff || 'PLAINTIFF';
  const plaintiffShort = extractedData.plaintiff?.split(',')[0] || 'PLAINTIFF';
  const defendant = extractedData.defendant || 'DEFENDANT';
  const defendantShort = extractedData.defendant?.split(',')[0] || 'DEFENDANT';
  const caseNumber = extractedData.case?.caseNumber || extractedData.caseNumber || 'CASE NUMBER';
  
  return (
    <Document title={`Special Interrogatories - ${plaintiffShort} v. ${defendantShort}`}>
      <Page size="LETTER" style={styles.page}>
        {/* Vertical double lines on left side */}
        <View style={styles.verticalLineLeft} />
        <View style={styles.verticalLineLeft2} />
        
        {/* Line numbers */}
        <View style={styles.lineNumbers}>
          {lineNumbers.map((num) => (
            <View key={num}>
              <Text>{num}</Text>
              <View style={styles.smallSpacer} />
            </View>
          ))}
        </View>
        
        {/* Attorney Information Header */}
        <View style={styles.headerInfo}>
          <Text style={styles.headerLeft}>
            <Text style={styles.bold}>{attorneyInfo.name}</Text>
          </Text>
          <Text style={styles.headerLeft}>
            <Text style={styles.bold}>{attorneyInfo.firm}</Text>
          </Text>
          <Text style={styles.headerLeft}>{attorneyInfo.address}</Text>
          <Text style={styles.headerLeft}>{attorneyInfo.cityStateZip}</Text>
          <Text style={styles.headerLeft}>Telephone: {attorneyInfo.phone}</Text>
          <Text style={styles.headerLeft}>Facsimile: {attorneyInfo.fax}</Text>
          <Text style={styles.headerLeft}>Email: {attorneyInfo.email}</Text>
          <Text style={styles.headerLeft}></Text>
          <Text style={styles.headerLeft}>
            Attorney for {attorneyInfo.for},
          </Text>
          <Text style={styles.headerLeft}>
            <Text style={styles.bold}>{plaintiffShort}</Text>
          </Text>
        </View>
        
        {/* Court Title */}
        <Text style={styles.courtTitle}>SUPERIOR COURT OF THE STATE OF CALIFORNIA</Text>
        <Text style={styles.countyTitle}>FOR THE COUNTY OF {courtInfo.county.toUpperCase()}</Text>
        
        {/* Case Block with Parties */}
        <View style={styles.caseBlock}>
          <View style={styles.partiesLeft}>
            <Text>{plaintiff},</Text>
            <View style={styles.bigSpacer} />
            <Text style={styles.partyVs}>Plaintiff,</Text>
            <Text>vs.</Text>
            <View style={styles.bigSpacer} />
            <Text style={{ width: '90%' }}>{defendant}</Text>
            <View style={styles.bigSpacer} />
            <Text style={styles.partyVs}>Defendants.</Text>
            <View style={{height: 15}} />
            <Text style={{ marginTop: 5, borderBottomWidth: 0.5, borderColor: '#000', width: '100%' }}></Text>
          </View>
          
          <View style={styles.rightSide}>
            <View style={styles.parenthesisRow}>
              <Text>)</Text>
              <View style={styles.parenthesisRight}>
                <Text>Case No.: {caseNumber}</Text>
                <Text></Text>
              </View>
            </View>

            <View style={styles.parenthesisRow}>
              <Text>)</Text>
              <View style={styles.parenthesisRight}>
                <Text></Text>
              </View>
            </View>

            <View style={styles.parenthesisRow}>
              <Text>)</Text>
              <View style={styles.parenthesisRight}>
                <Text style={styles.bold}>SPECIAL INTERROGATORIES</Text>
              </View>
            </View>

            <View style={styles.parenthesisRow}>
              <Text>)</Text>
              <View style={styles.parenthesisRight}>
                <Text style={styles.bold}>TO DEFENDANT, SET ONE</Text>
              </View>
            </View>
            
            {/* Fill with parenthesis and right-side text for each line */}
            {Array(8).fill(null).map((_, i) => (
              <View key={i} style={styles.parenthesisRow}>
                <Text>)</Text>
                <View style={styles.parenthesisRight}>
                  <Text></Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        
        {/* Propounding/Responding Parties */}
        <View style={styles.propoundingParties}>
          <Text style={styles.bold}>PROPOUNDING PARTY: Plaintiff, {plaintiffShort}</Text>
          <Text style={styles.bold}>RESPONDING PARTY:   Defendant, {defendantShort}</Text>
          <Text style={styles.bold}>SET NUMBER:         ONE</Text>
        </View>
        
        {/* Instructions Section */}
        <View style={styles.instructionsSection}>
          <Text>TO ALL PARTIES HEREIN AND TO THEIR RESPECTIVE ATTORNEYS OF RECORD:</Text>
          <Text></Text>
          <Text>
            In answering these interrogatories, furnish all information that is available to you, including
          </Text>
          <Text>
            information in the possession of your attorneys, investigators, employees, agents, representatives,
          </Text>
          <Text>
            or any other person acting on your behalf, and not merely information known of your own personal
          </Text>
          <Text>
            knowledge.
          </Text>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>1</Text>
          <Text style={styles.footerText}>SPECIAL INTERROGATORIES TO DEFENDANT, SET ONE</Text>
        </View>
      </Page>
      
      {/* Second page for interrogatories content */}
      <Page size="LETTER" style={styles.page}>
        {/* Vertical double lines on left side */}
        <View style={styles.verticalLineLeft} />
        <View style={styles.verticalLineLeft2} />
        
        {/* Line numbers - reset for second page */}
        <View style={styles.lineNumbers}>
          {lineNumbers.map((num) => (
            <View key={num}>
              <Text>{num}</Text>
              <View style={styles.smallSpacer} />
            </View>
          ))}
        </View>
        
        {/* Interrogatories Content */}
        <View style={styles.interrogatorySection}>
          <Text style={styles.headerLeft}><Text style={styles.bold}>INTERROGATORIES:</Text></Text>
          <Text style={{ marginTop: 10 }}></Text>
          
          {interrogatories.map((interrogatory, index) => (
            <View key={index} style={styles.interrogatory}>
              <Text>
                <Text style={styles.bold}>{index + 1}. </Text>
                {interrogatory}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Signature Block - aligned to the right */}
        <View style={styles.signatureBlock}>
          <Text>Dated: {format(new Date(), 'MMMM d, yyyy')}</Text>
          <Text style={{ marginTop: 30 }}>{attorneyInfo.firm}</Text>
          <Text style={{ marginTop: 10 }}></Text>
          <Text style={{ marginTop: 10 }}>By: ______________________________</Text>
          <Text style={{ marginTop: 5 }}>{attorneyInfo.name}</Text>
          <Text>Attorney for Plaintiff</Text>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>2</Text>
          <Text style={styles.footerText}>SPECIAL INTERROGATORIES TO DEFENDANT, SET ONE</Text>
        </View>
      </Page>
    </Document>
  );
};

// Button component for previewing and downloading Special Interrogatories PDF
const SpecialInterrogatoriesPdfButton: React.FC<SpecialInterrogatoriesPdfButtonProps> = ({ extractedData, caseId }) => {
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 2;

  if (!extractedData) {
    return (
      <Button disabled className="w-full">
        <FileText className="mr-2 h-4 w-4" /> Preview Special Interrogatories
      </Button>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={() => setShowPdfDialog(true)}
          variant="outline"
        >
          <Eye className="mr-2 h-4 w-4" /> Preview
        </Button>
        
        <PDFDownloadLink
          document={<SpecialInterrogatoriesPdfDocument extractedData={extractedData} />}
          fileName={`special_interrogatories_${caseId || 'document'}.pdf`}
          style={{ textDecoration: 'none' }}
        >
          {({ loading }) => (
            <Button disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download
            </Button>
          )}
        </PDFDownloadLink>
      </div>
      
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Special Interrogatories Preview</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden mt-4">
            <PDFViewer width="100%" height="100%" className="border rounded">
              <SpecialInterrogatoriesPdfDocument extractedData={extractedData} />
            </PDFViewer>
          </div>
          
          <div className="flex justify-end items-center mt-4 space-x-2">
            <PDFDownloadLink 
              document={<SpecialInterrogatoriesPdfDocument extractedData={extractedData} />} 
              fileName={`Special_Interrogatories_${extractedData.case?.caseNumber || ''}.pdf`}
              className="inline-flex"
            >
              {({ loading }) => (
                <Button variant="outline" size="sm" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Download
                </Button>
              )}
            </PDFDownloadLink>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Close
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SpecialInterrogatoriesPdfButton; 