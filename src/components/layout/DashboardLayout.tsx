import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Briefcase, Users, Settings, Archive, LayoutDashboard, LogOut, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toast } = useToast();
  
  // Get user metadata
  const userData = user?.user_metadata || {};
  const userName = userData.name || "User";

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

  const navigation = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Clients", path: "/clients", icon: Users },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white z-40 flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <img src="/lovable-uploads/0be20ac4-7ddb-481d-a2f7-35e04e74334b.png" alt="DocuLaw Logo" className="h-8 w-auto" />
          <span className="ml-2 font-bold text-doculaw-800">DocuLaw</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-gray-500"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white shadow-lg transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:block flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Sidebar header (logo and collapse button) */}
        <div className={cn("flex items-center border-b border-gray-200 p-4", sidebarCollapsed ? "justify-center flex-col gap-2" : "justify-between")}> 
          <img src="/lovable-uploads/0be20ac4-7ddb-481d-a2f7-35e04e74334b.png" alt="DocuLaw Logo" className={cn("h-8 w-auto", sidebarCollapsed ? "mx-auto" : "")} />
          {!sidebarCollapsed && <span className="ml-2 font-bold text-doculaw-800 text-xl">DocuLaw</span>}
          <button
            className="ml-auto hidden lg:block p-1 rounded hover:bg-gray-100"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label="Collapse sidebar"
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
        {/* User info (hide when collapsed) */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src="" />
                <AvatarFallback className="bg-doculaw-300 text-white">
                  {userName.charAt(0) || user?.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{userName}</p>
                <p className="text-xs text-gray-500">{user?.email || "user@example.com"}</p>
              </div>
            </div>
          </div>
        )}
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                    location.pathname === item.path
                      ? "bg-doculaw-100 text-doculaw-700"
                      : "text-gray-700 hover:bg-gray-100",
                    sidebarCollapsed ? "justify-center px-0" : ""
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {!sidebarCollapsed && <span className="ml-3">{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* Logout button (hide when collapsed) */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-gray-200">
            <Button 
              variant="ghost" 
              className="w-full flex items-center justify-start text-gray-700 hover:bg-gray-100 px-4 py-3"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </Button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-screen pt-16 lg:pt-0 transition-all duration-300 ease-in-out">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
