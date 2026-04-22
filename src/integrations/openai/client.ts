import OpenAI from "openai";
import { supabase } from "@/integrations/supabase/client";

const apiKey =
  import.meta.env.OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
const openaiModel = "gpt-4.1-nano";
// Vision-capable model used when we need to read the actual bytes of an image
// or PDF. gpt-4.1-nano works for text-only reasoning but the Responses
// `input_file` path is more reliable on gpt-4o-mini for mixed workloads.
const visionModel = "gpt-4o-mini";

if (!apiKey) {
  console.error("OpenAI API key is missing. Please check your .env file.");
}

const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true,
});

export { openai, openaiModel };

/**
 * Safe JSON parser that tolerates markdown fences and surrounding prose.
 */
function safeJsonParse<T>(raw: string): T | null {
  if (!raw) return null;
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "").trim();
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    // ignore
  }
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]) as T;
    } catch {
      // ignore
    }
  }
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]) as T;
    } catch {
      // ignore
    }
  }
  return null;
}

async function runChatCompletion(
  prompt: string | OpenAI.Chat.ChatCompletionContentPart[],
  options?: { jsonMode?: boolean },
): Promise<string> {
  const result = await openai.chat.completions.create({
    model: openaiModel,
    messages: [
      {
        role: "user",
        content: prompt as OpenAI.Chat.ChatCompletionUserMessageParam["content"],
      },
    ],
    ...(options?.jsonMode
      ? { response_format: { type: "json_object" as const } }
      : {}),
  });
  return result.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Run a prompt with a file attachment (PDF or image) using the Responses API,
 * which is the only way chat models can actually read the document bytes.
 */
async function runResponseWithFile(
  prompt: string,
  fileBase64: string,
  mimeType: string,
  options?: { jsonMode?: boolean; filename?: string },
): Promise<string> {
  const dataUrl = `data:${mimeType};base64,${fileBase64}`;
  const isImage = mimeType.startsWith("image/");

  const filePart = isImage
    ? ({ type: "input_image" as const, image_url: dataUrl, detail: "auto" as const })
    : ({
        type: "input_file" as const,
        filename: options?.filename || "document.pdf",
        file_data: dataUrl,
      });

  // We cast to any because the SDK's stricter union types vary between
  // minor versions; the runtime API accepts input_file/input_image the same
  // way across 4.x.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await (openai as any).responses.create({
    model: visionModel,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          filePart,
        ],
      },
    ],
    ...(options?.jsonMode
      ? { text: { format: { type: "json_object" } } }
      : {}),
  });

  // Prefer output_text convenience property, fall back to walking output.
  if (typeof result?.output_text === "string" && result.output_text.length > 0) {
    return result.output_text.trim();
  }
  try {
    const chunks: string[] = [];
    for (const item of result?.output ?? []) {
      if (item?.type === "message" && Array.isArray(item.content)) {
        for (const part of item.content) {
          if (part?.type === "output_text" && typeof part.text === "string") {
            chunks.push(part.text);
          }
        }
      }
    }
    return chunks.join("\n").trim();
  } catch (e) {
    console.error("Failed to read Responses API output:", e);
    return "";
  }
}

export interface ComplaintInformation {
  defendant: string;
  plaintiff: string;
  caseNumber: string;
  filingDate: string;
  chargeDescription: string;
  courtName: string;

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

  caseType?: string;
  incidentDefinition?: string;
  relevantCheckboxes?: {
    [key: string]: boolean;
  };

  explanation?: string;
}

export interface RfaData {
  vectorBasedDefinitions: string[];
  vectorBasedAdmissions: string[];
}

export interface RfpData {
  vectorBasedDefinitions: string[];
  vectorBasedProductions: string[];
}

export interface SiData {
  vectorBasedDefinitions: string[];
  vectorBasedInterrogatories: string[];
}

export interface DemandLetterData {
  header: string;
  re_line: string;
  salutation: string;
  opening_paragraph: string;
  medical_providers: string;
  injuries: string;
  damages_summary: string;
  settlement_demand: string;
  closing: string;
  tone?: string;
}

