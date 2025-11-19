// src/components/ui/bottom-sheet.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "./button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./sheet";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function BottomSheet({ 
  open, 
  onOpenChange, 
  title, 
  children, 
  size = "md" 
}: BottomSheetProps) {
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom"
        className={cn(
          "mx-auto rounded-t-2xl rounded-b-none max-h-[90vh] overflow-y-auto",
          sizeClasses[size]
        )}
      >
        <div className="flex flex-col h-full">
          {/* Handle bar */}
          <div className="flex justify-center mb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          {title && (
            <SheetHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-xl font-bold">{title}</SheetTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 touch-manipulation"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </SheetHeader>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}