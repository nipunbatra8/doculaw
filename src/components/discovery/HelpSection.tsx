import { HelpCircle, ExternalLink } from "lucide-react";

const HelpSection = () => {
  return (
    <div className="bg-blue-50 p-4 rounded-md mt-8">
      <div className="flex items-start">
        <div className="bg-blue-100 p-2 rounded-full mr-4">
          <HelpCircle className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-medium text-blue-800 mb-1">Discovery Help</h3>
          <p className="text-sm text-blue-700">
            Need assistance with discovery requests? Our platform can help you create proper discovery 
            documents that comply with court rules. For more information, check out our 
            <a href="#" className="text-blue-600 font-medium hover:underline mx-1">
              Discovery Guide
              <ExternalLink className="h-3 w-3 inline ml-1" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpSection; 