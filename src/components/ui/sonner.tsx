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
      position="top-center"
      offset={16}
      gap={8}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "toaster-toast",
          title: "toaster-title",
          description: "toaster-description",
        },
      }}
      icons={{
        success: <CheckCircle2Icon className="size-4 text-emerald-600" />,
        info: <InfoIcon className="size-4 text-sky-600" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-600" />,
        error: <XCircleIcon className="size-4 text-red-600" />,
        loading: <Loader2Icon className="size-4 animate-spin text-foreground" />,
      }}
      {...props}
    />
  );
};

export { Toaster };
