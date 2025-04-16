
import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Briefcase, Users, Settings, Archive, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navigation = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Cases", path: "/cases", icon: Briefcase },
    { name: "Clients", path: "/clients", icon: Users },
    { name: "Archive", path: "/archive", icon: Archive },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
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
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:block",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-center p-4 border-b border-gray-200">
            <img src="/lovable-uploads/0be20ac4-7ddb-481d-a2f7-35e04e74334b.png" alt="DocuLaw Logo" className="h-8 w-auto" />
            <span className="ml-2 font-bold text-doculaw-800 text-xl">DocuLaw</span>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src="" />
                <AvatarFallback className="bg-doculaw-300 text-white">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{user?.name || "User Name"}</p>
                <p className="text-xs text-gray-500">{user?.email || "user@example.com"}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm font-medium rounded-lg",
                      location.pathname === item.path
                        ? "bg-doculaw-100 text-doculaw-700"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout button */}
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
        </div>
      </div>

      {/* Main content */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        "lg:ml-64 flex-1 min-h-screen pt-16 lg:pt-0"
      )}>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