function buildFallbackComplaint(): ComplaintInformation {
  const currentDate = new Date().toISOString().split("T")[0];
  return {
    defendant: "John Doe",
    plaintiff: "State of California",
    caseNumber: `CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
    filingDate: new Date().toLocaleDateString(),
    chargeDescription: "Violation of Penal Code § 459 (Burglary)",
    courtName: "Superior Court of California, County of Los Angeles",
    court: { county: "Los Angeles" },
    case: {
      shortTitle: "State of California v. John Doe",
      caseNumber: `CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
    },
    attorney: {
      barNumber: "123456",
      name: "Attorney for Plaintiff",
      firm: "Legal Firm LLP",
      address: {
        street: "123 Legal Street",
        city: "Legal City",
        state: "CA",
        zip: "90210",
      },
      phone: "(555) 123-4567",
      fax: "(555) 765-4321",
      email: "attorney@legalfirm.com",
      attorneyFor: "Plaintiff",
    },
    formParties: {
      askingParty: "State of California",
      answeringParty: "John Doe",
      setNumber: "First",
    },
    date: currentDate,
    caseType: "Criminal",
  };
}

/**
 * Extract information from a complaint document file using OpenAI's multimodal capabilities
 * @param fileBase64 The base64-encoded file content
 * @param mimeType The MIME type of the file
 * @returns Extracted details from the document
 */
export async function extractComplaintInformationFromFile(
  fileBase64: string,
  mimeType: string,
): Promise<ComplaintInformation> {
  try {
    console.log("Sending file to OpenAI for analysis...");

    const prompt = `
    You are a legal assistant extracting information from a complaint document. 
    
    Please analyze the attached document and extract the following information in detailed JSON format:
    
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
      "court": { "county": "County name" },
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
    
    For any field where information isn't clearly available in the document,
    use a reasonable default (empty string) instead of inventing data.
    Return only the JSON object with no other text.
    `;

    const text = await runResponseWithFile(prompt, fileBase64, mimeType, {
      jsonMode: true,
      filename: "complaint.pdf",
    });

    console.log("OpenAI file analysis response length:", text.length);

    const parsed = safeJsonParse<ComplaintInformation>(text);
    if (parsed) return parsed;

    console.warn(
      "Could not parse structured JSON from file extraction; falling back to text extraction.",
    );
    const textData = await extractTextFromFile(fileBase64, mimeType);
    return extractComplaintInformation(textData);
  } catch (error) {
    console.error("Error analyzing file with OpenAI:", error);

    try {
      console.log("Falling back to text extraction after error...");
      const textData = await extractTextFromFile(fileBase64, mimeType);
      return extractComplaintInformation(textData);
    } catch (fallbackError) {
      console.error("Fallback extraction also failed:", fallbackError);
      return buildFallbackComplaint();
    }
  }
}

/**
 * Helper function to extract text from a file using OCR if necessary
 * @param fileBase64 Base64-encoded file content
 * @param mimeType File MIME type
 * @returns Extracted text from the file
 */
