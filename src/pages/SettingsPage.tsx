import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  User, 
  Lock, 
  Users, 
  CreditCard, 
  Bell, 
  Mail,
  Briefcase,
  PlusCircle,
  Key,
  LogOut,
  Settings,
  Edit,
  Trash2,
  MoreHorizontal,
  UserPlus,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

const teamMembers = [
  { id: "1", name: "John Doe", email: "john.doe@example.com", role: "Admin", status: "Active", joinedDate: "Jan 2023" },
  { id: "2", name: "Jane Smith", email: "jane.smith@example.com", role: "Attorney", status: "Active", joinedDate: "Mar 2023" },
  { id: "3", name: "Robert Johnson", email: "robert.j@example.com", role: "Paralegal", status: "Active", joinedDate: "Apr 2023" },
  { id: "4", name: "Sarah Williams", email: "s.williams@example.com", role: "Attorney", status: "Pending", joinedDate: "Invited" },
];

const billingHistory = [
  { id: "1", date: "Aug 1, 2023", amount: "$299.00", status: "Paid", plan: "Professional" },
  { id: "2", date: "Jul 1, 2023", amount: "$299.00", status: "Paid", plan: "Professional" },
  { id: "3", date: "Jun 1, 2023", amount: "$299.00", status: "Paid", plan: "Professional" },
  { id: "4", date: "May 1, 2023", amount: "$99.00", status: "Paid", plan: "Starter" },
];

