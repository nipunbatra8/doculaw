import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CalendlyEmbed from "@/components/CalendlyEmbed";

interface BookDemoButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
}

const BookDemoButton = ({
  className = "bg-doculaw-500 hover:bg-doculaw-600",
  variant = "default",
  size = "default",
  children = "Book a Demo"
}: BookDemoButtonProps) => {
  const [isCalendlyOpen, setIsCalendlyOpen] = useState(false);

  return (
    <>
      <Button 
        className={className}
        variant={variant}
        size={size}
        onClick={() => setIsCalendlyOpen(true)}
      >
        {children}
      </Button>

      {/* Calendly Dialog */}
      <Dialog open={isCalendlyOpen} onOpenChange={setIsCalendlyOpen}>
        <DialogContent className="max-w-3xl h-[700px] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Book a Demo</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <CalendlyEmbed url="https://calendly.com/nipunbatra8/30min?hide_gdpr_banner=1&background_color=F3F4F6&text_color=000000&primary_color=5bb5a2" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BookDemoButton; 