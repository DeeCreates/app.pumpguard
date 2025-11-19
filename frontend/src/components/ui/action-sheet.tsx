// src/components/ui/action-sheet.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./sheet";
import { LucideIcon } from "lucide-react";

export interface Action {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  actions: Action[];
  showCancel?: boolean;
  cancelText?: string;
}

export function ActionSheet({ 
  open, 
  onOpenChange, 
  title = "Actions", 
  description,
  actions,
  showCancel = true,
  cancelText = "Cancel"
}: ActionSheetProps) {
  const handleActionClick = (action: Action) => {
    if (!action.disabled) {
      action.onClick();
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="mx-auto max-w-md rounded-t-2xl rounded-b-none p-0 bg-white"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col p-4">
          {/* Handle bar */}
          <div className="flex justify-center mb-1">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full flex-shrink-0" />
          </div>

          {/* Header */}
          {(title || description) && (
            <SheetHeader className="text-left mb-4 px-1">
              {title && (
                <SheetTitle className="text-lg font-semibold text-gray-900">
                  {title}
                </SheetTitle>
              )}
              {description && (
                <p className="text-sm text-gray-500 mt-1">
                  {description}
                </p>
              )}
            </SheetHeader>
          )}

          {/* Actions List */}
          <div className="space-y-2 mb-4">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant="ghost"
                  onClick={() => handleActionClick(action)}
                  disabled={action.disabled}
                  className={cn(
                    "w-full h-12 justify-start px-4 text-base font-normal rounded-xl",
                    "touch-manipulation active:scale-[0.98] transition-transform",
                    "border border-gray-200 hover:border-gray-300",
                    action.destructive 
                      ? cn(
                          "text-red-600 hover:text-red-700 hover:bg-red-50",
                          "border-red-100 hover:border-red-200",
                          action.disabled && "text-red-300 hover:text-red-300 hover:bg-transparent"
                        )
                      : cn(
                          "text-gray-700 hover:text-gray-900 hover:bg-gray-50",
                          action.disabled && "text-gray-400 hover:text-gray-400 hover:bg-transparent"
                        )
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 mr-3 flex-shrink-0",
                    action.disabled && "opacity-50"
                  )} />
                  <span className="flex-1 text-left">{action.label}</span>
                  {action.disabled && (
                    <span className="text-xs text-gray-400 ml-2">Disabled</span>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Cancel button */}
          {showCancel && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-12 text-base font-medium rounded-xl touch-manipulation active:scale-[0.98] border-gray-300 hover:bg-gray-50"
            >
              {cancelText}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}