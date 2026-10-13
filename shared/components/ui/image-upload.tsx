"use client";

import { useState, useRef } from "react";
import { Button, type ButtonProps } from "@/shared/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/shared/lib/hooks/use-toast";

interface ImageUploadProps {
  onUploadComplete: (imageUrl: string) => void;
  type: "profile" | "boat" | "misc";
  entityId?: string;
  entityName?: string;
  buttonText?: string;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: "default" | "sm" | "lg" | "icon";
  icon?: boolean;
  multiple?: boolean;
}

export function ImageUpload({
  onUploadComplete,
  type,
  entityId,
  entityName,
  buttonText = "Upload Image",
  className = "",
  variant = "secondary",
  size = "sm",
  icon = true,
  multiple = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate file types
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select only image files (JPEG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image size should be less than 10MB",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate required fields for boat uploads
    if (type === "boat" && (!entityId || !entityName)) {
      toast({
        title: "Missing information",
        description: "Boat ID and name are required for boat image uploads",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Upload files sequentially
      for (const file of Array.from(files)) {
        // Create form data
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        // Add entity information if provided
        if (entityId) formData.append("entityId", entityId);
        if (entityName) formData.append("entityName", entityName);

        // Upload to your API route
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const result = await response.json();

        // Call the callback with the image URL
        onUploadComplete(result.url);
      }

      toast({
        title: "Upload successful",
        description: `Successfully uploaded ${files.length} image${files.length > 1 ? "s" : ""}`,
      });
    } catch (error) {
      console.error("Error uploading images:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Determine if this is an icon-only button
  const isIconOnly = size === "icon" && !buttonText;

  // Handle button click - prevent default to avoid form submission
  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Stop event propagation
    fileInputRef.current?.click();
  };

  return (
    <div>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleButtonClick}
        disabled={isUploading}
        type="button" // Explicitly set type to button to prevent form submission
      >
        {isUploading ? (
          <>
            <Loader2
              className={`h-4 w-4 ${!isIconOnly ? "mr-2" : ""} animate-spin`}
            />
            {!isIconOnly && "Uploading..."}
          </>
        ) : (
          <>
            {icon && (
              <Camera className={`h-4 w-4 ${!isIconOnly ? "mr-2" : ""}`} />
            )}
            {buttonText}
          </>
        )}
      </Button>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        ref={fileInputRef}
        multiple={multiple}
      />
    </div>
  );
}
