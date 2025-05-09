import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog,
  DialogContent, 
  DialogDescription, 
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  User, 
  Bell, 
  LogOut,
  AlertTriangle,
  Shield,
  Clock,
  FileText,
  Info
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Define the client interface
interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
}

const ClientSettingsPage = () => {
  const { user, logout, deleteAccount, updateUserMetadata } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [notifications, setNotifications] = useState({
    emailQuestionnaireReminders: true,
    questionnaireUpdates: true,
    caseStatus: true,
    marketing: false,
  });

  const [speechToText, setSpeechToText] = useState(true);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch client data from the database
  useEffect(() => {
    const fetchClientData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Get the client_id from the user metadata
        const clientId = user.user_metadata?.client_id;
        
        if (!clientId) {
          console.error("No client ID found in user metadata");
          return;
        }
        
        // Fetch client data from the 'clients' table
        const { data, error } = await supabase
          .from('clients')
          .select('id, first_name, last_name, email, phone')
          .eq('id', clientId)
          .single();
          
        if (error) {
          console.error("Error fetching client data:", error);
          toast({
            title: "Error",
            description: "Failed to load your profile information.",
            variant: "destructive",
          });
          return;
        }
        
        if (data) {
          setClientData(data);
          
          // Set form data
          setProfileForm({
            name: `${data.first_name} ${data.last_name}`,
            email: data.email,
            phone: data.phone || "",
          });
        }
      } catch (error) {
        console.error("Error in fetchClientData:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchClientData();
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      // Get data from user metadata
      const userData = user.user_metadata || {};
      
      // If client data hasn't been loaded yet, use the metadata
      if (!clientData && userData.name) {
        setProfileForm({
          name: userData.name,
          email: user.email || "",
          phone: userData.phone || "",
        });
      }

      // If speech to text preference exists in user metadata (stored in title), set it
      if (userData.title === "speech-enabled") {
        setSpeechToText(true);
      } else if (userData.title === "speech-disabled") {
        setSpeechToText(false);
      }
    }
  }, [user, clientData]);
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsSubmitting(true);
      await deleteAccount();
      navigate("/login");
      toast({
        title: "Account deleted",
        description: "Your account has been successfully deleted.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete account. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsConfirmDeleteOpen(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      // Update user metadata directly in Supabase Auth
      await updateUserMetadata({
        // Don't update name/phone as those are in the clients table
        title: speechToText ? "speech-enabled" : "speech-disabled",
      });
      
      toast({
        title: "Settings updated",
        description: "Your settings have been successfully updated.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update settings. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
            <TabsTrigger value="profile" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2 text-doculaw-500" />
                      Profile Information
                    </CardTitle>
                    <CardDescription>
                      Your personal information from your client record
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleProfileSubmit}>
                      <div className="mb-6 flex justify-center">
                        <Avatar className="h-24 w-24">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-2xl bg-doculaw-300 text-white">
                            {clientData?.first_name?.[0] || user?.email?.[0] || "C"}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="first-name">First Name</Label>
                            <Input
                              id="first-name"
                              value={clientData?.first_name || ""}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="last-name">Last Name</Label>
                            <Input
                              id="last-name"
                              value={clientData?.last_name || ""}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={profileForm.email}
                            disabled
                            className="bg-gray-50"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={clientData?.phone || ""}
                            disabled
                            className="bg-gray-50"
                          />
                        </div>

                        <div className="mt-4 p-3 border rounded-md bg-amber-50 border-amber-200">
                          <div className="flex items-start">
                            <Info className="h-5 w-5 mr-2 text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-amber-800">
                              Your profile information is managed by your attorney. Please contact them if you need to update your name, email, or phone number.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 mt-4">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="speech-to-text" className="flex-1">
                              <div>Speech-to-text for questionnaires</div>
                              <p className="text-gray-500 text-sm font-normal">Enable voice input when answering questionnaires</p>
                            </Label>
                            <Switch 
                              id="speech-to-text" 
                              checked={speechToText} 
                              onCheckedChange={setSpeechToText} 
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* <div className="mt-6">
                        <Button 
                          type="submit" 
                          className="w-full bg-doculaw-500 hover:bg-doculaw-600"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Saving..." : "Save Settings"}
                        </Button>
                      </div> */}
                    </form>
                  </CardContent>
                </Card>

                {/* <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-red-600">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        Danger Zone
                      </CardTitle>
                      <CardDescription>
                        Permanently delete your account and all data
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => setIsConfirmDeleteOpen(true)}
                      >
                        Delete Account
                      </Button>
                    </CardContent>
                  </Card>
                </div> */}
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2 text-doculaw-500" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Manage how you receive notifications and updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-reminders" className="flex-1">
                        <div>Questionnaire reminders</div>
                        <p className="text-gray-500 text-sm font-normal">Receive email reminders about pending questionnaires</p>
                      </Label>
                      <Switch 
                        id="email-reminders" 
                        checked={notifications.emailQuestionnaireReminders} 
                        onCheckedChange={(value) => handleNotificationChange("emailQuestionnaireReminders", value)} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="questionnaire-updates" className="flex-1">
                        <div>Questionnaire updates</div>
                        <p className="text-gray-500 text-sm font-normal">Notifications when new questionnaires are assigned to you</p>
                      </Label>
                      <Switch 
                        id="questionnaire-updates" 
                        checked={notifications.questionnaireUpdates} 
                        onCheckedChange={(value) => handleNotificationChange("questionnaireUpdates", value)} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="case-status" className="flex-1">
                        <div>Case status updates</div>
                        <p className="text-gray-500 text-sm font-normal">Receive notifications about updates to your case status</p>
                      </Label>
                      <Switch 
                        id="case-status" 
                        checked={notifications.caseStatus} 
                        onCheckedChange={(value) => handleNotificationChange("caseStatus", value)} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="marketing" className="flex-1">
                        <div>Marketing & promotions</div>
                        <p className="text-gray-500 text-sm font-normal">Receive news, updates, and promotional materials</p>
                      </Label>
                      <Switch 
                        id="marketing" 
                        checked={notifications.marketing} 
                        onCheckedChange={(value) => handleNotificationChange("marketing", value)} 
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      className="w-full bg-doculaw-500 hover:bg-doculaw-600"
                    >
                      Save Notification Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All your data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              Please type <span className="font-semibold">DELETE</span> to confirm account deletion:
            </p>
            <Input
              placeholder="Type DELETE to confirm"
              className="border-red-200"
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
};

export default ClientSettingsPage; 