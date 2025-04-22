
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import BookDemoButton from "../BookDemoButton";

const HeroSection = () => {
  return (
    <div className="relative overflow-hidden bg-white">
      {/* Background elements */}
      <div className="hidden lg:block absolute top-0 right-0 w-1/3 h-full bg-doculaw-50" />
      <div className="hidden lg:block absolute bottom-0 left-0 w-1/4 h-1/3 bg-doculaw-50 rounded-tr-3xl" />
      
      <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-gray-900">
              <span className="text-doculaw-500">Automate</span> Your Legal Discovery Process
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-xl">
              DocuLaw streamlines the discovery workflow for legal professionals, 
              saving you hundreds of hours and eliminating tedious paperwork.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <BookDemoButton size="lg" className="bg-doculaw-500 hover:bg-doculaw-600 text-white rounded-full px-8" />
              <Button 
                variant="outline" 
                size="lg" 
                className="border-doculaw-300 text-doculaw-700 hover:bg-doculaw-50 rounded-full px-8"
                asChild
              >
                <Link to="/login">Log In</Link>
              </Button>
            </div>
            <div className="mt-12">
              <p className="text-sm text-gray-500 mb-4">Trusted by leading law firms:</p>
              <div className="flex flex-wrap gap-6 items-center opacity-70">
                <div className="h-8 w-32 bg-gray-300 rounded animate-pulse" />
                <div className="h-8 w-24 bg-gray-300 rounded animate-pulse" />
                <div className="h-8 w-28 bg-gray-300 rounded animate-pulse" />
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-doculaw-500 h-12 flex items-center px-6">
                <div className="flex space-x-2">
                  <div className="h-3 w-3 rounded-full bg-red-400"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                  <div className="h-3 w-3 rounded-full bg-green-400"></div>
                </div>
              </div>
              <div className="p-6">
                <div className="h-8 w-1/2 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
                  <div className="h-4 w-4/6 bg-gray-200 rounded"></div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="h-24 bg-doculaw-100 rounded-lg"></div>
                  <div className="h-24 bg-doculaw-100 rounded-lg"></div>
                  <div className="h-24 bg-doculaw-100 rounded-lg"></div>
                  <div className="h-24 bg-doculaw-100 rounded-lg"></div>
                </div>
                <div className="mt-6 h-10 w-1/3 bg-doculaw-300 rounded-lg mx-auto"></div>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 h-24 w-24 bg-doculaw-300 rounded-2xl -z-10"></div>
            <div className="absolute -top-6 -left-6 h-24 w-24 bg-doculaw-200 rounded-2xl -z-10"></div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