export async function extractTextFromFile(
  fileBase64: string,
  mimeType: string,
): Promise<string> {
  try {
    const prompt = `Please extract ALL text content from the attached document as accurately and completely as possible.
Include every page, section, numbered item, heading, and footer. Do not summarize,
skip, merge, or omit anything. Preserve the ordering of the document.
For table content, preserve the structure using plain text formatting.
For scanned or image-based pages, use OCR to read the text.
Return only the extracted text with no additional commentary.`;

    const extractedText = await runResponseWithFile(
      prompt,
      fileBase64,
      mimeType,
      { filename: "document.pdf" },
    );

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
export async function extractComplaintInformation(
  docText: string,
): Promise<ComplaintInformation> {
  try {
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

    const text = await runChatCompletion(prompt, { jsonMode: true });

    console.log("OpenAI API response length:", text.length);

    const parsed = safeJsonParse<ComplaintInformation>(text);
    if (parsed) return parsed;

    console.error("Could not parse ComplaintInformation JSON from model output.");
    return buildFallbackComplaint();
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return buildFallbackComplaint();
  }
}

export async function generateRFAWithAI(
  complaintInfo: ComplaintInformation,
): Promise<RfaData> {
  const prompt = `
    You are a legal assistant. Based on the provided complaint information, generate a list of "definitions" and "request for admissions" for a legal document.

    Complaint Information:
    ${JSON.stringify(complaintInfo, null, 2)}

    Generate 5-10 relevant definitions and 15-25 request for admissions.

    Return the output as a JSON object with the following structure:
    {
      "vectorBasedDefinitions": ["definition 1", "definition 2", ...],
      "vectorBasedAdmissions": ["admission 1", "admission 2", ...]
    }
    `;

  const text = await runChatCompletion(prompt, { jsonMode: true });

  const parsed = safeJsonParse<RfaData>(text);
  if (parsed && Array.isArray(parsed.vectorBasedDefinitions) && Array.isArray(parsed.vectorBasedAdmissions)) {
    return parsed;
  }
  console.error("Error parsing RFA generation response");
  throw new Error("Failed to generate RFA data.");
}

export async function generateSIWithAI(
  complaintInfo: ComplaintInformation,
): Promise<SiData> {
  const prompt = `
    You are a legal assistant. Based on the provided complaint information, generate a list of "definitions" and "special interrogatories" for a civil litigation discovery document.

    Complaint Information:
    ${JSON.stringify(complaintInfo, null, 2)}

    Generate 5-10 relevant definitions and 20-30 special interrogatories. Interrogatories should be clear, specific, and numbered when rendered, but do not include numbers in the text itself.

    Return the output as a JSON object with the following structure:
    {
      "vectorBasedDefinitions": ["definition 1", "definition 2", ...],
      "vectorBasedInterrogatories": ["interrogatory 1", "interrogatory 2", ...]
    }
  `;

  const text = await runChatCompletion(prompt, { jsonMode: true });

  const parsed = safeJsonParse<SiData>(text);
  if (
    parsed &&
    Array.isArray(parsed.vectorBasedDefinitions) &&
    Array.isArray(parsed.vectorBasedInterrogatories)
  ) {
    return parsed;
  }
  console.error("Failed to parse SI JSON", text);
  {
    return {
      vectorBasedDefinitions: [
        'The term "PLAINTIFF" refers to the party propounding these interrogatories.',
        'The term "DEFENDANT" refers to the party responding to these interrogatories.',
      ],
      vectorBasedInterrogatories: [
        "State your full name, address, and telephone number.",
        "Identify each person with knowledge of the facts alleged in the complaint.",
      ],
    };
  }
}

export async function generateRFPWithAI(
  complaintInfo: ComplaintInformation,
): Promise<RfpData> {
  const prompt = `
    You are a legal assistant. Based on the provided complaint information, generate a list of "definitions" and "request for productions" for a legal document.

    Complaint Information:
    ${JSON.stringify(complaintInfo, null, 2)}

    Generate 5-10 relevant definitions and 15-25 request for productions. A request for production is a legal request for documents.

    Return the output as a JSON object with the following structure:
    {
      "vectorBasedDefinitions": ["definition 1", "definition 2", ...],
      "vectorBasedProductions": ["production 1", "production 2", ...]
    }
    `;

  const text = await runChatCompletion(prompt, { jsonMode: true });

  const parsed = safeJsonParse<RfpData>(text);
  if (
    parsed &&
    Array.isArray(parsed.vectorBasedDefinitions) &&
    Array.isArray(parsed.vectorBasedProductions)
  ) {
    return parsed;
  }
  console.error("Error parsing RFP generation response");
  throw new Error("Failed to generate RFP data.");
}

/**
 * Analyzes a complaint document and determines which checkboxes should be checked in the Form Interrogatories
 * @param extractedInfo Initial complaint information
 * @param docText The text content of the document (optional, will use only extractedInfo if not provided)
 * @returns Enhanced complaint information with relevantCheckboxes field
 */
export async function analyzeCheckboxesForFormInterrogatories(
  extractedInfo: ComplaintInformation,
  docText?: string,
): Promise<ComplaintInformation> {
  try {
    console.log("Analyzing document for form interrogatory checkboxes...");

    const sections = {
      general: "301-309",
      personalInjury: "310-318",
      motorVehicles: "320-323",
      pedestrianBicycle: "330-332",
      premisesLiability: "340-340.7",
      businessContract: "350-355",
      employmentDiscrimination: "360-360.7",
      employmentWageHour: "370-376",
    };

    const checkboxFields = [
      {
        field_name: "Definitions",
        description_for_ai:
          'This checkbox corresponds to the interrogatory: "(2) INCIDENT means (insert your definition here or on a separate, attached sheet labeled \\"Section 4(a)(2)\\"):". Check this box if this type of information is relevant to the case.',
      },
      {
        field_name: "GenBkgrd",
        description_for_ai:
          'This checkbox corresponds to the interrogatory: "2.1 State:". Check this box if this type of information is relevant to the case.',
      },
      {
        field_name: "PMEInjuries",
        description_for_ai:
          'This checkbox corresponds to the interrogatory: "6.1 Do you attribute any physical, mental, or emotional injuries to the INCIDENT? (If your answer is \\"no,\\" do not answer interrogatories 6.2 through 6.7).". Check this box if this type of information is relevant to the case.',
      },
      {
        field_name: "PropDam",
        description_for_ai:
          'This checkbox corresponds to the interrogatory: "7.1 Do you attribute any loss of or damage to a vehicle or other property to the INCIDENT? If so, for each item of property:". Check this box if this type of information is relevant to the case.',
      },
      {
        field_name: "LostincomeEarn",
        description_for_ai:
          'This checkbox corresponds to the interrogatory: "8.1 Do you attribute any loss of income or earning capacity to the INCIDENT? (If your answer is \\"no,\\" do not answer interrogatories 8.2 through 8.8).". Check this box if this type of information is relevant to the case.',
      },
      {
        field_name: "OtherDam",
        description_for_ai:
          'This checkbox corresponds to the interrogatory: "9.1 Are there any other damages that you attribute to the INCIDENT? If so, for each item of damage state:". Check this box if this type of information is relevant to the case.',
      },
      {
        field_name: "MedHist",
        description_for_ai:
          'This checkbox corresponds to the interrogatory: "10.1 At any time before the INCIDENT did you have complaints or injuries that involved the same part of your body claimed to have been injured in the INCIDENT? If so, for each state:". Check this box if this type of information is relevant to the case.',
      },
      {
        field_name: "IncOccrdMV",
        description_for_ai:
          'This checkbox corresponds to the interrogatory: "20.1 State the date, time, and place of the INCIDENT (closest street ADDRESS or intersection).". Check this box for motor vehicle incidents.',
      },
      {
        field_name: "IncOccrdMV2",
        description_for_ai:
          'This checkbox corresponds to the interrogatory: "20.2 For each vehicle involved in the INCIDENT, state:". Check this box for motor vehicle incidents.',
      },
      {
        field_name: "Contract",
        description_for_ai:
          'This checkbox corresponds to the interrogatory: "50.1 For each agreement alleged in the pleadings:". Check this box for contract disputes.',
      },
    ];

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
    ${checkboxFields.map((field) => `- ${field.field_name}: ${field.description_for_ai}`).join("\n")}
    
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

    const text = await runChatCompletion(prompt, { jsonMode: true });

    console.log("===== OPENAI CHECKBOX ANALYSIS RESPONSE =====");
    console.log(text);
    console.log("============================================");

    try {
      const checkboxAnalysis = JSON.parse(text);
      console.log(
        "Parsed analysis result:",
        JSON.stringify(checkboxAnalysis, null, 2),
      );
      return {
        ...extractedInfo,
        caseType: checkboxAnalysis.caseType || extractedInfo.caseType,
        incidentDefinition:
          checkboxAnalysis.incidentDefinition || extractedInfo.incidentDefinition,
        relevantCheckboxes: {
          ...(extractedInfo.relevantCheckboxes || {}),
          ...(checkboxAnalysis.relevantCheckboxes || {}),
        },
        explanation: checkboxAnalysis.explanation || extractedInfo.explanation,
      };
    } catch (parseError) {
      console.error("Error parsing OpenAI checkbox analysis response:", parseError);

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const checkboxAnalysis = JSON.parse(jsonMatch[0]);
          console.log(
            "Parsed analysis from extracted JSON:",
            JSON.stringify(checkboxAnalysis, null, 2),
          );
          return {
            ...extractedInfo,
            caseType: checkboxAnalysis.caseType || extractedInfo.caseType,
            incidentDefinition:
              checkboxAnalysis.incidentDefinition || extractedInfo.incidentDefinition,
            relevantCheckboxes: {
              ...(extractedInfo.relevantCheckboxes || {}),
              ...(checkboxAnalysis.relevantCheckboxes || {}),
            },
            explanation:
              checkboxAnalysis.explanation || extractedInfo.explanation,
          };
        }
      } catch (secondParseError) {
        console.error("Second attempt at parsing JSON failed:", secondParseError);
      }

      return {
        ...extractedInfo,
        relevantCheckboxes: {
          ...(extractedInfo.relevantCheckboxes || {}),
          section301: true,
        },
        explanation: "No valid analysis found",
      };
    }
  } catch (error) {
    console.error("Error analyzing checkboxes with OpenAI:", error);

    return {
      ...extractedInfo,
      relevantCheckboxes: {
        ...(extractedInfo.relevantCheckboxes || {}),
        section301: true,
      },
      explanation: "No valid analysis found",
    };
  }
}

