import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Clock, ChevronLeft } from "lucide-react";

export default function ExpiredLinkPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex min-h-screen">
        {/* Brand and content */}
        <div className="w-full max-w-3xl mx-auto flex flex-col justify-center p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <img
                src="/lovable-uploads/0be20ac4-7ddb-481d-a2f7-35e04e74334b.png"
                alt="DocuLaw Logo"
                className="h-16 w-auto mx-auto mb-6"
              />
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-8 rounded-lg shadow-sm text-center"
          >
            <Clock className="h-16 w-16 text-doculaw-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Link Expired</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              The sign-in link you used has expired or is no longer valid. 
              Please request a new link to access your account.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                className="bg-doculaw-500 hover:bg-doculaw-600 text-white"
              >
                <Link to="/client-login">Client Sign In</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-doculaw-500 text-doculaw-500 hover:bg-doculaw-50"
              >
                <Link to="/login">Lawyer Sign In</Link>
              </Button>
            </div>
          </motion.div>

          <div className="mt-8 text-center">
            <Link
              to="/"
              className="text-doculaw-600 flex items-center justify-center hover:underline"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 