"use client";

import { useEffect } from "react";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

export function ToastOutlet() {
  const { isToastOpen, toastMessage, hideToast } = useToast();
  useEffect(() => { if (!isToastOpen) return; const timer = window.setTimeout(hideToast, 2400); return () => window.clearTimeout(timer); }, [hideToast, isToastOpen]);
  return <Toast open={isToastOpen} onClose={hideToast} message={toastMessage}/>;
}
