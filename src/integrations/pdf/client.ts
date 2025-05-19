import { PDFDocument, rgb } from 'pdf-lib';
import { ComplaintInformation } from '@/integrations/gemini/client';

/**
 * Utility function to inspect and log all form field names in a PDF
 * This is helpful for debugging and finding the correct field names
 */
export const inspectPdfFields = async (pdfBytes?: ArrayBuffer): Promise<{name: string, type: string}[]> => {
  try {
    // If no PDF bytes provided, fetch from courts website
    if (!pdfBytes) {
      pdfBytes = await downloadPdfFromCourts();
    }
    
    // Load the PDF document with options to handle encrypted PDFs
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      updateMetadata: false
    });
    
    // Get the form
    const form = pdfDoc.getForm();
    
    // Get all fields with their types
    const fields = form.getFields().map(field => ({
      name: field.getName(),
      type: field.constructor.name
    }));
    
    // Log field details to console for debugging
    console.log('PDF Form Fields:', fields);
    
    // Log more detailed information about each field
    console.log('\n--- DETAILED PDF FIELD INFORMATION ---');
    
    fields.forEach((field, index) => {
      console.log(`Field #${index + 1}:`);
      console.log(`  Name: ${field.name}`);
      console.log(`  Type: ${field.type}`);
      
      try {
        // Try to get more information based on field type
        if (field.type.includes('TextField')) {
          const textField = form.getTextField(field.name);
          console.log(`  Text: "${textField.getText() || '(empty)'}"`);
          console.log(`  Is Multiline: ${textField.isMultiline()}`);
          console.log(`  Is Required: ${textField.isRequired()}`);
          console.log(`  Is Read Only: ${textField.isReadOnly()}`);
        } 
        else if (field.type.includes('CheckBox')) {
          const checkBox = form.getCheckBox(field.name);
          console.log(`  Is Checked: ${checkBox.isChecked()}`);
          console.log(`  Is Required: ${checkBox.isRequired()}`);
          console.log(`  Is Read Only: ${checkBox.isReadOnly()}`);
        }
        else if (field.type.includes('RadioGroup')) {
          const radioGroup = form.getRadioGroup(field.name);
          console.log(`  Selected: "${radioGroup.getSelected() || '(none)'}"`);
          console.log(`  Options: ${radioGroup.getOptions().join(', ')}`);
          console.log(`  Is Required: ${radioGroup.isRequired()}`);
          console.log(`  Is Read Only: ${radioGroup.isReadOnly()}`);
        }
        else if (field.type.includes('DropDown')) {
          const dropDown = form.getDropdown(field.name);
          console.log(`  Selected: "${dropDown.getSelected() || '(none)'}"`);
          console.log(`  Options: ${dropDown.getOptions().join(', ')}`);
          console.log(`  Is Required: ${dropDown.isRequired()}`);
          console.log(`  Is Read Only: ${dropDown.isReadOnly()}`);
        }
      } catch (fieldError) {
        console.log(`  Error getting details: ${fieldError instanceof Error ? fieldError.message : 'Unknown error'}`);
      }
      
      console.log('---');
    });
    
    return fields;
  } catch (error) {
    console.error('Error inspecting PDF fields:', error);
    return [];
  }
};

/**
 * Downloads the PDF from local storage
 */
