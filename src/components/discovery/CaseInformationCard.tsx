import { format, parseISO } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type CaseData = {
  id: string;
  name: string;
  client: string | null;
  case_type: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  archived_at: string | null;
};

interface CaseInformationCardProps {
  caseData: CaseData | undefined;
}

const CaseInformationCard = ({ caseData }: CaseInformationCardProps) => {
  // Format case number directly from id and created_at
  const caseNumber = `CV-${new Date(caseData?.created_at || new Date()).getFullYear()}-${caseData?.id?.substring(0, 5) || "00000"}`;
    
  // Format filing date directly from created_at
  const filingDate = caseData?.created_at 
    ? format(parseISO(caseData.created_at), 'MMM d, yyyy') 
    : format(new Date(), 'MMM d, yyyy');
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle>Case Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Case Name:</span>
              <span className="font-medium">{caseData?.name || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Case Number:</span>
              <span className="font-medium">{caseNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Filing Date:</span>
              <span>{filingDate}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <Badge variant={
                caseData?.status === "Active" ? "default" : 
                caseData?.status === "Pending" ? "secondary" : 
                "outline"
              }>
                {caseData?.status || "Active"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type:</span>
              <span>{caseData?.case_type || "Criminal"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Client:</span>
              <span className="font-medium">{caseData?.client || "No client assigned"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CaseInformationCard; 