
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BookDemoButton from "../BookDemoButton";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white shadow-md py-2" 
          : "bg-transparent py-4"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/lovable-uploads/0be20ac4-7ddb-481d-a2f7-35e04e74334b.png" alt="DocuLaw Logo" className="h-10 w-auto" />
            <span className="ml-2 font-bold text-doculaw-800 text-xl">DocuLaw</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-700 hover:text-doculaw-600 font-medium">Features</a>
            <a href="#pricing" className="text-gray-700 hover:text-doculaw-600 font-medium">Pricing</a>
            <a href="#testimonials" className="text-gray-700 hover:text-doculaw-600 font-medium">Testimonials</a>
          </nav>
          
          {/* Auth buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button 
              variant="ghost"
              className="text-doculaw-700 hover:text-doculaw-900 hover:bg-doculaw-50"
              asChild
            >
              <Link to="/login">Log In</Link>
            </Button>
            <BookDemoButton />
          </div>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden flex items-center" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-700" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
              <a 
                href="#features" 
                className="py-2 text-gray-700 font-medium border-b border-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a 
                href="#pricing" 
                className="py-2 text-gray-700 font-medium border-b border-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <a 
                href="#testimonials" 
                className="py-2 text-gray-700 font-medium border-b border-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Testimonials
              </a>
              <a 
                href="#book-demo" 
                className="py-2 text-gray-700 font-medium border-b border-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </a>
              <div className="flex flex-col space-y-2 pt-2">
                <Button 
                  variant="outline"
                  className="w-full border-doculaw-300 text-doculaw-700"
                  asChild
                >
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
                </Button>
                <Button 
                  className="w-full bg-doculaw-500 hover:bg-doculaw-600 text-white"
                  asChild
                >
                  <a href="#book-demo" onClick={() => setMobileMenuOpen(false)}>Book a Demo</a>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