export const downloadPdfFromCourts = async (): Promise<ArrayBuffer> => {
  console.log('Downloading PDF from local storage...');
  
  try {
    console.log('Trying to fetch local FI.pdf file');
    
    const response = await fetch('/FI.pdf');
    if (!response.ok) throw new Error(`Local PDF fetch failed: ${response.status}`);
    
    const pdfBytes = await response.arrayBuffer();
    console.log(`Successfully downloaded PDF: ${pdfBytes.byteLength} bytes`);
    return pdfBytes;
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw new Error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Fills out a Form Interrogatories PDF (DISC-001) with case information
 * @param caseInfo Information extracted from the complaint
 * @param isPreview Whether this is for preview mode (includes checking box 50.1 and removing buttons/disclaimer)
 * @returns An ArrayBuffer containing the filled PDF
 */
export const fillFormInterrogatories = async (
  caseInfo: ComplaintInformation,
  isPreview: boolean = false
): Promise<ArrayBuffer> => {
  try {
    console.log('Starting to fill form interrogatories PDF...');
    
    // Download the PDF directly from the courts website instead of using a local file
    const pdfBytes = await downloadPdfFromCourts();
    
    // Load the PDF document with options to handle encrypted PDFs
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      updateMetadata: false
    });
    
    if (!pdfDoc) {
      throw new Error('Failed to load PDF document');
    }
    
    // Get the form fields
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`Found ${fields.length} form fields`);
    
    // Log field information to help with debugging
    const fieldSummary = fields.map(field => ({
      name: field.getName(),
      type: field.constructor.name
    }));
    console.log('PDF form fields:', fieldSummary);
    
    if (fields.length === 0) {
      console.warn('No form fields found. This PDF may be encrypted or not properly formatted as a fillable form.');
      console.warn('Returning the original PDF...');
      return pdfBytes;
    }
    
    // Common field mappings for DISC-001 form
    const fieldMappings: Record<string, string> = {
      // Attorney information
      'attorney.name': caseInfo.attorney?.name || '',
      'attorney.firm': caseInfo.attorney?.firm || '',
      'attorney.address.street': caseInfo.attorney?.address?.street || '',
      'attorney.address.city': caseInfo.attorney?.address?.city || '',
      'attorney.address.state': caseInfo.attorney?.address?.state || '',
      'attorney.address.zip': caseInfo.attorney?.address?.zip || '',
      'attorney.phone': caseInfo.attorney?.phone || '',
      'attorney.fax': caseInfo.attorney?.fax || '',
      'attorney.email': caseInfo.attorney?.email || '',
      'attorney.for': caseInfo.attorney?.attorneyFor || '',
      
      // Court information
      'court.county': caseInfo.court?.county || (caseInfo.courtName?.split('County of ')[1] || ''),
      'court.address': '',
      'court.city': '',
      'court.zip': '',
      'court.branch': '',
      
      // Case information
      'case.number': caseInfo.case?.caseNumber || caseInfo.caseNumber || '',
      'case.title': caseInfo.case?.shortTitle || `${caseInfo.plaintiff || ''} v. ${caseInfo.defendant || ''}`,
      'case.plaintiff': caseInfo.plaintiff || '',
      'case.defendant': caseInfo.defendant || '',
      
      // Form information
      'form.requestingParty': caseInfo.formParties?.askingParty || caseInfo.plaintiff || '',
      'form.respondingParty': caseInfo.formParties?.answeringParty || caseInfo.defendant || '',
      'form.setNumber': caseInfo.formParties?.setNumber || '',
      'form.date': caseInfo.date || `${new Date().getMonth() + 1}/${new Date().getDate()}/${new Date().getFullYear()}`
    };
    
    // Try to fill any text fields we can find
    let successfulFields = 0;
    for (const field of fields) {
      try {
        const fieldName = field.getName();
        
        // Skip non-text fields
        if (!field.constructor.name.includes('TextField')) {
          continue;
        }
        
        const textField = form.getTextField(fieldName);
        
        // Try direct mappings first
        let valueSet = false;
        for (const [key, value] of Object.entries(fieldMappings)) {
          if (fieldName.toLowerCase().includes(key.toLowerCase())) {
            textField.setText(value);
            console.log(`Filled field ${fieldName} with "${value}" (matched key: ${key})`);
            successfulFields++;
            valueSet = true;
            break;
          }
        }
        
        // If no direct mapping was found, try pattern matching
        if (!valueSet) {
          // Fill based on field name patterns
          if (fieldName.includes('Name') || fieldName.includes('AttyName')) {
            textField.setText(caseInfo.attorney?.name || '');
            successfulFields++;
          }
          else if (fieldName.includes('Firm') || fieldName.includes('AttyFirm')) {
            textField.setText(caseInfo.attorney?.firm || '');
            successfulFields++;
          }
          else if (fieldName.includes('Street')) {
            textField.setText(caseInfo.attorney?.address?.street || '');
            successfulFields++;
          }
          else if (fieldName.includes('City')) {
            textField.setText(caseInfo.attorney?.address?.city || '');
            successfulFields++;
          }
          else if (fieldName.includes('State')) {
            textField.setText(caseInfo.attorney?.address?.state || '');
            successfulFields++;
          }
          else if (fieldName.includes('Zip')) {
            textField.setText(caseInfo.attorney?.address?.zip || '');
            successfulFields++;
          }
          else if (fieldName.includes('Phone')) {
            textField.setText(caseInfo.attorney?.phone || '');
            successfulFields++;
          }
          else if (fieldName.includes('Fax')) {
            textField.setText(caseInfo.attorney?.fax || '');
            successfulFields++;
          }
          else if (fieldName.includes('Email')) {
            textField.setText(caseInfo.attorney?.email || '');
            successfulFields++;
          }
          else if (fieldName.includes('AttyFor')) {
            textField.setText(caseInfo.attorney?.attorneyFor || '');
            successfulFields++;
          }
          else if (fieldName.includes('County') || fieldName.includes('CrtCounty')) {
            textField.setText(caseInfo.court?.county || (caseInfo.courtName?.split('County of ')[1] || ''));
            successfulFields++;
          }
          else if (fieldName.includes('CaseNumber')) {
            textField.setText(caseInfo.case?.caseNumber || caseInfo.caseNumber || '');
            successfulFields++;
          }
          else if (fieldName.includes('Plaintiff') || fieldName.includes('PlaintiffCaption')) {
            textField.setText(caseInfo.plaintiff || '');
            successfulFields++;
          }
          else if (fieldName.includes('Defendant') || fieldName.includes('DefendantCaption')) {
            textField.setText(caseInfo.defendant || '');
            successfulFields++;
          }
          else if (fieldName.includes('ReqParty')) {
            textField.setText(caseInfo.formParties?.askingParty || caseInfo.plaintiff || '');
            successfulFields++;
          }
          else if (fieldName.includes('ResParty')) {
            textField.setText(caseInfo.formParties?.answeringParty || caseInfo.defendant || '');
            successfulFields++;
          }
          else if (fieldName.includes('Date')) {
            textField.setText(caseInfo.date || `${new Date().getMonth() + 1}/${new Date().getDate()}/${new Date().getFullYear()}`);
            successfulFields++;
          }
          // Short Title of Case (TextField8)
          else if (fieldName.includes('TextField8')) {
            textField.setText(caseInfo.case?.shortTitle || `${caseInfo.plaintiff || ''} v. ${caseInfo.defendant || ''}`);
            successfulFields++;
          }
          // Asking Party (TextField5)
          else if (fieldName.includes('TextField5')) {
            textField.setText(caseInfo.formParties?.askingParty || caseInfo.plaintiff || '');
            successfulFields++;
          }
          // Answering Party (TextField6)
          else if (fieldName.includes('TextField6')) {
            textField.setText(caseInfo.formParties?.answeringParty || caseInfo.defendant || '');
            successfulFields++;
          }
          // Set No. of Pages (TextField7)
          else if (fieldName.includes('TextField7')) {
            textField.setText(caseInfo.formParties?.setNumber || '');
            successfulFields++;
          }
          // SUPERIOR COURT OF CALIFORNIA, COUNTY OF (TextField4)
          else if (fieldName.includes('TextField4')) {
            textField.setText(caseInfo.court?.county || (caseInfo.courtName?.split('County of ')[1] || ''));
            successfulFields++;
          }
          // INCIDENT means (insert your definition here (Text36) usually is blank
          else if (fieldName.includes('Text36')) {
            textField.setText(caseInfo.incidentDefinition || '');
            successfulFields++;
          }
          
          // If isPreview is true, remove buttons and disclaimer at the bottom
          if (isPreview) {
            // Clear any button text fields or disclaimer text
            if (fieldName.includes('Button') || 
                fieldName.includes('Submit') || 
                fieldName.includes('Reset') ||
                fieldName.includes('Print') ||
                fieldName.includes('Disclaimer') ||
                fieldName.includes('Footer')) {
              textField.setText('');
              successfulFields++;
            }
          }
        }
        
        console.log(`Successfully filled field: ${fieldName}`);
      } catch (error) {
        console.warn(`Error filling field: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue to next field
      }
    }
    
    console.log(`Successfully filled ${successfulFields} text fields.`);
    
    // Directly map section names to specific checkbox field patterns in the PDF
    // This helps in case the field names don't exactly match the pattern we expect
    const checkboxMappings: Record<string, string[]> = {
      // Common patterns for section checkboxes
      'section301': ['CheckBox301', '301.0', 'Check301'],
      'section310': ['CheckBox310', '310.0', 'Check310'],
      'section320': ['CheckBox320', '320.0', 'Check320'],
      'section330': ['CheckBox330', '330.0', 'Check330'],
      'section340': ['CheckBox340', '340.0', 'Check340'],
      'section350': ['CheckBox350', '350.0', 'Check350'],
      'section360': ['CheckBox360', '360.0', 'Check360'],
      'section370': ['CheckBox370', '370.0', 'Check370'],
      
      // Specific field mappings for Gemini analysis
      'Definitions': ['Definitions', 'Definition', 'Section4', 'Text36'],
      'GenBkgrd': ['GenBkgrd', 'GenBkgrd1', 'GenBkgrd[0]'],
      'PMEInjuries': ['PMEInjuries', 'PMEInjuries1', 'PMEInjuries[0]'],
      'PropDam': ['PropDam', 'PropDam1', 'PropDam[0]'],
      'LostincomeEarn': ['LostincomeEarn', 'LostincomeEarn1', 'LostincomeEarn[0]'],
      'OtherDam': ['OtherDam', 'OtherDam1', 'OtherDam[0]'],
      'MedHist': ['MedHist', 'MedHist1', 'MedHist[0]'],
      'IncOccrdMV': ['IncOccrdMV', 'IncOccrdMV1', 'IncOccrdMV[0]'],
      'IncOccrdMV2': ['IncOccrdMV2', 'IncOccrdMV2[0]'],
      'Contract': ['Contract', 'Contract1', 'Contract[0]'],
    };
    
    // Check checkboxes based on relevantCheckboxes
    let checkedCount = 0;
    for (const field of fields) {
      const fieldName = field.getName();
      try {
        // Try to identify if this is a checkbox
        if (field.constructor.name.includes('CheckBox') || 
            fieldName.includes('check') || 
            fieldName.includes('Check') || 
            fieldName.includes('.0')) {
          
          // First try direct mapping if the field name is exactly in relevantCheckboxes
          if (caseInfo.relevantCheckboxes && caseInfo.relevantCheckboxes[fieldName] === true) {
            const checkbox = form.getCheckBox(fieldName);
            checkbox.check();
            checkedCount++;
            console.log(`Checked checkbox: ${fieldName}`);
            continue;
          }
          
          // Next, try to map section flags to actual checkbox fields
          let shouldCheck = false;
          
          // First check if this checkbox matches any of our direct mappings
          if (caseInfo.relevantCheckboxes) {
            for (const [sectionKey, fieldPatterns] of Object.entries(checkboxMappings)) {
              if (caseInfo.relevantCheckboxes[sectionKey] === true) {
                for (const pattern of fieldPatterns) {
                  if (fieldName.includes(pattern)) {
                    shouldCheck = true;
                    break;
                  }
                }
                if (shouldCheck) break;
              }
            }
          }
          
          // If no direct mapping matched, try the detailed section-by-section mapping
          if (!shouldCheck && caseInfo.relevantCheckboxes) {
            // Map section301-370 flags to actual checkbox field names
            if (caseInfo.relevantCheckboxes.section301 && 
                (fieldName.includes('301') || fieldName.includes('302') || 
                 fieldName.includes('303') || fieldName.includes('304') || 
                 fieldName.includes('305') || fieldName.includes('306') || 
                 fieldName.includes('307') || fieldName.includes('308') || 
                 fieldName.includes('309'))) {
              shouldCheck = true;
            }
            
            if (caseInfo.relevantCheckboxes.section310 && 
                (fieldName.includes('310') || fieldName.includes('311') || 
                 fieldName.includes('312') || fieldName.includes('313') || 
                 fieldName.includes('314') || fieldName.includes('315') || 
                 fieldName.includes('316') || fieldName.includes('317') || 
                 fieldName.includes('318'))) {
              shouldCheck = true;
            }
            
            if (caseInfo.relevantCheckboxes.section320 && 
                (fieldName.includes('320') || fieldName.includes('321') || 
                 fieldName.includes('322') || fieldName.includes('323'))) {
              shouldCheck = true;
            }
            
            if (caseInfo.relevantCheckboxes.section330 && 
                (fieldName.includes('330') || fieldName.includes('331') || 
                 fieldName.includes('332'))) {
              shouldCheck = true;
            }
            
            if (caseInfo.relevantCheckboxes.section340 && 
                (fieldName.includes('340'))) {
              shouldCheck = true;
            }
            
            if (caseInfo.relevantCheckboxes.section350 && 
                (fieldName.includes('350') || fieldName.includes('351') || 
                 fieldName.includes('352') || fieldName.includes('353') || 
                 fieldName.includes('354') || fieldName.includes('355'))) {
              shouldCheck = true;
            }
            
            if (caseInfo.relevantCheckboxes.section360 && 
                (fieldName.includes('360'))) {
              shouldCheck = true;
            }
            
            if (caseInfo.relevantCheckboxes.section370 && 
                (fieldName.includes('370') || fieldName.includes('371') || 
                 fieldName.includes('372') || fieldName.includes('373') || 
                 fieldName.includes('374') || fieldName.includes('375') || 
                 fieldName.includes('376'))) {
              shouldCheck = true;
            }
            
            // Some forms might have a main checkbox for each section
            // For example section301 might be represented as a "301.0" checkbox
            if (fieldName.endsWith('.0')) {
              const sectionNumber = fieldName.split('.')[0];
              if (sectionNumber === '301' && caseInfo.relevantCheckboxes.section301) shouldCheck = true;
              if (sectionNumber === '310' && caseInfo.relevantCheckboxes.section310) shouldCheck = true;
              if (sectionNumber === '320' && caseInfo.relevantCheckboxes.section320) shouldCheck = true;
              if (sectionNumber === '330' && caseInfo.relevantCheckboxes.section330) shouldCheck = true;
              if (sectionNumber === '340' && caseInfo.relevantCheckboxes.section340) shouldCheck = true;
              if (sectionNumber === '350' && caseInfo.relevantCheckboxes.section350) shouldCheck = true;
              if (sectionNumber === '360' && caseInfo.relevantCheckboxes.section360) shouldCheck = true;
              if (sectionNumber === '370' && caseInfo.relevantCheckboxes.section370) shouldCheck = true;
            }
          }
          
          if (shouldCheck) {
            const checkbox = form.getCheckBox(fieldName);
            checkbox.check();
            checkedCount++;
            console.log(`Checked checkbox: ${fieldName}`);
          }
        }
      } catch (error) {
        console.warn(`Error checking checkbox: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue to next field
      }
    }
    
    console.log(`Successfully checked ${checkedCount} checkboxes.`);
    
    // If we couldn't fill any fields or check any checkboxes, return the original PDF
    if (successfulFields === 0 && checkedCount === 0) {
      console.warn('Could not fill any fields or check any checkboxes. Returning original PDF.');
      return pdfBytes;
    }
    
    // Crop the bottom of the last page to remove unwanted elements
    try {
      const pageCount = pdfDoc.getPageCount();
      if (pageCount > 0) {
        const lastPage = pdfDoc.getPage(pageCount - 1);
        const { width, height } = lastPage.getSize();
        
        // Crop 5% off the bottom of the last page
        const cropAmount = height * 0.04;
        const cropHeight = height - cropAmount;
        
        console.log(`Cropping last page: removing 4% (${cropAmount.toFixed(2)} units) from bottom. New height: ${cropHeight.toFixed(2)}`);
        
        // Set the crop box for the last page
        lastPage.setCropBox(0, cropAmount, width, cropHeight);
      }
    } catch (cropError) {
      console.warn('Error cropping last page:', cropError);
      // Continue without cropping
    }
    
    // Serialize the PDF document
    console.log('Saving PDF document...');
    const filledPdfBytes = await pdfDoc.save();
    console.log(`PDF successfully saved: ${filledPdfBytes.byteLength} bytes`);
    
    return filledPdfBytes;
  } catch (error) {
    console.error('Error filling form interrogatories PDF:', error);
    
    // Try to fetch the original PDF as a fallback
    try {
      console.log('Returning the original PDF from California Courts as fallback...');
      return await downloadPdfFromCourts();
    } catch (fallbackError) {
      console.error('Failed to fetch original PDF as fallback:', fallbackError);
      throw new Error(`Failed to fill out form interrogatories PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Downloads a filled PDF as a file
 * @param pdfBytes The PDF as an ArrayBuffer
 * @param filename The name of the file to download
 */
export const downloadPdf = (pdfBytes: ArrayBuffer, filename: string): void => {
  // Create a blob from the PDF bytes
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a link element to trigger the download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append the link to the document
  document.body.appendChild(link);
  
  // Trigger the download
  link.click();
  
  // Remove the link from the document
  document.body.removeChild(link);
  
  // Release the URL object
  URL.revokeObjectURL(url);
};

/**
 * Fills out a Request for Admissions PDF with case information
 * @param caseInfo Information extracted from the complaint
 * @returns An ArrayBuffer containing the filled PDF
 */
export const fillRequestForAdmissions = async (
  caseInfo: ComplaintInformation
): Promise<ArrayBuffer> => {
  try {
    console.log('Starting to fill Request for Admissions PDF...');
    
    // Download the PDF template
    const response = await fetch('/RFA.pdf');
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
    
    const pdfBytes = await response.arrayBuffer();
    
    // Load the PDF document with options to handle encrypted PDFs
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      updateMetadata: false
    });
    
    if (!pdfDoc) {
      throw new Error('Failed to load PDF document');
    }
    
    // Get the form fields
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`Found ${fields.length} form fields in RFA.pdf`);
    
    // Log field information to help with debugging
    const fieldSummary = fields.map(field => ({
      name: field.getName(),
      type: field.constructor.name
    }));
    console.log('PDF form fields:', fieldSummary);
    
    if (fields.length === 0) {
      console.warn('No form fields found. This PDF may be encrypted or not properly formatted as a fillable form.');
      
      // In this case, we'll create a new PDF from scratch
      return await createRequestForAdmissionsPdf(caseInfo);
    }
    
    // Common field mappings for Request for Admissions form
    const fieldMappings: Record<string, string> = {
      // Attorney information
      'ATTORNEY OR PARTY WITHOUT ATTORNEY': caseInfo.attorney?.name || '',
      'STATE BAR NUMBER': caseInfo.attorney?.barNumber || '',
      'FIRM NAME': caseInfo.attorney?.firm || '',
      'STREET ADDRESS': caseInfo.attorney?.address?.street || '',
      'CITY': caseInfo.attorney?.address?.city || '',
      'STATE': caseInfo.attorney?.address?.state || '',
      'ZIP CODE': caseInfo.attorney?.address?.zip || '',
      'TELEPHONE NO': caseInfo.attorney?.phone || '',
      'FAX NO': caseInfo.attorney?.fax || '',
      'EMAIL ADDRESS': caseInfo.attorney?.email || '',
      'ATTORNEY FOR': caseInfo.attorney?.attorneyFor || '',
      
      // Court information
      'SUPERIOR COURT OF CALIFORNIA COUNTY OF': caseInfo.court?.county || (caseInfo.courtName?.split('County of ')[1] || ''),
      'STREET ADDRESS_2': '',
      'MAILING ADDRESS': '',
      'CITY AND ZIP CODE': '',
      'BRANCH NAME': '',
      
      // Case information
      'PLAINTIFF/PETITIONER': caseInfo.plaintiff || '',
      'DEFENDANT/RESPONDENT': caseInfo.defendant || '',
      'CASE NUMBER': caseInfo.case?.caseNumber || caseInfo.caseNumber || '',
      
      // Form information
      'PROPOUNDING PARTY': caseInfo.formParties?.askingParty || caseInfo.plaintiff || '',
      'RESPONDING PARTY': caseInfo.formParties?.answeringParty || caseInfo.defendant || '',
      'SET NO': caseInfo.formParties?.setNumber || 'ONE',
      'The': 'The',
      'requests that': 'requests that',
      'admit the truth of the following matters': 'admit the truth of the following matters',
    };
    
    // Try to fill any text fields we can find
    let successfulFields = 0;
    for (const field of fields) {
      try {
        const fieldName = field.getName();
        
        // Skip non-text fields
        if (!field.constructor.name.includes('TextField')) {
          continue;
        }
        
        const textField = form.getTextField(fieldName);
        
        // Try direct mappings first
        let valueSet = false;
        for (const [key, value] of Object.entries(fieldMappings)) {
          if (fieldName.includes(key)) {
            textField.setText(value);
            console.log(`Filled field ${fieldName} with "${value}" (matched key: ${key})`);
            successfulFields++;
            valueSet = true;
            break;
          }
        }
        
        // If no direct mapping was found, try pattern matching
        if (!valueSet) {
          // Fill based on field name patterns
          if (fieldName.includes('Attorney Name') || fieldName.includes('ATTORNEY')) {
            textField.setText(caseInfo.attorney?.name || '');
            successfulFields++;
          }
          else if (fieldName.includes('Firm') || fieldName.includes('FIRM')) {
            textField.setText(caseInfo.attorney?.firm || '');
            successfulFields++;
          }
          else if (fieldName.includes('Address') || fieldName.includes('STREET')) {
            textField.setText(caseInfo.attorney?.address?.street || '');
            successfulFields++;
          }
          else if (fieldName.includes('City') || fieldName.includes('CITY')) {
            textField.setText(caseInfo.attorney?.address?.city || '');
            successfulFields++;
          }
          else if (fieldName.includes('State') || fieldName.includes('STATE')) {
            textField.setText(caseInfo.attorney?.address?.state || '');
            successfulFields++;
          }
          else if (fieldName.includes('Zip') || fieldName.includes('ZIP')) {
            textField.setText(caseInfo.attorney?.address?.zip || '');
            successfulFields++;
          }
          else if (fieldName.includes('Phone') || fieldName.includes('TELEPHONE')) {
            textField.setText(caseInfo.attorney?.phone || '');
            successfulFields++;
          }
          else if (fieldName.includes('Fax') || fieldName.includes('FAX')) {
            textField.setText(caseInfo.attorney?.fax || '');
            successfulFields++;
          }
          else if (fieldName.includes('Email') || fieldName.includes('EMAIL')) {
            textField.setText(caseInfo.attorney?.email || '');
            successfulFields++;
          }
        }
      } catch (fieldError) {
        console.error(`Error filling field ${field.getName()}:`, fieldError);
      }
    }
    
    console.log(`Successfully filled ${successfulFields} fields in the Request for Admissions PDF`);
    
    // Generate case-specific admissions
    const admissions = generateAdmissionsFromCase(caseInfo);
    
    // Add the admissions to the form if there's a field for it
    try {
      const admissionsFields = fields.filter(field => 
        field.getName().includes('MATTER') || 
        field.getName().includes('ADMISSION') || 
        field.getName().includes('Text') || 
        field.getName().includes('Request')
      );
      
      if (admissionsFields.length > 0) {
        // Try to identify the main content field
        const contentField = admissionsFields.find(field => field.constructor.name.includes('TextField'));
        
        if (contentField) {
          const textField = form.getTextField(contentField.getName());
          const admissionsText = admissions.map((item, index) => `${index + 1}. ${item}`).join('\n\n');
          textField.setText(admissionsText);
          console.log('Added admissions to the form.');
        }
      }
    } catch (admissionsError) {
      console.error('Error adding admissions to the form:', admissionsError);
    }
    
    // Save the PDF
    const filledPdfBytes = await pdfDoc.save();
    
    console.log('PDF successfully generated');
    return filledPdfBytes.buffer;
  } catch (error) {
    console.error('Error filling Request for Admissions PDF:', error);
    
    // If there was an error filling the template, try creating a new PDF from scratch
    try {
      console.log('Attempting to create a new PDF from scratch as fallback...');
      return await createRequestForAdmissionsPdf(caseInfo);
    } catch (fallbackError) {
      console.error('Fallback creation also failed:', fallbackError);
      throw error;
    }
  }
};

/**
 * Creates a Request for Admissions PDF from scratch
 * This is a fallback in case filling the template fails
 */
const createRequestForAdmissionsPdf = async (caseInfo: ComplaintInformation): Promise<ArrayBuffer> => {
  console.log('Creating Request for Admissions PDF from scratch...');
  
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const font = await pdfDoc.embedFont('Helvetica');


  // line-number margin and main text margin
  const marginLeftNumbers = 36;
  const marginLeftText    = 72;
  const topMargin         = 36;
  const lineHeight        = 14;
  const fontSize          = 12;

  // 2. The raw text for each of the 4 pages, exactly as in your PDF:
  const pagesContent = [
    [
      'RFA-1 DEF',
      '',
      '',
      ' ',
      ' ',
      ' ',
      '',
      '',
      'PLAINTIFF’S REQUEST FOR ADMISSIONS TO DEFENDANT, SET ONE',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',          // up to 28 lines
      '',
    ],
    [
      'Shawna S. Nazari, Esq. SBN 214939',
      'NAZARI LAW',
      '2625 Townsgate Rd., Suite 330',
      'Westlake Village, CA 91361',
      'Telephone: (818) 380-3015',
      'Facsimile: (818) 380-3016',
      'Email: eservice@ssnlegal.com',
      '',
      'Attorney for Plaintiff,',
      'CARLOS OMAR ZAMUDIO',
      '',
      'SUPERIOR COURT OF THE STATE OF CALIFORNIA',
      'FOR THE COUNTY OF SAN BERNARDINO',
      '',
      'CARLOS OMAR LEON ZAMUDIO, an',
      'individual,',
      '',
      '      Plaintiff,',
      'vs.',
      '',
      'INGRID GUADALUPE ZULETA, an',
      'individual; AND DOES 1 TO 25, inclusive',
      '',
      '      Defendants.',
      '',
      'Case No.: CIVSB2426204',
      '',
      'PLAINTIFFS REQUEST FOR ADMISSIONS',
      'TO DEFENDANT, SET ONE',
    ],
    [
      'PROPOUNDING PARTY:  Plaintiff, CARLOS OMAR LEON ZAMUDIO',
      '',
      'RESPONDING PARTY:  Defendant, INGRID GUADALUPE ZULETA',
      '',
      'SET NUMBER:   ONE',
      '',
      'TO ALL PARTIES HEREIN AND TO THEIR RESPECTIVE ATTORNEYS OF RECORD:',
      '',
      'Pursuant to California Code of Civil Procedure Section 2033.010, you are hereby',
      'requested to admit the truth of the following facts or assertions. Your response is due within',
      'thirty days from the date of service of this request for admissions.',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',  // pad to 28
    ],
    [
      'DEFINITION',
      '',
      '1. The subject ACCIDENT refers to the accident described in Plaintiffs’ Complaint which is the',
      '   subject matter of this action.',
      '',
      '2. YOU refers to the responding party set forth above.',
      '',
      'YOU ARE REQUESTED TO ADMIT THAT:',
      '',
      '1.   YOU are 100 percent at fault for the subject accident.',
      '',
      '2.   Admit that at the time of the subject ACCIDENT, YOU owned the subject vehicle driven.',
      '',
      '3.   Admit that no other person or party in any way caused or contributed to the subject ACCIDENT.',
      '',
      '4.   Admit that Plaintiff ZAMUDIO’S medical care and treatment following the subject accident was reasonable and necessary.',
      '',
      '5.   Admit that Plaintiff ZAMUDIO’S expenses incurred for medical care and treatment following the subject accident was reasonable and necessary.',
      '',
      '6.   Admit that Plaintiff ZAMUDIO’S medical care and treatment following the subject ACCIDENT was the result of injuries caused by the subject ACCIDENT.',
      '',
      '7.   Admit that Plaintiff ZAMUDIO was not comparatively negligent.',
      '',
      '8.   Admit that Plaintiff ZAMUDIO had the right of way at the time of the collision.',
      '',
      '9.   Admit that YOU violated California Vehicle Code Section 22350 at the time of the collision.',
      '',
      '10.  Admit that on September 9, 2022, at or near the location of the Subject Collision, you were operating a motor vehicle in excess of the posted speed limit at the time of the collision.',
      '',
      '11.  Admit that your speed at the time of the Subject Incident contributed to the collision.',
      '',
      '12.  Admit that driving at a speed in excess of the posted speed limit is a violation of California Vehicle Code Section 22350.',
      '',
      '13.  Admit that you were aware of the posted speed limit at or near the location of the Subject Collision prior to the collision.',
      '',
      'Dated: August 14, 2024                   NAZARI LAW',
      '                                          ',
      ' SHAWNA S. NAZARI, ESQ.',
      ' Attorney for Plaintiff',
    ],
    [
      'Proof of Service',
      '',
      'PROOF OF SERVICE',
      '',
      '1013A',
      'STATE OF CALIFORNIA  )',
      '     )ss',
      'COUNTY OF VENTURA  )',
      '',
      'I am employed in the County of Ventura, State of California. I am over the age of 18 and',
      'not a party to the within action; my business address is 2625 Townsgate Rd., Suite 330, Westlake',
      'Village CA 91361.',
      '',
      'On December 13, 2024, I served the foregoing documents described as: PLAINTIFFS',
      'REQUEST FOR ADMISSIONS TO DEFENDANT, SET ONE',
      'on interested parties in this action by placing a true copy thereof enclosed in a sealed envelope',
      'addressed as follows:',
      '',
      'LAW OFFICES OF RICHARDSON, FAIR & COHEN',
      'Joshua Jimenez, Esq.',
      '3700 Central Avenue, 3rd Floor',
      'Riverside, California 92506',
      'Telephone: 949-739-0835',
      'Facsimile: 951-787-0738',
      'Email: jimenez.joshua@ace.aaa.com',
      '',
      'Attorneys for Defendant,',
      'Ingrid Guadalupe Zuleta',
      '',
      '[X]  (BY ELECTRONIC SERVICE) Based upon a court order or an agreement of the parties',
      'to accept service by electronic transmission, I electronically served the foregoing document in',
      'PDF format on behalf of Plaintiff.',
      '',
      '/X/  (State) I declare under the penalty of perjury under the laws of the State of California that',
      'the above is true and correct.',
      '',
      '_______________________________',
      'Shawna S. Nazari',
      '',
      'jimenez.joshua@ace.aaa.com; nava.teresa@ace.aaa.com; and lopez.laura@ace.aaa.com',
    ],
  ];

  // 3. For each page content array, make a page:
  for (const lines of pagesContent) {
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();

    // draw each line number
    for (let i = 0; i < 28; i++) {
      const y = height - topMargin - i * lineHeight;
      const num = String(i + 1);
      page.drawText(num, {
        x: marginLeftNumbers,
        y,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });

      // draw the actual content line (if present)
      const text = lines[i] || '';
      page.drawText(text, {
        x: marginLeftText,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }
  }
  
  // Default font
  // const helveticaFont = await pdfDoc.embedFont('Helvetica');
  // const helveticaBold = await pdfDoc.embedFont('Helvetica-Bold');
  
  // // Add a page
  // let page = pdfDoc.addPage([612, 792]); // Letter size
  
  // // Drawing parameters
  // const { width, height } = page.getSize();
  // let currentY = height - 50; // Start position from top
  // const margin = 50;
  // const lineHeight = 14;
  // const bodyTextSize = 11;
  // const headingTextSize = 14;
  // const subheadingTextSize = 12;
  
  // // Header - Court Info
  // page.drawText('SUPERIOR COURT OF CALIFORNIA, COUNTY OF', {
  //   x: margin,
  //   y: currentY,
  //   size: subheadingTextSize,
  //   font: helveticaBold
  // });
  
  // currentY -= lineHeight;
  // page.drawText(caseInfo.court?.county || (caseInfo.courtName?.split('County of ')[1] || 'LOS ANGELES'), {
  //   x: margin + 10,
  //   y: currentY,
  //   size: bodyTextSize,
  //   font: helveticaFont
  // });
  
  // // Draw box around header
  // page.drawRectangle({
  //   x: margin - 10,
  //   y: currentY - 5,
  //   width: width - (margin * 2) + 20,
  //   height: 35,
  //   borderWidth: 1,
  //   borderColor: rgb(0, 0, 0),
  //   color: rgb(1, 1, 1)
  // });
  
  // currentY -= lineHeight * 3;
  
  // // Attorney Information
  // const attorneyInfo = [
  //   `ATTORNEY OR PARTY WITHOUT ATTORNEY: ${caseInfo.attorney?.name || ''}`,
  //   `State Bar No: ${caseInfo.attorney?.barNumber || ''}`,
  //   `FIRM NAME: ${caseInfo.attorney?.firm || ''}`,
  //   `ADDRESS: ${caseInfo.attorney?.address?.street || ''}, ${caseInfo.attorney?.address?.city || ''}, ${caseInfo.attorney?.address?.state || ''} ${caseInfo.attorney?.address?.zip || ''}`,
  //   `TELEPHONE: ${caseInfo.attorney?.phone || ''}`,
  //   `FAX: ${caseInfo.attorney?.fax || ''}`,
  //   `EMAIL: ${caseInfo.attorney?.email || ''}`,
  //   `ATTORNEY FOR: ${caseInfo.attorney?.attorneyFor || ''}`
  // ];
  
  // for (const line of attorneyInfo) {
  //   page.drawText(line, {
  //     x: margin,
  //     y: currentY,
  //     size: bodyTextSize,
  //     font: helveticaFont
  //   });
  //   currentY -= lineHeight;
  // }
  
  // // Draw box around attorney info
  // page.drawRectangle({
  //   x: margin - 10,
  //   y: currentY - 5,
  //   width: width - (margin * 2) + 20,
  //   height: lineHeight * attorneyInfo.length + 10,
  //   borderWidth: 1,
  //   borderColor: rgb(0, 0, 0),
  //   color: rgb(1, 1, 1)
  // });
  
  // currentY -= lineHeight * 2;
  
  // // Case Information
  // page.drawText(`${caseInfo.plaintiff || 'PLAINTIFF'} v. ${caseInfo.defendant || 'DEFENDANT'}`, {
  //   x: width / 2,
  //   y: currentY,
  //   size: headingTextSize,
  //   font: helveticaBold,
  //   color: rgb(0, 0, 0),
  //   lineHeight,
  //   maxWidth: width - (margin * 2),
  //   // align: 'center'
  // });
  
  // currentY -= lineHeight * 2;
  
  // // Title
  // page.drawText('REQUEST FOR ADMISSIONS', {
  //   x: width / 2,
  //   y: currentY,
  //   size: headingTextSize + 2,
  //   font: helveticaBold,
  //   color: rgb(0, 0, 0),
  //   maxWidth: width - (margin * 2),
  //   // align: 'center'
  // });
  
  // currentY -= lineHeight * 2;
  
  // // Case Number
  // page.drawText(`CASE NUMBER: ${caseInfo.case?.caseNumber || caseInfo.caseNumber || ''}`, {
  //   x: margin,
  //   y: currentY,
  //   size: bodyTextSize,
  //   font: helveticaBold
  // });
  
  // // Set Number
  // page.drawText(`SET NUMBER: ${caseInfo.formParties?.setNumber || 'ONE'}`, {
  //   x: width - margin - 150,
  //   y: currentY,
  //   size: bodyTextSize,
  //   font: helveticaBold
  // });
  
  // currentY -= lineHeight * 2;
  
  // // Party Information
  // page.drawText(`PROPOUNDING PARTY: ${caseInfo.formParties?.askingParty || caseInfo.plaintiff || ''}`, {
  //   x: margin,
  //   y: currentY,
  //   size: bodyTextSize,
  //   font: helveticaFont
  // });
  
  // currentY -= lineHeight;
  
  // page.drawText(`RESPONDING PARTY: ${caseInfo.formParties?.answeringParty || caseInfo.defendant || ''}`, {
  //   x: margin,
  //   y: currentY,
  //   size: bodyTextSize,
  //   font: helveticaFont
  // });
  
  // currentY -= lineHeight * 2;
  
  // // Introduction text
  // const introText = `The ${caseInfo.formParties?.askingParty || caseInfo.plaintiff || 'PLAINTIFF'} requests that ${caseInfo.formParties?.answeringParty || caseInfo.defendant || 'DEFENDANT'} admit the truth of the following matters:`;
  
  // page.drawText(introText, {
  //   x: margin,
  //   y: currentY,
  //   size: bodyTextSize,
  //   font: helveticaFont
  // });
  
  // currentY -= lineHeight * 2;
  
  // // Add admissions
  // const admissions = generateAdmissionsFromCase(caseInfo);
  // for (let i = 0; i < admissions.length; i++) {
  //   const text = `${i + 1}. ${admissions[i]}`;
    
  //   // Make sure we have enough space on the page
  //   if (currentY < margin + 50) {
  //     // Add a new page
  //     currentY = height - 50;
  //     page = pdfDoc.addPage([612, 792]);
  //   }
    
  //   // Split long text into multiple lines
  //   const words = text.split(' ');
  //   let currentLine = '';
  //   let startY = currentY;
    
  //   for (const word of words) {
  //     const testLine = currentLine + (currentLine ? ' ' : '') + word;
  //     const textWidth = helveticaFont.widthOfTextAtSize(testLine, bodyTextSize);
      
  //     if (textWidth > width - (margin * 2)) {
  //       page.drawText(currentLine, {
  //         x: margin,
  //         y: currentY,
  //         size: bodyTextSize,
  //         font: helveticaFont
  //       });
  //       currentY -= lineHeight;
  //       currentLine = word;
  //     } else {
  //       currentLine = testLine;
  //     }
  //   }
    
  //   if (currentLine) {
  //     page.drawText(currentLine, {
  //       x: margin,
  //       y: currentY,
  //       size: bodyTextSize,
  //       font: helveticaFont
  //     });
  //   }
    
  //   currentY -= lineHeight * 2;
  // }
  
  // // Date and signature
  // currentY -= lineHeight * 4;
  
  // const currentDate = new Date();
  // const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
  
  // page.drawText(`Date: ${formattedDate}`, {
  //   x: margin,
  //   y: currentY,
  //   size: bodyTextSize,
  //   font: helveticaFont
  // });
  
  // currentY -= lineHeight * 4;
  
  // page.drawText(`${caseInfo.attorney?.name || ''}`, {
  //   x: margin,
  //   y: currentY,
  //   size: bodyTextSize,
  //   font: helveticaFont
  // });
  
  // currentY -= lineHeight;
  // page.drawText(`Attorney for ${caseInfo.attorney?.attorneyFor || ''}`, {
  //   x: margin,
  //   y: currentY,
  //   size: bodyTextSize,
  //   font: helveticaFont
  // });
  
  // Save the document
  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer;
};

/**
 * Generates admissions based on case information
 */
const generateAdmissionsFromCase = (caseInfo: ComplaintInformation): string[] => {
  // Get case-specific information
  const caseType = caseInfo.caseType || 'civil';
  const filingDate = caseInfo.filingDate || 'the date specified in the complaint';
  const plaintiff = caseInfo.plaintiff || 'the plaintiff';
  const defendant = caseInfo.defendant || 'the defendant';
  
  // Default admissions that apply to most cases
  const commonAdmissions = [
    `Admit that the venue is proper in ${caseInfo.courtName || 'this court'}.`,
    `Admit that the court has jurisdiction over this matter.`,
    `Admit that you were properly served with the summons and complaint in this action.`,
    `Admit that you received the complaint filed in this action on or about ${filingDate}.`
  ];
  
  // Contract case specific admissions
  const contractAdmissions = [
    `Admit that you entered into a contract with ${plaintiff} on or about ${filingDate}.`,
    `Admit that the terms of the contract required you to pay ${plaintiff} for services rendered.`,
    `Admit that you failed to pay ${plaintiff} pursuant to the terms of the contract.`,
    `Admit that you breached the contract by failing to perform your obligations.`,
    `Admit that ${plaintiff} performed all obligations required under the contract.`,
    `Admit that you received a demand letter from ${plaintiff} prior to this lawsuit.`,
    `Admit that you owe ${plaintiff} damages as a result of your breach of contract.`
  ];
  
  // Personal injury case specific admissions
  const personalInjuryAdmissions = [
    `Admit that you were involved in an incident with ${plaintiff} on or about ${filingDate}.`,
    `Admit that the incident was caused by your negligence.`,
    `Admit that ${plaintiff} was injured as a result of the incident.`,
    `Admit that ${plaintiff} incurred medical expenses as a result of injuries sustained in the incident.`,
    `Admit that ${plaintiff} suffered pain and suffering as a result of injuries sustained in the incident.`,
    `Admit that you had a duty of care toward ${plaintiff}.`,
    `Admit that you breached that duty of care.`
  ];
  
  // Employment case specific admissions
  const employmentAdmissions = [
    `Admit that ${plaintiff} was employed by you from the period specified in the complaint.`,
    `Admit that ${plaintiff} performed their job duties satisfactorily.`,
    `Admit that you terminated ${plaintiff}'s employment on the date specified in the complaint.`,
    `Admit that you failed to pay ${plaintiff} all wages owed upon termination.`,
    `Admit that you failed to provide required meal and rest breaks to ${plaintiff}.`,
    `Admit that you failed to pay ${plaintiff} overtime wages for hours worked in excess of 8 hours per day or 40 hours per week.`,
    `Admit that you failed to provide ${plaintiff} with accurate itemized wage statements.`
  ];
  
  // Select appropriate admissions based on case type
  let caseSpecificAdmissions: string[] = [];
  
  if (caseType.toLowerCase().includes('contract') || 
      caseInfo.chargeDescription?.toLowerCase().includes('contract') ||
      caseInfo.chargeDescription?.toLowerCase().includes('breach')) {
    caseSpecificAdmissions = contractAdmissions;
  }
  else if (caseType.toLowerCase().includes('injury') || 
           caseInfo.chargeDescription?.toLowerCase().includes('injury') ||
           caseInfo.chargeDescription?.toLowerCase().includes('negligence') ||
           caseInfo.chargeDescription?.toLowerCase().includes('accident')) {
    caseSpecificAdmissions = personalInjuryAdmissions;
  }
  else if (caseType.toLowerCase().includes('employment') || 
           caseInfo.chargeDescription?.toLowerCase().includes('employment') ||
           caseInfo.chargeDescription?.toLowerCase().includes('termination') ||
           caseInfo.chargeDescription?.toLowerCase().includes('discrimination')) {
    caseSpecificAdmissions = employmentAdmissions;
  }
  else {
    // Default to contract admissions if case type is not recognized
    caseSpecificAdmissions = contractAdmissions;
  }
  
  // Combine common and case-specific admissions
  return [...commonAdmissions, ...caseSpecificAdmissions];
};