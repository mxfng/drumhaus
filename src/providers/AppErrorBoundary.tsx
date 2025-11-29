import { Component } from "react";

import { useToast } from "@/components/ui";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryInnerProps = {
  children: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundaryInner extends Component<
  AppErrorBoundaryInnerProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Uncaught application error:", error, info);

    if (this.props.onError) {
      this.props.onError(error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  const { toast } = useToast();

  return (
    <AppErrorBoundaryInner
      onError={(error) => {
        toast({
          title: "Something went wrong.",
          description: error.message,
          status: "error",
          duration: 8000,
        });
      }}
    >
      {children}
    </AppErrorBoundaryInner>
  );
}
