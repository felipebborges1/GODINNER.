"use client";
import { useAppContext } from "./use-app-context";
export const useToast = () => { const { isToastOpen, toastMessage, showToast, hideToast } = useAppContext(); return { isToastOpen, toastMessage, showToast, hideToast }; };
