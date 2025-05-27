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
  definitionsSection: {
    marginTop: 30,
  },
  documentSection: {
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
  documentRequest: {
    marginBottom: 15,
  },
});

interface RequestForProductionPdfButtonProps {
  extractedData?: ComplaintInformation;
  caseId?: string;
}

// Component to generate Request for Production PDF
const RequestForProductionPdfDocument: React.FC<{ extractedData: ComplaintInformation }> = ({ extractedData }) => {
  // Generate line numbers for the document (1-28 for first page)
  const generateLineNumbers = (count: number) => {
    const numbers = [];
    for (let i = 0; i < count; i++) {
      numbers.push(i + 1);
    }
    return numbers;
  };

  const lineNumbers = generateLineNumbers(28);

  // Generate document requests based on case type
  const generateDocumentRequests = () => {
    const caseType = extractedData.caseType?.toLowerCase() || '';
    const documentRequests = [];

    // Common document requests for all case types
    documentRequests.push(
      "All documents that refer or relate to the incident(s) described in the complaint.",
      "All documents that you intend to introduce as evidence at trial.",
      "All statements, written or recorded, made by any party to this action concerning the subject matter of this lawsuit."
    );

    // Case-specific document requests
    if (caseType.includes('contract')) {
      documentRequests.push(
        "All contracts or agreements between plaintiff and defendant, including all amendments, modifications, or supplements thereto.",
        "All correspondence, emails, text messages, or other communications between plaintiff and defendant relating to the contract(s) at issue.",
        "All documents evidencing payment or non-payment under the contract(s) at issue.",
        "All documents that you contend show performance or non-performance of obligations under the contract(s) at issue.",
        "All documents relating to damages claimed in this action, including all calculations, estimates, invoices, receipts, and proof of payment."
      );
    } else if (caseType.includes('personal injury') || extractedData.chargeDescription?.toLowerCase().includes('accident') || extractedData.chargeDescription?.toLowerCase().includes('injury')) {
      documentRequests.push(
        "All photographs, videos, or other depictions of the scene of the incident, any vehicles involved, or any injuries claimed.",
        "All medical records relating to the injuries claimed in this lawsuit, including but not limited to hospital records, physician records, physical therapy records, and diagnostic test results.",
        "All medical bills, invoices, statements, or other documents showing expenses incurred for treatment of injuries claimed in this lawsuit.",
        "All documents relating to any health insurance claims made for the treatment of injuries claimed in this lawsuit.",
        "All documents relating to prior injuries, medical conditions, or treatments involving the same body parts allegedly injured in the incident that is the subject of this lawsuit."
      );
    } else if (caseType.includes('employment')) {
      documentRequests.push(
        "All documents relating to plaintiff's employment with defendant, including but not limited to employment applications, employment contracts, personnel files, and performance evaluations.",
        "All documents relating to plaintiff's compensation, including but not limited to payroll records, time records, wage statements, and commission statements.",
        "All documents relating to any complaints of discrimination, harassment, retaliation, or other unlawful conduct made by plaintiff during employment with defendant.",
        "All communications between plaintiff and any supervisor, manager, or human resources personnel regarding the alleged unlawful conduct described in the complaint.",
        "All policies, procedures, employee handbooks, or guidelines in effect during plaintiff's employment with defendant relating to the issues in this lawsuit."
      );
    } else {
      // General document requests for other case types
      documentRequests.push(
        "All documents that support or relate to each claim or cause of action alleged in your complaint.",
        "All documents that support or relate to the damages claimed in this action.",
        "All documents that identify persons having knowledge of any facts relating to this case.",
        "All insurance policies that may provide coverage for the claims made in this action.",
        "All expert reports or other documents prepared by expert witnesses whom you expect to call at trial."
      );
    }

    // Additional document requests for all cases
    documentRequests.push(
      "All witness statements concerning the facts and circumstances of the incident giving rise to this lawsuit.",
      "All correspondence between the parties to this action relating to the subject matter of this lawsuit."
    );

    return documentRequests;
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
  const documentRequests = generateDocumentRequests();
  const plaintiff = extractedData.plaintiff || 'PLAINTIFF';
  const plaintiffShort = extractedData.plaintiff?.split(',')[0] || 'PLAINTIFF';
  const defendant = extractedData.defendant || 'DEFENDANT';
  const defendantShort = extractedData.defendant?.split(',')[0] || 'DEFENDANT';
  const caseNumber = extractedData.case?.caseNumber || extractedData.caseNumber || 'CASE NUMBER';
  
  return (
    <Document title={`Request for Production - ${plaintiffShort} v. ${defendantShort}`}>
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
                <Text style={styles.bold}>REQUEST FOR PRODUCTION OF</Text>
              </View>
            </View>

            <View style={styles.parenthesisRow}>
              <Text>)</Text>
              <View style={styles.parenthesisRight}>
                <Text style={styles.bold}>DOCUMENTS, SET ONE</Text>
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
            Plaintiff hereby requests that Defendant produce and permit Plaintiff to inspect and copy the documents
          </Text>
          <Text>
            and things described in this request at the time and place designated below:
          </Text>
          <Text></Text>
          <Text>
            Date: {format(new Date(new Date().setDate(new Date().getDate() + 30)), 'MMMM d, yyyy')}
          </Text>
          <Text>
            Time: 10:00 a.m.
          </Text>
          <Text>
            Place: {attorneyInfo.address}, {attorneyInfo.cityStateZip}
          </Text>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>1</Text>
          <Text style={styles.footerText}>REQUEST FOR PRODUCTION OF DOCUMENTS, SET ONE</Text>
        </View>
      </Page>
      
      {/* Second page for definitions and document requests */}
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
        
        {/* Definitions Section */}
        <View style={styles.definitionsSection}>
          <Text style={styles.headerLeft}><Text style={styles.bold}>DEFINITIONS:</Text></Text>
          <Text style={{ marginTop: 10 }}></Text>
          
          <Text>1. "DOCUMENT" means any writing as defined in Evidence Code Section 250 and includes the original</Text>
          <Text>   or a copy of handwriting, typewriting, printing, photostating, photographing, and every other</Text>
          <Text>   means of recording upon any tangible thing, any form of communication or representation,</Text>
          <Text>   including letters, words, pictures, sounds, or symbols, or combinations thereof, and any record</Text>
          <Text>   thereby created, regardless of the manner in which the record has been stored.</Text>
          <Text></Text>
          <Text>2. "YOU" and "YOUR" refer to the party to whom these requests are directed, including all agents,</Text>
          <Text>   employees, representatives, attorneys, and any other person acting on your behalf.</Text>
        </View>
        
        {/* Documents Content */}
        <View style={styles.documentSection}>
          <Text style={styles.headerLeft}><Text style={styles.bold}>DOCUMENTS REQUESTED:</Text></Text>
          <Text style={{ marginTop: 10 }}></Text>
          
          {documentRequests.map((request, index) => (
            <View key={index} style={styles.documentRequest}>
              <Text>
                <Text style={styles.bold}>{index + 1}. </Text>
                {request}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>2</Text>
          <Text style={styles.footerText}>REQUEST FOR PRODUCTION OF DOCUMENTS, SET ONE</Text>
        </View>
      </Page>
      
      {/* Third page for signature */}
      <Page size="LETTER" style={styles.page}>
        {/* Vertical double lines on left side */}
        <View style={styles.verticalLineLeft} />
        <View style={styles.verticalLineLeft2} />
        
        {/* Line numbers - reset for third page */}
        <View style={styles.lineNumbers}>
          {lineNumbers.map((num) => (
            <View key={num}>
              <Text>{num}</Text>
              <View style={styles.smallSpacer} />
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
          <Text style={styles.footerText}>3</Text>
          <Text style={styles.footerText}>REQUEST FOR PRODUCTION OF DOCUMENTS, SET ONE</Text>
        </View>
      </Page>
    </Document>
  );
};

// Button component for previewing and downloading Request for Production PDF
const RequestForProductionPdfButton: React.FC<RequestForProductionPdfButtonProps> = ({ extractedData, caseId }) => {
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 3;

  if (!extractedData) {
    return (
      <Button disabled className="w-full">
        <FileText className="mr-2 h-4 w-4" /> Preview Request for Production
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
          document={<RequestForProductionPdfDocument extractedData={extractedData} />}
          fileName={`request_for_production_${caseId || 'document'}.pdf`}
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
              <span>Request for Production Preview</span>
              <DialogClose className="ml-auto">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden mt-4">
            <PDFViewer width="100%" height="100%" className="border rounded">
              <RequestForProductionPdfDocument extractedData={extractedData} />
            </PDFViewer>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex gap-2">
              <PDFDownloadLink 
                document={<RequestForProductionPdfDocument extractedData={extractedData} />} 
                fileName={`Request_for_Production_${extractedData.case?.caseNumber || ''}.pdf`}
                className="inline-flex"
              >
                {({ loading }) => (
                  <Button variant="outline" size="sm" disabled={loading}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </PDFDownloadLink>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RequestForProductionPdfButton; 