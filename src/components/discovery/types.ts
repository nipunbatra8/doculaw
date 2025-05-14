import { ComplaintInformation } from "@/integrations/gemini/client";

export interface Document {
  id: string;
  user_id: string;
  case_id: string | null;
  name: string;
  path: string;
  url: string;
  type: string;
  size: number;
  created_at: string;
}

export interface CaseData {
  id: string;
  name: string;
  client: string | null;
  case_type: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  archived_at: string | null;
  complaint_processed?: boolean;
  complaint_data?: ComplaintInformation;
}

export interface DiscoveryType {
  id: string;
  title: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  pdfUrl: string | null;
}

export const STEPS = {
  UPLOAD_COMPLAINT: 0,
  SELECT_DOCUMENTS: 1,
  REVIEW_EXTRACTED_INFO: 2,
  GENERATING_DOCUMENTS: 3,
  VIEW_DOCUMENTS: 4
}; 