const SettingsPage = () => {
  const { user, profile, logout, deleteAccount, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    title: "",
  });
  
  const [notifications, setNotifications] = useState({
    emailDigest: true,
    caseUpdates: true,
    clientActivity: true,
    teamChanges: false,
    marketing: false,
  });

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || "",
        email: user?.email || "",
        phone: profile.phone || "",
        title: profile.title || "",
      });
    }
  }, [profile, user]);
  
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
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
      await updateProfile({
        name: profileForm.name,
        phone: profileForm.phone,
        title: profileForm.title,
      });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
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

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    // In real app, this would send an invitation
    console.log("Invitation sent");
    setInviteDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account, team, and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
            <TabsTrigger value="profile" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Billing</span>
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
                      Update your personal information and profile settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleProfileSubmit}>
                      <div className="space-y-4">
                        <div className="flex justify-center mb-4">
                          <div className="relative">
                            <Avatar className="h-24 w-24">
                              <AvatarImage src="" />
                              <AvatarFallback className="bg-doculaw-200 text-doculaw-700 text-2xl">
                                {profileForm.name?.charAt(0) || user?.email?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <Button 
                              size="icon" 
                              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-doculaw-500 hover:bg-doculaw-600"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Change avatar</span>
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="name">Full Name</Label>
                            <Input 
                              id="name" 
                              value={profileForm.name}
                              onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="title">Job Title</Label>
                            <Input 
                              id="title" 
                              value={profileForm.title}
                              onChange={(e) => setProfileForm({...profileForm, title: e.target.value})}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="email">Email Address</Label>
                          <Input 
                            id="email" 
                            type="email"
                            value={profileForm.email}
                            readOnly
                            className="bg-gray-100"
                          />
                          <p className="text-xs text-gray-500 mt-1">Email can't be changed. Contact support for assistance.</p>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input 
                            id="phone" 
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <Button 
                          type="submit" 
                          className="bg-doculaw-500 hover:bg-doculaw-600"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600 flex items-center">
                        <LogOut className="h-5 w-5 mr-2" />
                        Account Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button 
                        variant="outline" 
                        className="w-full border-red-200 text-red-600 hover:bg-red-50"
                        onClick={handleLogout}
                      >
                        Sign Out of Account
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setIsConfirmDeleteOpen(true)}
                      >
                        Delete Account
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2 text-doculaw-500" />
                      Team Members
                    </CardTitle>
                    <CardDescription>
                      Manage your firm's attorneys, paralegals, and staff
                    </CardDescription>
                  </div>
                  <Button 
                    className="bg-doculaw-500 hover:bg-doculaw-600"
                    onClick={() => setInviteDialogOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="hidden md:table-cell">Joined</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-3">
                                <AvatarFallback className="bg-doculaw-200 text-doculaw-700">
                                  {member.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{member.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{member.email}</TableCell>
                          <TableCell>{member.role}</TableCell>
                          <TableCell className="hidden md:table-cell">{member.joinedDate}</TableCell>
                          <TableCell>
                            <Badge variant={member.status === "Active" ? "default" : "secondary"}>
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Member Actions</DropdownMenuLabel>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Key className="h-4 w-4 mr-2" />
                                  Change Role
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Resend Invitation
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="h-5 w-5 mr-2 text-doculaw-500" />
                      Current Plan
                    </CardTitle>
                    <CardDescription>
                      Manage your subscription and billing information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">Professional Plan</h3>
                        <Badge>Current</Badge>
                      </div>
                      <p className="text-3xl font-bold mt-2">$299<span className="text-sm font-normal text-gray-500">/month</span></p>
                      <p className="text-gray-500 mt-1">Billed monthly on August 15</p>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <h4 className="font-medium">Plan Features:</h4>
                      <ul className="space-y-1 text-gray-700">
                        <li className="flex items-center">
                          <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Unlimited active cases
                        </li>
                        <li className="flex items-center">
                          <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Advanced discovery automation
                        </li>
                        <li className="flex items-center">
                          <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Client portal with custom branding
                        </li>
                        <li className="flex items-center">
                          <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Priority support
                        </li>
                        <li className="flex items-center">
                          <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          50GB document storage
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-2 items-start">
                    <Button className="bg-doculaw-500 hover:bg-doculaw-600">
                      Change Plan
                    </Button>
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                      Cancel Subscription
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="h-5 w-5 mr-2 text-doculaw-500" />
                      Payment Methods
                    </CardTitle>
                    <CardDescription>
                      Manage your payment information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="h-8 w-12 bg-blue-100 rounded flex items-center justify-center text-blue-700 font-bold mr-3">
                            VISA
                          </div>
                          <div>
                            <p className="font-medium">Visa ending in 4242</p>
                            <p className="text-sm text-gray-500">Expires 09/2025</p>
                          </div>
                        </div>
                        <Badge>Default</Badge>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </CardContent>
                  
                  <CardHeader className="pt-6">
                    <CardTitle className="flex items-center">
                      <Briefcase className="h-5 w-5 mr-2 text-doculaw-500" />
                      Billing History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {billingHistory.map((invoice) => (
                        <div key={invoice.id} className="flex justify-between items-center p-3 border-b last:border-0">
                          <div>
                            <p className="font-medium">{invoice.date}</p>
                            <p className="text-sm text-gray-500">{invoice.plan} Plan</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{invoice.amount}</p>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {invoice.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
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
                    Choose what notifications you'd like to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Email Notifications</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email-digest">Daily Email Digest</Label>
                        <p className="text-sm text-gray-500">
                          Receive a daily summary of activity
                        </p>
                      </div>
                      <Switch 
                        id="email-digest" 
                        checked={notifications.emailDigest}
                        onCheckedChange={(checked) => handleNotificationChange('emailDigest', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="case-updates">Case Updates</Label>
                        <p className="text-sm text-gray-500">
                          Notifications about case activity and deadlines
                        </p>
                      </div>
                      <Switch 
                        id="case-updates" 
                        checked={notifications.caseUpdates}
                        onCheckedChange={(checked) => handleNotificationChange('caseUpdates', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="client-activity">Client Activity</Label>
                        <p className="text-sm text-gray-500">
                          Alerts when clients respond to questionnaires
                        </p>
                      </div>
                      <Switch 
                        id="client-activity" 
                        checked={notifications.clientActivity}
                        onCheckedChange={(checked) => handleNotificationChange('clientActivity', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="team-changes">Team Changes</Label>
                        <p className="text-sm text-gray-500">
                          Notifications about team member changes
                        </p>
                      </div>
                      <Switch 
                        id="team-changes" 
                        checked={notifications.teamChanges}
                        onCheckedChange={(checked) => handleNotificationChange('teamChanges', checked)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Marketing Communications</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="marketing">Marketing Emails</Label>
                        <p className="text-sm text-gray-500">
                          Receive product updates and promotional offers
                        </p>
                      </div>
                      <Switch 
                        id="marketing" 
                        checked={notifications.marketing}
                        onCheckedChange={(checked) => handleNotificationChange('marketing', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="bg-doculaw-500 hover:bg-doculaw-600">
                    Save Preferences
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Invite Team Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new team member to your firm.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleInviteMember}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="attorney">Attorney</option>
                  <option value="paralegal">Paralegal</option>
                  <option value="admin">Administrator</option>
                  <option value="staff">Support Staff</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invite-message">Personal Message (Optional)</Label>
                <Textarea
                  id="invite-message"
                  placeholder="Add a personal note to your invitation..."
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-doculaw-500 hover:bg-doculaw-600">
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        {selectedMember && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Remove Team Member
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {selectedMember.name} from your team? They will lose access to all cases and data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                className="sm:flex-1"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                className="sm:flex-1"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Remove Member
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Account Deletion Confirmation Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="sm:flex-1"
              onClick={() => setIsConfirmDeleteOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="sm:flex-1"
              onClick={handleDeleteAccount}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SettingsPage;
