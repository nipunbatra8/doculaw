
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get the redirect path from location state or default to dashboard
  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(email, password);
      toast({
        title: "Login successful",
        description: "Welcome back to DocuLaw",
      });
      navigate(from, { replace: true });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex min-h-screen">
        <div className="hidden lg:flex w-1/2 bg-doculaw-500 justify-center items-center">
          <div className="p-12 max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <img
                src="/lovable-uploads/0be20ac4-7ddb-481d-a2f7-35e04e74334b.png"
                alt="DocuLaw Logo"
                className="h-20 w-auto mx-auto mb-6"
              />
              <h2 className="text-3xl font-bold text-white mb-6">
                Streamlining Legal Discovery
              </h2>
              <p className="text-doculaw-50 text-lg">
                Sign in to access your dashboard and continue automating your discovery process.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Login form side */}
        <div className="flex flex-col justify-center w-full lg:w-1/2 p-8 lg:p-12">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="mb-6 flex justify-center lg:hidden">
              <Link to="/" className="flex items-center">
                <img
                  src="/lovable-uploads/0be20ac4-7ddb-481d-a2f7-35e04e74334b.png"
                  alt="DocuLaw Logo"
                  className="h-12 w-auto"
                />
                <span className="ml-2 font-bold text-doculaw-800 text-xl">DocuLaw</span>
              </Link>
            </div>
            <h2 className="text-center text-3xl font-bold text-gray-800">Sign in to your account</h2>
            <p className="mt-2 text-center text-gray-500">
              Or{" "}
              <Link to="/payment" className="text-doculaw-600 hover:text-doculaw-500">
                buy a subscription to get started
              </Link>
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-6 shadow-sm rounded-lg sm:px-10">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full"
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-sm font-medium text-doculaw-600 hover:text-doculaw-500"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember-me" className="text-sm">
                      Remember me
                    </Label>
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    className="w-full bg-doculaw-500 hover:bg-doculaw-600 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link to="/" className="text-sm text-gray-600 hover:text-doculaw-500">
              &larr; Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
