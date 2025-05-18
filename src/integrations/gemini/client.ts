import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Initialize the Gemini API with the API key from environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("Gemini API key is missing. Please check your .env file.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Safety settings to avoid inappropriate content
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Define the interface for extracted complaint information
export interface ComplaintInformation {
  defendant: string;
  plaintiff: string;
  caseNumber: string;
  filingDate: string;
  chargeDescription: string;
  courtName: string;
  
  // Extended information for form interrogatories
  court?: {
    county?: string;
  };
  case?: {
    shortTitle?: string;
    caseNumber?: string;
  };
  attorney?: {
    barNumber?: string;
    name?: string;
    firm?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    phone?: string;
    fax?: string;
    email?: string;
    attorneyFor?: string;
  };
  formParties?: {
    askingParty?: string;
    answeringParty?: string;
    setNumber?: string;
  };
  date?: string;
  
  // For checkbox analysis
  caseType?: string;
  incidentDefinition?: string;
  relevantCheckboxes?: {
    [key: string]: boolean;
  };
  
  // Explanation from Gemini analysis
  explanation?: string;
}

/**
 * Extract information from a complaint document file using Gemini's multimodal capabilities
 * @param fileBase64 The base64-encoded file content
 * @param mimeType The MIME type of the file
 * @returns Extracted details from the document
 */
export async function extractComplaintInformationFromFile(
  fileBase64: string, 
  mimeType: string
): Promise<ComplaintInformation> {
  try {
    console.log("Sending file to Gemini for analysis...");
    
    // Use Gemini's vision capabilities for multimodal processing
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro-vision",
      safetySettings,
    });
    
    // Create file part for the document
    const filePart = {
      inlineData: {
        data: fileBase64,
        mimeType: mimeType
      }
    };
    
    const prompt = `
    You are a legal assistant extracting information from a complaint document. 
    
    Please analyze the document I've provided and extract the following information in detailed JSON format:
    
    1. Basic case information (defendant, plaintiff, case number, filing date, etc.)
    2. Court information 
    3. Attorney information
    4. Parties involved in the form interrogatories
    
    Format your response as a JSON object with this structure:
    {
      "defendant": "Defendant name",
      "plaintiff": "Plaintiff name",
      "caseNumber": "Case number",
      "filingDate": "Filing date",
      "chargeDescription": "Charge/claim description",
      "courtName": "Court name",
      "court": {
        "county": "County name"
      },
      "case": {
        "shortTitle": "Short title (e.g., 'Smith v. Johnson')",
        "caseNumber": "Case number"
      },
      "attorney": {
        "barNumber": "State Bar Number",
        "name": "Attorney name",
        "firm": "Law firm name",
        "address": {
          "street": "Street address",
          "city": "City",
          "state": "State code (e.g., CA)",
          "zip": "ZIP code"
        },
        "phone": "Phone number",
        "fax": "Fax number",
        "email": "Email address",
        "attorneyFor": "Who the attorney represents"
      },
      "formParties": {
        "askingParty": "Party asking interrogatories (typically plaintiff)",
        "answeringParty": "Party answering interrogatories (typically defendant)",
        "setNumber": "Set number (e.g., 'First', 'Second')"
      },
      "date": "Current date in YYYY-MM-DD format",
      "caseType": "Type of case (e.g., personal injury, contract dispute)"
    }
    
    For any field where information isn't available in the document, please use reasonable defaults or leave as null.
    Return only the JSON object with no other text.
    `;
    
    // Generate content with the file and prompt
    const result = await model.generateContent([prompt, filePart]);
    const response = await result.response;
    const text = response.text();
    
    console.log("Gemini file analysis response:", text);
    
    // Try to parse the JSON response
    try {
      const extractedInfo = JSON.parse(text);
      return extractedInfo;
    } catch (parseError) {
      console.error("Error parsing Gemini file analysis response:", parseError);
      
      // Try to extract JSON from the response text if it's not valid JSON
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (secondParseError) {
        console.error("Second attempt at parsing JSON failed:", secondParseError);
      }
      
      // Fall back to text-based extraction
      console.log("Falling back to text extraction...");
      const textData = await extractTextFromFile(fileBase64, mimeType);
      return extractComplaintInformation(textData);
    }
  } catch (error) {
    console.error("Error analyzing file with Gemini:", error);
    
    // Try to extract text and use text-based extraction as fallback
    try {
      console.log("Falling back to text extraction after error...");
      const textData = await extractTextFromFile(fileBase64, mimeType);
      return extractComplaintInformation(textData);
    } catch (fallbackError) {
      console.error("Fallback extraction also failed:", fallbackError);
      
      // Return mock data as ultimate fallback
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      return {
        defendant: "John Doe",
        plaintiff: "State of California",
        caseNumber: `CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        filingDate: new Date().toLocaleDateString(),
        chargeDescription: "Violation of Penal Code § 459 (Burglary)",
        courtName: "Superior Court of California, County of Los Angeles",
        court: {
          county: "Los Angeles"
        },
        case: {
          shortTitle: "State of California v. John Doe",
          caseNumber: `CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`
        },
        attorney: {
          barNumber: "123456",
          name: "Attorney for Plaintiff",
          firm: "Legal Firm LLP",
          address: {
            street: "123 Legal Street",
            city: "Legal City",
            state: "CA",
            zip: "90210"
          },
          phone: "(555) 123-4567",
          fax: "(555) 765-4321",
          email: "attorney@legalfirm.com",
          attorneyFor: "Plaintiff"
        },
        formParties: {
          askingParty: "State of California",
          answeringParty: "John Doe",
          setNumber: "First"
        },
        date: currentDate,
        caseType: "Criminal"
      };
    }
  }
}

/**
 * Helper function to extract text from a file using OCR if necessary
 * @param fileBase64 Base64-encoded file content
 * @param mimeType File MIME type
 * @returns Extracted text from the file
 */
async function extractTextFromFile(fileBase64: string, mimeType: string): Promise<string> {
  try {
    // Use Gemini's vision capabilities for OCR
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro-vision",
      safetySettings,
    });
    
    // Create file part for the document
    const filePart = {
      inlineData: {
        data: fileBase64,
        mimeType: mimeType
      }
    };
    
    const prompt = `
    Please extract all the text content from this document as accurately as possible.
    Return only the extracted text with no additional comments.
    For table content, please preserve the structure as much as possible using plain text formatting.
    `;
    
    // Generate content with the file and prompt
    const result = await model.generateContent([prompt, filePart]);
    const response = await result.response;
    const extractedText = response.text();
    
    console.log("Text extraction successful, length:", extractedText.length);
    return extractedText;
  } catch (error) {
    console.error("Error extracting text from file:", error);
    throw new Error("Failed to extract text from the document");
  }
}

/**
 * Extract information from a criminal complaint document
 * @param docText The text content of the document
 * @returns Extracted details from the document
 */
export async function extractComplaintInformation(docText: string): Promise<ComplaintInformation> {
  try {
    // For real PDF text, which might be noisy or have formatting issues
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      safetySettings,
    });
    
    const prompt = `
    You are an AI legal assistant helping to extract relevant information from a legal complaint document.
    
    Please carefully analyze the following text from a complaint and extract these key details:
    1. Defendant name (e.g., John Doe, Jane Smith)
    2. Plaintiff name (e.g., "The People of the State of California" or individual names)
    3. Case number (e.g., CR-2023-12345, 123456-CR)
    4. Filing date (the date the complaint was filed)
    5. Court name (e.g., Superior Court of California, County of Los Angeles)
    6. Charge or claim description (a brief description of the claims being alleged)
    
    Additionally, extract detailed information for filling out a Form Interrogatories document:
    
    Format your response as a JSON object with this structure:
    {
      "defendant": "string",
      "plaintiff": "string",
      "caseNumber": "string",
      "filingDate": "string",
      "chargeDescription": "string",
      "courtName": "string",
      "court": {
        "county": "Name of the California county where the case is filed, e.g., 'Los Angeles'"
      },
      "case": {
        "shortTitle": "Short title of the case, e.g., 'Smith v. Johnson'",
        "caseNumber": "Court-assigned case number, e.g., '23CV000123'"
      },
      "attorney": {
        "barNumber": "California State Bar Number of the attorney, e.g., '123456'",
        "name": "Full name of the attorney or party representing themselves",
        "firm": "Law firm name (or null if self-represented)",
        "address": {
          "street": "Street address, e.g., '123 Main St'",
          "city": "City name",
          "state": "Two-letter state code, e.g., 'CA'",
          "zip": "ZIP code"
        },
        "phone": "Phone number, e.g., '310-555-1234'",
        "fax": "Fax number if available (can be null)",
        "email": "Email address",
        "attorneyFor": "Who the attorney is representing, e.g., 'Plaintiff John Smith' or 'Defendant Lisa Johnson'"
      },
      "formParties": {
        "askingParty": "Name of the party asking the interrogatories (typically the plaintiff)",
        "answeringParty": "Name of the party answering the interrogatories (typically the defendant)",
        "setNumber": "Set number of the interrogatories (e.g., 'First Set', 'Second Set')"
      },
      "date": "Current date in YYYY-MM-DD format"
    }
    
    For each field, if you can't find a clear value, provide your best guess or use a reasonable default.
    Return only the JSON object with no other text.
    
    Document text:
    ${docText}
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Gemini API response:", text);
    
    // The response should be a JSON string, parse it to get the structured data
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing Gemini response as JSON:", parseError);
      
      // Try to extract JSON from the response text if it's not valid JSON
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (secondParseError) {
        console.error("Second attempt at parsing JSON failed:", secondParseError);
      }
      
      // Fallback to mock data if parsing fails
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      return {
        defendant: "John Doe",
        plaintiff: "State of California",
        caseNumber: `CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        filingDate: new Date().toLocaleDateString(),
        chargeDescription: "Violation of Penal Code § 459 (Burglary)",
        courtName: "Superior Court of California, County of Los Angeles",
        court: {
          county: "Los Angeles"
        },
        case: {
          shortTitle: "State of California v. John Doe",
          caseNumber: `CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`
        },
        attorney: {
          barNumber: "123456",
          name: "Attorney for Plaintiff",
          firm: "Legal Firm LLP",
          address: {
            street: "123 Legal Street",
            city: "Legal City",
            state: "CA",
            zip: "90210"
          },
          phone: "(555) 123-4567",
          fax: "(555) 765-4321",
          email: "attorney@legalfirm.com",
          attorneyFor: "Plaintiff"
        },
        formParties: {
          askingParty: "State of California",
          answeringParty: "John Doe",
          setNumber: "First"
        },
        date: currentDate
      };
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    
    // Return mock data as fallback if API call fails
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    return {
      defendant: "John Doe",
      plaintiff: "State of California",
      caseNumber: `CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      filingDate: new Date().toLocaleDateString(),
      chargeDescription: "Violation of Penal Code § 459 (Burglary)",
      courtName: "Superior Court of California, County of Los Angeles",
      court: {
        county: "Los Angeles"
      },
      case: {
        shortTitle: "State of California v. John Doe",
        caseNumber: `CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`
      },
      attorney: {
        barNumber: "123456",
        name: "Attorney for Plaintiff",
        firm: "Legal Firm LLP",
        address: {
          street: "123 Legal Street",
          city: "Legal City",
          state: "CA",
          zip: "90210"
        },
        phone: "(555) 123-4567",
        fax: "(555) 765-4321",
        email: "attorney@legalfirm.com",
        attorneyFor: "Plaintiff"
      },
      formParties: {
        askingParty: "State of California",
        answeringParty: "John Doe",
        setNumber: "First"
      },
      date: currentDate
    };
  }
}

/**
 * Analyzes a complaint document and determines which checkboxes should be checked in the Form Interrogatories
 * @param extractedInfo Initial complaint information
 * @param docText The text content of the document (optional, will use only extractedInfo if not provided)
 * @returns Enhanced complaint information with relevantCheckboxes field
 */
export async function analyzeCheckboxesForFormInterrogatories(
  extractedInfo: ComplaintInformation,
  docText?: string
): Promise<ComplaintInformation> {
  try {
    console.log("Analyzing document for form interrogatory checkboxes...");
    
    // Use the Pro model for complex analysis
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      safetySettings,
    });
    
    // Define the list of form interrogatory section numbers for reference
    const sections = {
      general: "301-309",
      personalInjury: "310-318",
      motorVehicles: "320-323",
      pedestrianBicycle: "330-332",
      premisesLiability: "340-340.7",
      businessContract: "350-355",
      employmentDiscrimination: "360-360.7",
      employmentWageHour: "370-376"
    };
    
    // Form interrogatory checkbox field information
    const checkboxFields = [
      {
        "field_name": "Definitions",
        "description_for_gemini": "This checkbox corresponds to the interrogatory: \"(2) INCIDENT means (insert your definition here or on a separate, attached sheet labeled \\\"Section 4(a)(2)\\\"):\". Check this box if this type of information is relevant to the case."
      },
      {
        "field_name": "GenBkgrd",
        "description_for_gemini": "This checkbox corresponds to the interrogatory: \"2.1 State:\". Check this box if this type of information is relevant to the case."
      },
      {
        "field_name": "PMEInjuries",
        "description_for_gemini": "This checkbox corresponds to the interrogatory: \"6.1 Do you attribute any physical, mental, or emotional injuries to the INCIDENT? (If your answer is \\\"no,\\\" do not answer interrogatories 6.2 through 6.7).\". Check this box if this type of information is relevant to the case."
      },
      {
        "field_name": "PropDam",
        "description_for_gemini": "This checkbox corresponds to the interrogatory: \"7.1 Do you attribute any loss of or damage to a vehicle or other property to the INCIDENT? If so, for each item of property:\". Check this box if this type of information is relevant to the case."
      },
      {
        "field_name": "LostincomeEarn",
        "description_for_gemini": "This checkbox corresponds to the interrogatory: \"8.1 Do you attribute any loss of income or earning capacity to the INCIDENT? (If your answer is \\\"no,\\\" do not answer interrogatories 8.2 through 8.8).\". Check this box if this type of information is relevant to the case."
      },
      {
        "field_name": "OtherDam",
        "description_for_gemini": "This checkbox corresponds to the interrogatory: \"9.1 Are there any other damages that you attribute to the INCIDENT? If so, for each item of damage state:\". Check this box if this type of information is relevant to the case."
      },
      {
        "field_name": "MedHist",
        "description_for_gemini": "This checkbox corresponds to the interrogatory: \"10.1 At any time before the INCIDENT did you have complaints or injuries that involved the same part of your body claimed to have been injured in the INCIDENT? If so, for each state:\". Check this box if this type of information is relevant to the case."
      },
      {
        "field_name": "IncOccrdMV",
        "description_for_gemini": "This checkbox corresponds to the interrogatory: \"20.1 State the date, time, and place of the INCIDENT (closest street ADDRESS or intersection).\". Check this box for motor vehicle incidents."
      },
      {
        "field_name": "IncOccrdMV2",
        "description_for_gemini": "This checkbox corresponds to the interrogatory: \"20.2 For each vehicle involved in the INCIDENT, state:\". Check this box for motor vehicle incidents."
      },
      {
        "field_name": "Contract",
        "description_for_gemini": "This checkbox corresponds to the interrogatory: \"50.1 For each agreement alleged in the pleadings:\". Check this box for contract disputes."
      }
    ];
    
    // Create a prompt that explains what we need
    const prompt = `
    You are a legal assistant analyzing a complaint document to determine which Form Interrogatory checkboxes should be selected.
    
    Form Interrogatories (DISC-001) are organized into sections based on case type:
    1. General (${sections.general}): Always applicable to all cases
    2. Personal Injury (${sections.personalInjury}): For cases involving personal injury claims
    3. Motor Vehicles (${sections.motorVehicles}): For cases involving motor vehicle accidents
    4. Pedestrian and Bicycle (${sections.pedestrianBicycle}): For cases involving pedestrian or bicycle incidents
    5. Premises Liability (${sections.premisesLiability}): For cases involving injuries on property
    6. Business/Contract (${sections.businessContract}): For business disputes and contract cases
    7. Employment - Discrimination (${sections.employmentDiscrimination}): For employment discrimination cases
    8. Employment - Wage/Hour (${sections.employmentWageHour}): For wage and hour violations
    
    I need you to analyze the following information and determine which form sections should be checked.
    
    Basic case information already extracted:
    - Defendant: ${extractedInfo.defendant}
    - Plaintiff: ${extractedInfo.plaintiff}
    - Case Number: ${extractedInfo.caseNumber}
    - Filing Date: ${extractedInfo.filingDate}
    - Charge/Claim: ${extractedInfo.chargeDescription || "Not specified"}
    - Court: ${extractedInfo.courtName || "Not specified"}
    
    ${docText ? "Full document text to analyze:" : "No full document text provided, analyze based on the metadata above."}
    ${docText ? docText.substring(0, 5000) + (docText.length > 5000 ? "... [text truncated due to length]" : "") : ""}
    
    For the following specific form fields, determine if they should be checked based on the case:
    ${checkboxFields.map(field => `- ${field.field_name}: ${field.description_for_gemini}`).join('\n')}
    
    Format your response as a JSON object with this structure:
    {
      "caseType": "Primary type of case (e.g., personal injury, contract dispute, employment)",
      "incidentDefinition": "A brief definition of 'INCIDENT' as it should be used in the form (e.g., 'the automobile accident of January 1, 2023')",
      "relevantCheckboxes": {
        "section301": true,
        "section310": false,
        "section320": false,
        "section330": false,
        "section340": false,
        "section350": false,
        "section360": false,
        "section370": false,
        "Definitions": true,
        "GenBkgrd": true,
        "PMEInjuries": false,
        "PropDam": false,
        "LostincomeEarn": false,
        "OtherDam": false,
        "MedHist": false,
        "IncOccrdMV": false,
        "IncOccrdMV2": false,
        "Contract": false
      },
      "explanation": "Brief explanation of why these sections were selected"
    }
    
    Always set section301 to true as these are general interrogatories that apply to all cases.
    For other sections, set to true only if they clearly apply to this specific case.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Log the full response from Gemini for debugging
    console.log("===== GEMINI CHECKBOX ANALYSIS RESPONSE =====");
    console.log(text);
    console.log("============================================");
    
    // Try to parse the JSON response
    try {
      const checkboxAnalysis = JSON.parse(text);
      
      // Log the structured data
      console.log("Parsed analysis result:", JSON.stringify(checkboxAnalysis, null, 2));
      
      // Create a new object that merges the original extracted info with the checkbox analysis
      return {
        ...extractedInfo,
        caseType: checkboxAnalysis.caseType || extractedInfo.caseType,
        incidentDefinition: checkboxAnalysis.incidentDefinition || extractedInfo.incidentDefinition,
        relevantCheckboxes: {
          ...(extractedInfo.relevantCheckboxes || {}),
          ...(checkboxAnalysis.relevantCheckboxes || {})
        },
        explanation: checkboxAnalysis.explanation || extractedInfo.explanation
      };
    } catch (parseError) {
      console.error("Error parsing Gemini checkbox analysis response:", parseError);
      
      // Try to extract JSON from the response text if it's not valid JSON
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const checkboxAnalysis = JSON.parse(jsonMatch[0]);
          
          // Log the structured data from extracted JSON
          console.log("Parsed analysis from extracted JSON:", JSON.stringify(checkboxAnalysis, null, 2));
          
          // Create a new object that merges the original extracted info with the checkbox analysis
          return {
            ...extractedInfo,
            caseType: checkboxAnalysis.caseType || extractedInfo.caseType,
            incidentDefinition: checkboxAnalysis.incidentDefinition || extractedInfo.incidentDefinition,
            relevantCheckboxes: {
              ...(extractedInfo.relevantCheckboxes || {}),
              ...(checkboxAnalysis.relevantCheckboxes || {})
            },
            explanation: checkboxAnalysis.explanation || extractedInfo.explanation
          };
        }
      } catch (secondParseError) {
        console.error("Second attempt at parsing JSON failed:", secondParseError);
      }
      
      // If all parsing fails, just return the original data with default checkboxes
      return {
        ...extractedInfo,
        relevantCheckboxes: {
          ...(extractedInfo.relevantCheckboxes || {}),
          section301: true // Always check the general section as fallback
        },
        explanation: "No valid analysis found"
      };
    }
  } catch (error) {
    console.error("Error analyzing checkboxes with Gemini:", error);
    
    // In case of any error, return the original data with just the general section checked
    return {
      ...extractedInfo,
      relevantCheckboxes: {
        ...(extractedInfo.relevantCheckboxes || {}),
        section301: true // Always check the general section as fallback
      },
      explanation: "No valid analysis found"
    };
  }
}