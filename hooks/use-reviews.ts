"use client";
import { useAppContext } from "./use-app-context";
export const useReviews = () => useAppContext().reviews;
