import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sparkles } from 'lucide-react';

interface CompareAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limit: number;
}

export const CompareAlertModal: React.FC<CompareAlertModalProps> = ({ 
  open, 
  onOpenChange,
  limit 
}) => {
  const handleUpgrade = () => {
    // TODO: Navigate to upgrade/pricing page
    console.log('Navigate to upgrade page');
    onOpenChange(false);
    // You can add navigation logic here
    // Example: window.location.href = '/pricing';
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <AlertDialogTitle>Comparison Limit Reached</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            You've reached the free comparison limit of <span className="font-semibold">{limit} models</span>. 
            Upgrade your plan to compare more models side-by-side and unlock additional features.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4 space-y-2 bg-muted/50 rounded-lg px-4">
          <p className="text-sm font-medium">Upgrade to Pro and get:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Compare up to 5 models simultaneously
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Advanced model analytics
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Priority support
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Unlimited conversations
            </li>
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleUpgrade}>
            Upgrade Plan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