export async function generateDemandLetterWithAI(
  complaintInfo: ComplaintInformation,
  contextDocuments: string[] = [],
  customInstructions?: string,
): Promise<DemandLetterData> {
  const prompt = `You are drafting a formal insurance demand letter for bodily injury claims, similar to personal injury law firms.

Complaint / Case Information:
${JSON.stringify(complaintInfo, null, 2)}

Retrieved Context Documents / Notes (may include medical records, bills, correspondence):
${contextDocuments
  .slice(0, 5)
  .map((d, i) => `[Doc ${i + 1}] ${d.substring(0, 1800)}`)
  .join("\n\n")}

Generate a professional demand letter matching this structure:
{
  "header": "Date and transmission method (e.g., 'SENT VIA ELECTRONIC MAIL adjuster@insurance.com')",
  "re_line": "RE: [Subject line with claim info, policy limits offer, claim number, client name, date of loss]",
  "salutation": "Dear [Adjuster Name or Ms./Mr. Last Name]:",
  "opening_paragraph": "Brief intro stating representation, intent to settle within policy limits",
  "medical_providers": "List enclosed medical records and providers with addresses/amounts if available",
  "injuries": "Bullet-pointed list of specific injuries sustained",
  "damages_summary": "Property damage details, vehicle total loss if applicable, impact description",
  "settlement_demand": "Formal demand amount and terms for full release, waiver provisions",
  "closing": "Professional closing with attorney signature line",
  "tone": "formal_insurance_demand"
}

Style notes:
- Use formal legal terminology
- Be specific about policy limits settlement offer
- Include medical provider details in structured format
- List injuries as bullet points
- Reference California Civil Code sections if relevant
- Professional but firm tone throughout

${customInstructions ? `Additional instructions: ${customInstructions}` : ""}

Return ONLY valid JSON, no markdown formatting.`;

  const text = await runChatCompletion(prompt, { jsonMode: true });

  const parsed = safeJsonParse<DemandLetterData>(text);
  if (parsed) return parsed;
  throw new Error("Failed to parse demand letter JSON");
}

