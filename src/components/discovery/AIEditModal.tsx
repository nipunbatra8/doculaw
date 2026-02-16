import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Sparkles } from 'lucide-react';

interface AIEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (prompt: string) => Promise<void>;
  originalText: string;
  loading?: boolean;
}

export const AIEditModal: React.FC<AIEditModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  originalText,
  loading = false,
}) => {
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setPrompt('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    await onConfirm(prompt.trim());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Edit with AI
          </DialogTitle>
          <DialogDescription>
            Describe how you want the AI to modify the content below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-content">Original Text</Label>
            <div className="max-h-32 overflow-y-auto border rounded-md p-3 bg-muted/50 text-sm">
              {originalText}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-prompt">Your Instructions</Label>
            <Textarea
              id="ai-prompt"
              placeholder="e.g., 'Make this more formal' or 'Rephrase this to be a question'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!prompt.trim() || loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Apply Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

