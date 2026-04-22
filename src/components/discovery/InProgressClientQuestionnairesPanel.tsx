import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendSms, getClientDetails } from "@/integrations/sms/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  ChevronDown,
  Clock,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react";

export type OpenClientQuestionnaire = {
  id: string;
  client_id: string;
  case_id: string;
  case_number?: string | null;
  status: "pending" | "in_progress" | "completed";
  title: string;
  case_name: string;
  completed_questions: number;
  total_questions: number;
  response_deadline: string | null;
  questions: Array<{ id: string; question: string; original: string; edited: boolean }>;
  discovery_type: string | null;
  created_at: string;
};


type ClientLabel = { id: string; fullName: string };

export const inProgressQuestionnairesQueryKey = (caseId: string, userId: string) =>
  ["inProgressClientQuestionnaires", caseId, userId] as const;

type InProgressClientQuestionnairesPanelProps = {
  caseId: string;
  activeQuestionnaireId?: string | null;
  onViewInWorkflow?: (q: OpenClientQuestionnaire) => void;
  showAddAnotherButton?: boolean;
  onAddAnother?: () => void;
};

const InProgressClientQuestionnairesPanel = ({
  caseId,
  activeQuestionnaireId: focusedId = null,
  onViewInWorkflow,
  showAddAnotherButton = false,
  onAddAnother,
}: InProgressClientQuestionnairesPanelProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [reminderSendingId, setReminderSendingId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsQuestionnaire, setDetailsQuestionnaire] =
    useState<OpenClientQuestionnaire | null>(null);

  const { data: inProgressCaseQuestionnaires = [] } = useQuery<OpenClientQuestionnaire[]>({
    queryKey: inProgressQuestionnairesQueryKey(caseId, user?.id ?? ""),
    queryFn: async () => {
      if (!user || !caseId) return [];
      const { data, error } = await supabase
        .from("client_questionnaires")
        .select("*")
        .eq("case_id", caseId)
        .eq("lawyer_id", user.id)
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching in-progress questionnaires:", error);
        return [];
      }
      return (data || []) as OpenClientQuestionnaire[];
    },
    enabled: !!user && !!caseId,
    refetchInterval: 5000,
  });

  const { data: caseClientDetails = [] } = useQuery<ClientLabel[]>({
    queryKey: ["caseClientLabels", caseId, user?.id],
    queryFn: async () => {
      if (!user || !caseId) return [];
      const { data: caseRow, error: caseErr } = await supabase
        .from("cases")
        .select("clients")
        .eq("id", caseId)
        .eq("user_id", user.id)
        .single();
      if (caseErr || !caseRow?.clients?.length) return [];
      const { data: rows, error: clErr } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .in("id", caseRow.clients);
      if (clErr) return [];
      return (rows || []).map((c) => ({
        id: c.id,
        fullName: `${c.first_name} ${c.last_name}`.trim(),
      }));
    },
    enabled: !!user && !!caseId,
  });

  const clientNameFor = useCallback(
    (clientId: string) =>
      caseClientDetails.find((c) => c.id === clientId)?.fullName ??
      `Client ${clientId.slice(0, 8)}…`,
    [caseClientDetails],
  );

  const sendQuestionnaireReminder = useCallback(
    async (q: OpenClientQuestionnaire) => {
      if (!user?.id || !caseId) return;
      setReminderSendingId(q.id);
      try {
        const clientDetails = await getClientDetails(q.client_id);
        if (!clientDetails.phone) {
          toast({
            title: "No Phone Number",
            description: "This client has no phone number on file.",
            variant: "destructive",
          });
          return;
        }
        const remaining = q.total_questions - q.completed_questions;
        const result = await sendSms({
          to_phone: clientDetails.phone,
          message_type: "reminder",
          client_id: q.client_id,
          lawyer_id: user.id,
          case_id: caseId,
          questionnaire_id: q.id,
          client_name: clientDetails.first_name || "there",
          lawyer_name: profile?.name || "your attorney",
          case_name: q.case_name || "your case",
          question_count: (q.questions?.length ?? q.total_questions) || 0,
          remaining_questions: remaining,
          deadline: q.response_deadline || undefined,
          login_link: "https://doculaw.vercel.app/client-login",
        });
        if (result.success) {
          toast({
            title: "Reminder Sent",
            description: `SMS reminder sent to ${clientDetails.first_name || "the client"}.`,
          });
        } else {
          toast({
            title: "Reminder Failed",
            description: result.error || "Could not send SMS.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Reminder SMS error:", err);
        toast({ title: "Error", description: "Failed to send reminder.", variant: "destructive" });
      } finally {
        setReminderSendingId(null);
      }
    },
    [user, caseId, profile?.name, toast],
  );

  const openDetails = (q: OpenClientQuestionnaire) => {
    setDetailsQuestionnaire(q);
    setDetailsOpen(true);
  };

  const handleViewPrimary = (q: OpenClientQuestionnaire) => {
    if (onViewInWorkflow) {
      onViewInWorkflow(q);
    } else {
      navigate(`/discovery-response/${caseId}?q=${encodeURIComponent(q.id)}`);
    }
  };

  if (inProgressCaseQuestionnaires.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-200/80 bg-amber-50/40">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-col sm:flex-row sm:items-center">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-700" />
                In progress discovery response
              </CardTitle>
              <CardDescription className="mt-1">
                Client questionnaires still open for this case. Open details, send reminders, or
                continue in the discovery response workflow.
              </CardDescription>
            </div>
            {showAddAnotherButton && onAddAnother && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-doculaw-200"
                onClick={onAddAnother}
              >
                <FileText className="h-4 w-4 mr-2" />
                Add another request
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {inProgressCaseQuestionnaires.map((q) => {
            const displayName = clientNameFor(q.client_id);
            const isFocused = focusedId === q.id;
            return (
              <div
                key={q.id}
                className={`rounded-lg border p-4 ${
                  isFocused ? "border-doculaw-400 bg-doculaw-50/50" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate" title={q.title}>
                      {q.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {displayName}
                      {q.discovery_type ? ` · ${q.discovery_type}` : null}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className={
                          q.status === "in_progress"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }
                      >
                        {q.status === "in_progress" ? "In progress" : "Pending"}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {q.completed_questions} of {q.total_questions} answered
                        {q.response_deadline
                          ? ` · Due ${new Date(q.response_deadline).toLocaleDateString()}`
                          : ""}
                      </span>
                    </div>
                    <Progress
                      value={q.total_questions > 0 ? (q.completed_questions / q.total_questions) * 100 : 0}
                      className="h-1.5 mt-3"
                    />
                  </div>
                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openDetails(q)}>
                        View details
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-doculaw-500 hover:bg-doculaw-600"
                        onClick={() => handleViewPrimary(q)}
                      >
                        {onViewInWorkflow ? (
                          "View in workflow"
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open response workflow
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reminderSendingId === q.id}
                        onClick={() => {
                          void sendQuestionnaireReminder(q);
                        }}
                      >
                        {reminderSendingId === q.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Bell className="h-4 w-4 mr-1" />
                        )}
                        Remind
                      </Button>
                    </div>
                  </div>
                </div>

                {q.questions && q.questions.length > 0 && (
                  <Collapsible className="mt-4">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-sm text-doculaw-700 hover:underline w-full text-left"
                      >
                        <ChevronDown className="h-4 w-4" />
                        Preview questions ({q.questions.length})
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-800 max-h-56 overflow-y-auto pl-1 border-t pt-3">
                        {q.questions.map((item) => (
                          <li key={item.id} className="pl-1">
                            <span className="text-gray-700">{item.question}</span>
                          </li>
                        ))}
                      </ol>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>In progress request details</DialogTitle>
            <DialogDescription>
              Questionnaire status and the questions sent to the client.
            </DialogDescription>
          </DialogHeader>
          {detailsQuestionnaire && (
            <div className="space-y-4 text-sm overflow-y-auto pr-1 -mr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-800">
                <div>
                  <p className="text-xs text-gray-500">Client</p>
                  <p className="font-medium">{clientNameFor(detailsQuestionnaire.client_id)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="font-medium capitalize">{detailsQuestionnaire.status.replace("_", " ")}</p>
                </div>
                {detailsQuestionnaire.case_number && (
                  <div>
                    <p className="text-xs text-gray-500">Case number</p>
                    <p className="font-medium">{detailsQuestionnaire.case_number}</p>
                  </div>
                )}
                {detailsQuestionnaire.discovery_type && (
                  <div>
                    <p className="text-xs text-gray-500">Discovery types</p>
                    <p className="font-medium">{detailsQuestionnaire.discovery_type}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Progress</p>
                  <p className="font-medium">
                    {detailsQuestionnaire.completed_questions} of {detailsQuestionnaire.total_questions}{" "}
                    answered
                  </p>
                </div>
                {detailsQuestionnaire.response_deadline && (
                  <div>
                    <p className="text-xs text-gray-500">Response deadline</p>
                    <p className="font-medium">
                      {new Date(detailsQuestionnaire.response_deadline).toLocaleString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="font-medium">
                    {new Date(detailsQuestionnaire.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Title</p>
                <p className="text-gray-900">{detailsQuestionnaire.title}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Questions sent to client</p>
                <ol className="list-decimal list-inside space-y-2 border rounded-md p-3 bg-gray-50 max-h-64 overflow-y-auto">
                  {(detailsQuestionnaire.questions || []).map((item, i) => (
                    <li key={item.id} className="pl-1 text-gray-800">
                      <span className="font-medium text-gray-600 mr-1">{i + 1}.</span>
                      {item.question}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (detailsQuestionnaire) {
                      void sendQuestionnaireReminder(detailsQuestionnaire);
                    }
                  }}
                  disabled={!detailsQuestionnaire || reminderSendingId === detailsQuestionnaire.id}
                >
                  {reminderSendingId === detailsQuestionnaire?.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  Send reminder SMS
                </Button>
                <Button
                  onClick={() => {
                    if (!detailsQuestionnaire) return;
                    handleViewPrimary(detailsQuestionnaire);
                    setDetailsOpen(false);
                  }}
                >
                  {onViewInWorkflow ? "Open in workflow" : "Open discovery response page"}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InProgressClientQuestionnairesPanel;
