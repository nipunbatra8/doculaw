import { PDFDocument } from 'pdf-lib';
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
 * @returns An ArrayBuffer containing the filled PDF
 */
export const fillFormInterrogatories = async (
  caseInfo: ComplaintInformation
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
        }
        
        console.log(`Successfully filled field: ${fieldName}`);
      } catch (error) {
        console.warn(`Error filling field: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue to next field
      }
    }
    
    console.log(`Successfully filled ${successfulFields} text fields.`);
    
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
          
          // Only check the checkbox if it's explicitly set to true in relevantCheckboxes
          if (caseInfo.relevantCheckboxes && caseInfo.relevantCheckboxes[fieldName] === true) {
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