export interface DiscoveryQuestion {
  id: string;
  number?: string;
  question: string;
  category?: string;
}

export interface DiscoveryDocumentData {
  documentType: string;
  propoundingParty: string;
  respondingParty: string;
  caseNumber?: string;
  setNumber?: string;
  serviceDate?: string;
  responseDeadline?: string;
  questions: DiscoveryQuestion[];
}

export interface ObjectionData {
  id: string;
  text: string;
  selected: boolean;
  relevance: string;
}

/**
 * Extract discovery questions and metadata from uploaded discovery documents
 */
export async function extractDiscoveryDocument(
  fileBase64: string,
  mimeType: string,
  documentCategory: string,
): Promise<DiscoveryDocumentData> {
  try {
    console.log(`Extracting ${documentCategory} document with OpenAI...`);

    const prompt = `You are a legal assistant analyzing an opposing party's discovery document (${documentCategory}).

CRITICAL: Extract EVERY SINGLE question, interrogatory, request for admission, or
request for production contained in the attached document. Do not merge multiple
questions into one entry. Do not skip any numbered item even if it continues on a
new page. Preserve the original question numbering. Include every subpart
(e.g. 3.1, 3.2, 3.3) as its own entry when they are separately numbered.

Return a JSON object with this exact structure:
{
  "documentType": "${documentCategory}",
  "propoundingParty": "Name of the party propounding these requests",
  "respondingParty": "Name of the party who must respond",
  "caseNumber": "Case number if found",
  "setNumber": "Set number (e.g., 'First Set', 'Second Set')",
  "serviceDate": "Date the document was served, if found",
  "responseDeadline": "Response deadline date, if found",
  "questions": [
    {
      "id": "unique_id",
      "number": "question number exactly as in document (e.g., '1', '3.2', 'RFA No. 5')",
      "question": "The FULL text of the question/request, verbatim",
      "category": "category heading from the document, if any"
    }
  ]
}

Rules:
- Include ALL questions; never truncate, summarize or stop early.
- Preserve each question's exact wording.
- Use OCR on scanned/image pages.
- Return ONLY valid JSON with no markdown formatting.`;

    const text = await runResponseWithFile(prompt, fileBase64, mimeType, {
      jsonMode: true,
      filename: `${documentCategory.replace(/\s+/g, "_")}.pdf`,
    });

    console.log("OpenAI extraction response length:", text.length);

    const parsed = safeJsonParse<DiscoveryDocumentData>(text);
    if (parsed && Array.isArray(parsed.questions)) {
      // Sanity: assign ids if missing so the app can key them reliably.
      parsed.questions = parsed.questions.map((q, idx) => ({
        ...q,
        id: q.id && String(q.id).trim().length > 0 ? String(q.id) : `q_${idx + 1}`,
      }));
      return parsed;
    }

    throw new Error("Failed to parse discovery document JSON");
  } catch (error) {
    console.error("Error extracting discovery document:", error);
    throw error;
  }
}

