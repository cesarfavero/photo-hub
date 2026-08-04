"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CheckCircle2Icon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XCircleIcon,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      richColors
      closeButton
      position="top-center"
      offset={16}
      gap={8}
      className="toaster group"
      icons={{
        success: <CheckCircle2Icon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <XCircleIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "toaster-toast rounded-xl shadow-lg",
          title: "text-sm font-semibold",
          description: "text-sm opacity-80",
          closeButton:
            "border-0 bg-transparent text-current/60 hover:bg-foreground/5 hover:text-current",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
