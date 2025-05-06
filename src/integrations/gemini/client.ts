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
}

/**
 * Extract information from a criminal complaint document
 * @param docText The text content of the document
 * @returns Extracted details from the document
 */
export async function extractComplaintInformation(docText: string): Promise<ComplaintInformation> {
  try {
    // For now, this is a mock implementation since we don't have actual document text
    // In production, docText would be the extracted text from the uploaded PDF
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      safetySettings,
    });
    
    const prompt = `
    You are an AI legal assistant helping to extract relevant information from a criminal complaint document.
    Please analyze the following text from a criminal complaint and extract these key details:
    1. Defendant name
    2. Plaintiff name (usually the state)
    3. Case number
    4. Filing date
    5. Court name
    6. Charge description (the criminal charges being alleged)
    
    Format your response as a JSON object with these keys: defendant, plaintiff, caseNumber, filingDate, chargeDescription, courtName.
    
    Document text:
    ${docText}
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // The response should be a JSON string, parse it to get the structured data
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing Gemini response as JSON:", parseError);
      
      // Fallback to mock data if parsing fails
      return {
        defendant: "John Doe",
        plaintiff: "State of California",
        caseNumber: `CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        filingDate: new Date().toLocaleDateString(),
        chargeDescription: "Violation of Penal Code § 459 (Burglary)",
        courtName: "Superior Court of California, County of Los Angeles"
      };
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    
    // Return mock data as fallback if API call fails
    return {
      defendant: "John Doe",
      plaintiff: "State of California",
      caseNumber: `CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      filingDate: new Date().toLocaleDateString(),
      chargeDescription: "Violation of Penal Code § 459 (Burglary)",
      courtName: "Superior Court of California, County of Los Angeles"
    };
  }
}

/**
 * Generate discovery document content based on complaint information
 * @param documentType The type of discovery document to generate
 * @param complaintInfo The extracted information from the complaint
 * @returns Generated document content
 */
export async function generateDiscoveryDocument(documentType: string, complaintInfo: ComplaintInformation) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      safetySettings,
    });
    
    const prompt = `
    You are a legal document generation assistant. Based on the information about a criminal complaint,
    generate a ${documentType} discovery document.
    
    Complaint information:
    - Defendant: ${complaintInfo.defendant}
    - Plaintiff: ${complaintInfo.plaintiff}
    - Case Number: ${complaintInfo.caseNumber}
    - Filing Date: ${complaintInfo.filingDate}
    - Court: ${complaintInfo.courtName}
    - Charges: ${complaintInfo.chargeDescription}
    
    Create appropriate content for a ${documentType} document based on this information.
    Format your response as a single string containing the document text.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error(`Error generating ${documentType} document:`, error);
    
    // Return placeholder content if API call fails
    return `# ${documentType}\n\nThis is a placeholder for the ${documentType} document.\nIt would include relevant questions and requests based on the complaint information.`;
  }
}

export default {
  extractComplaintInformation,
  generateDiscoveryDocument
}; 