/**
 * Generate relevant objections based on discovery requests and case information
 */
export async function generateObjectionsForDiscovery(
  discoveryData: DiscoveryDocumentData,
  caseType: string,
  caseInfo?: ComplaintInformation,
): Promise<ObjectionData[]> {
  try {
    console.log("Generating AI objections for discovery...");

    const prompt = `
    You are a legal assistant helping to prepare objections to discovery requests.
    
    Discovery Document Type: ${discoveryData.documentType}
    Case Type: ${caseType}
    Number of Questions: ${discoveryData.questions.length}
    
    Sample Questions:
    ${discoveryData.questions.slice(0, 5).map((q, i) => `${i + 1}. ${q.question}`).join("\n")}
    
    ${caseInfo ? `Case Information: ${JSON.stringify(caseInfo, null, 2)}` : ""}
    
    Generate a comprehensive list of standard objections that should be considered for these discovery requests.
    For each objection, indicate whether it should be selected by default based on the questions asked.
    
    Common objections include:
    - Overly broad and unduly burdensome
    - Vague and ambiguous
    - Attorney-client privilege
    - Work product doctrine
    - Not relevant to claims or defenses
    - Not proportional to needs of the case
    - Seeks confidential or proprietary information
    - Compound, conjunctive, or disjunctive
    - Assumes facts not in evidence
    
    Return a JSON array with this structure:
    [
      {
        "id": "obj_1",
        "text": "Full text of the objection",
        "selected": true/false,
        "relevance": "Explanation of why this objection is or isn't relevant to these specific requests"
      }
    ]
    
    Provide 8-12 objections total. Select the most relevant ones as true.
    Return only valid JSON with no markdown formatting.
    `;

    const text = await runChatCompletion(prompt);

    console.log("Generated objections response length:", text.length);

    const parsed = safeJsonParse<ObjectionData[]>(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    // Fallback defaults if parsing fails
    {
      console.error("Error parsing objections response");
      return [
        {
          id: "obj_1",
          text: "Objection to the extent that the request is overly broad and unduly burdensome.",
          selected: true,
          relevance: "Standard objection applicable to most discovery requests",
        },
        {
          id: "obj_2",
          text: "Objection to the extent that the request seeks information protected by attorney-client privilege.",
          selected: true,
          relevance: "Protects confidential attorney-client communications",
        },
        {
          id: "obj_3",
          text: "Objection to the extent that the request seeks information protected by the work product doctrine.",
          selected: true,
          relevance: "Protects attorney work product and trial preparation materials",
        },
      ];
    }
  } catch (error) {
    console.error("Error generating objections:", error);

    return [
      {
        id: "obj_1",
        text: "Objection to the extent that the request is overly broad and unduly burdensome.",
        selected: true,
        relevance: "Standard objection applicable to most discovery requests",
      },
      {
        id: "obj_2",
        text: "Objection to the extent that the request seeks information protected by attorney-client privilege.",
        selected: true,
        relevance: "Protects confidential attorney-client communications",
      },
    ];
  }
}

/**
 * Generate objections and case narratives based on client responses
 */
export async function generateObjectionsAndNarratives(
  questionsWithResponses: Array<{ question: string; clientResponse: string }>,
  caseInfo?: ComplaintInformation,
  caseType?: string,
): Promise<{
  objections: ObjectionData[];
  narratives: Array<{
    id: string;
    title: string;
    description: string;
    strength: "strong" | "moderate" | "weak";
    keyPoints: string[];
    recommendedObjections: string[];
  }>;
  responseSuggestions: Array<{
    questionId: string;
    suggestion: string;
    reasoning: string;
  }>;
}> {
  try {
    console.log("Generating objections and narratives based on client responses...");

    const prompt = `
    You are a skilled litigation attorney analyzing client responses to discovery requests.
    
    Case Type: ${caseType || "General"}
    ${caseInfo ? `Case Information: ${JSON.stringify(caseInfo, null, 2)}` : ""}
    
    Client's Responses to Discovery Questions:
    ${questionsWithResponses
      .map(
        (q, i) => `
    Question ${i + 1}: ${q.question}
    Client Response: ${q.clientResponse}
    `,
      )
      .join("\n")}
    
    Your task is to:
    1. Generate strategic objections tailored to these specific responses
    2. Identify potential case narrative strategies based on the responses
    3. Provide suggestions for shaping the final responses
    
    Return a JSON object with this structure:
    {
      "objections": [
        {
          "id": "obj_1",
          "text": "Full text of the objection",
          "selected": true/false,
          "relevance": "Why this objection is strategic for this case based on client responses"
        }
      ],
      "narratives": [
        {
          "id": "narrative_1",
          "title": "Brief title of the case theory/narrative",
          "description": "Detailed explanation of this narrative strategy",
          "strength": "strong" | "moderate" | "weak",
          "keyPoints": ["Key point 1", "Key point 2"],
          "recommendedObjections": ["obj_1", "obj_2"]
        }
      ],
      "responseSuggestions": [
        {
          "questionId": "q_1",
          "suggestion": "How to craft/shape this response",
          "reasoning": "Why this approach is strategic"
        }
      ]
    }
    
    Be strategic:
    - Look for inconsistencies or areas to strengthen
    - Identify which objections protect the client best
    - Suggest narrative themes that align with the responses
    - Consider what information helps or hurts the case
    - Recommend which details to emphasize or de-emphasize
    
    Generate 6-10 objections, 2-4 narratives, and suggestions for key questions.
    Return only valid JSON with no markdown formatting.
    `;

    const text = await runChatCompletion(prompt, { jsonMode: true });

    console.log("Generated objections and narratives length:", text.length);

    type Result = {
      objections: ObjectionData[];
      narratives: Array<{
        id: string;
        title: string;
        description: string;
        strength: "strong" | "moderate" | "weak";
        keyPoints: string[];
        recommendedObjections: string[];
      }>;
      responseSuggestions: Array<{
        questionId: string;
        suggestion: string;
        reasoning: string;
      }>;
    };
    const parsed = safeJsonParse<Result>(text);
    if (parsed && Array.isArray(parsed.objections)) {
      return parsed;
    }
    console.error("Error parsing objections/narratives response");
    {
      return {
        objections: [
          {
            id: "obj_1",
            text: "Objection to the extent that the request is overly broad and unduly burdensome.",
            selected: true,
            relevance: "Standard protective objection",
          },
        ],
        narratives: [
          {
            id: "narrative_1",
            title: "Defense Strategy",
            description: "Primary case narrative based on client responses",
            strength: "moderate" as const,
            keyPoints: ["Review client responses", "Develop strategy"],
            recommendedObjections: ["obj_1"],
          },
        ],
        responseSuggestions: [],
      };
    }
  } catch (error) {
    console.error("Error generating objections and narratives:", error);
    throw error;
  }
}

/**
 * Convert discovery questions into client-friendly questionnaire format
 */
export async function generateClientQuestions(
  questions: DiscoveryQuestion[],
  caseInfo?: ComplaintInformation,
): Promise<Array<{ id: string; question: string; original: string; edited: boolean }>> {
  try {
    console.log("Generating client-friendly questions with OpenAI...");

    const prompt = `
    You are a legal assistant helping to prepare a client questionnaire.
    
    The following discovery questions need to be converted into simple, clear questions that a client can understand and answer.
    
    Original Discovery Questions:
    ${questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n\n")}
    
    ${caseInfo ? `Case Context: ${JSON.stringify(caseInfo, null, 2)}` : ""}
    
    IMPORTANT RULES:
    1. Simplify the legal language into conversational English
    2. Break down compound questions into separate questions
    3. If specific dates, names, or details are available in the Case Context, USE THEM directly
    4. If specific information is NOT available, use clear generic language like "the incident", "the accident", "the other party", etc.
    5. NEVER use placeholder brackets like [Date of Accident] or [Person Name] - either use the actual information or use generic terms
    6. Make questions conversational but professional
    7. Ensure the client will understand what information is being requested
    
    EXAMPLES:
    Bad: "Did you speak with [Other Party Name] on [Date]?"
    Good (with context): "Did you speak with John Doe on January 15, 2023?"
    Good (without context): "Did you speak with the other party involved in the incident?"
    
    Return a JSON array with this structure:
    [
      {
        "id": "q_1",
        "question": "Simplified client-friendly version of the question",
        "original": "Original discovery question text",
        "edited": false
      }
    ]
    
    Return only valid JSON with no markdown formatting.
    `;

    const text = await runChatCompletion(prompt);

    console.log("Generated client questions response length:", text.length);

    type ClientQ = { id: string; question: string; original: string; edited: boolean };
    const parsed = safeJsonParse<ClientQ[]>(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // CRITICAL: never drop questions. If the model returned fewer entries
      // than were requested, pass through the remaining original questions so
      // that every single extracted discovery question is represented in the
      // client questionnaire.
      if (parsed.length < questions.length) {
        console.warn(
          `Model returned ${parsed.length} client questions for ${questions.length} discovery questions; backfilling remaining originals.`,
        );
        const extras: ClientQ[] = questions.slice(parsed.length).map((q, i) => ({
          id: `q_${parsed.length + i + 1}`,
          question: q.question,
          original: q.question,
          edited: false,
        }));
        return [...parsed, ...extras];
      }
      return parsed;
    }

    console.error("Error parsing client questions response; passing originals through");
    // Never slice: every extracted question must be surfaced to the client.
    return questions.map((q, i) => ({
      id: q.id || `q_${i + 1}`,
      question: q.question,
      original: q.question,
      edited: false,
    }));
  } catch (error) {
    console.error("Error generating client questions:", error);

    return questions.map((q, i) => ({
      id: q.id || `q_${i + 1}`,
      question: q.question,
      original: q.question,
      edited: false,
    }));
  }
}

// ---------------------------------------------------------------------------
// Vector store helpers (proxied through Supabase edge functions)
// ---------------------------------------------------------------------------

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    caseId: string;
    documentId: string;
    documentName: string;
    chunkIndex: number;
    userId: string;
    type: string;
    createdAt: string;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: DocumentChunk["metadata"];
  content: string;
}

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: {
    caseId: string;
    documentId: string;
    documentName: string;
    chunkIndex: number;
    userId: string;
    type: string;
    createdAt: string;
    content: string;
  };
}

