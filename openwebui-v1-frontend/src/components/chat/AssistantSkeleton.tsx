import React from "react";

// Simple animated skeleton placeholder for assistant's first streaming reply
export const AssistantSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-3xl animate-pulse space-y-3 select-none">
      <div className="h-4 bg-muted rounded w-5/6" />
      <div className="h-4 bg-muted rounded w-4/6" />
      <div className="h-4 bg-muted rounded w-3/6" />
    </div>
  );
};

export default AssistantSkeleton;
