
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast({
        title: "Login successful",
        description: "Welcome back to DocuLaw",
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex min-h-screen">
        {/* Image/Logo side */}
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
              <a href="#book-demo" className="text-doculaw-600 hover:text-doculaw-500">
                book a demo to get started
              </a>
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

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Button variant="outline" className="w-full">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </Button>
                  <Button variant="outline" className="w-full">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.829 17.55c.217.212.317.473.317.777 0 .305-.1.565-.317.777-.217.213-.48.318-.812.318-.304 0-.552-.105-.764-.318-.212-.212-.317-.472-.317-.777 0-.304.105-.565.317-.777.212-.213.46-.318.764-.318.332 0 .595.106.812.318zM12.5 11.5h-1c0-1 .076-1.64.228-1.942.152-.301.462-.66.928-1.086.467-.426.774-.754.928-.99.154-.238.232-.549.232-.932 0-.433-.153-.782-.457-1.05-.305-.266-.707-.4-1.207-.4-.5 0-.893.126-1.18.375-.285.25-.429.72-.432 1.407h-1.09c.008-.979.307-1.686.898-2.122.591-.436 1.308-.653 2.147-.653.88 0 1.601.216 2.16.648.56.433.839 1.01.839 1.733 0 .558-.19 1.068-.572 1.53-.38.459-.78.863-1.202 1.211-.218.196-.357.341-.421.437-.063.096-.118.2-.162.318-.045.117-.073.27-.084.457-.011.188-.017.485-.017.89zM19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                    </svg>
                    Support
                  </Button>
                </div>
              </div>
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