export async function addDocumentsToVectorStore(
  documents: Array<{
    id: string;
    name: string;
    content: string;
    type: string;
  }>,
  caseId: string,
  userId: string,
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("vector-store", {
      body: {
        action: "addDocuments",
        data: {
          documents,
          caseId,
          userId,
        },
      },
    });

    if (error) throw error;

    console.log(`Successfully added documents to vector store for case ${caseId}`);
  } catch (error) {
    console.error("Error adding documents to vector store:", error);
    throw new Error("Failed to add documents to vector store");
  }
}

export async function searchVectorStore(
  query: string,
  caseId: string,
  topK: number = 5,
): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase.functions.invoke("vector-store", {
      body: {
        action: "search",
        data: {
          query,
          caseId,
          topK,
        },
      },
    });

    if (error) throw error;

    return data.results;
  } catch (error) {
    console.error("Error searching vector store:", error);
    throw new Error("Failed to search vector store");
  }
}

export async function deleteDocumentVectors(documentId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("vector-store", {
      body: {
        action: "deleteDocument",
        data: {
          documentId,
        },
      },
    });

    if (error) throw error;

    console.log(`Deleted vectors for document ${documentId}`);
  } catch (error) {
    console.error("Error deleting document vectors:", error);
    throw new Error("Failed to delete document vectors");
  }
}

export async function getAIResponseWithContext(
  query: string,
  caseId: string,
  contextLimit: number = 5,
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("vector-store", {
      body: {
        action: "getAIResponse",
        data: {
          query,
          caseId,
          contextLimit,
        },
      },
    });

    if (error) throw error;

    return data.response;
  } catch (error) {
    console.error("Error getting AI response with context:", error);
    throw new Error("Failed to get AI response");
  }
}
