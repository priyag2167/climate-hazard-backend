import React from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps): React.ReactElement {
  return (
    <div className="error-banner" role="alert">
      <AlertTriangle size={20} />
      <div>
        <strong>Analysis Could Not Complete</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
