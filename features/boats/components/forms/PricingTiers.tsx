"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { FormLabel } from "@/shared/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pricingTierSchema, PricingTierInput } from "@/features/boats/boat.validation";
import { Plus, Edit, Trash, Clock } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { getCurrencySymbol } from "@/shared/lib/constants/currencies";
import { formatCurrency } from "@/shared/lib/utils/general-utils";

interface PricingTiersProps {
  tiers: PricingTierInput[];
  onChange: (tiers: PricingTierInput[]) => void;
  /** ISO 4217 currency code from the parent boat form (e.g. "USD", "EUR"). */
  currency?: string;
}

export function PricingTiers({ tiers = [], onChange, currency = "USD" }: PricingTiersProps) {
  const symbol = getCurrencySymbol(currency);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Form for adding/editing a pricing tier
  const tierForm = useForm<PricingTierInput>({
    resolver: zodResolver(pricingTierSchema),
    defaultValues: {
      hours: 1,
      price: 0,
      name: "",
      description: "",
      isActive: true,
      isDefault: false,
    },
  });

  // Open dialog to add a new tier
  const handleAddTier = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    tierForm.reset({
      hours: 1,
      price: 0,
      name: "",
      description: "",
      isActive: true,
      isDefault: false,
    });
    setEditIndex(null);
    setIsDialogOpen(true);
  };

  // Open dialog to edit an existing tier
  const handleEditTier = (tier: PricingTierInput, index: number, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Prevent event bubbling
    tierForm.reset(tier);
    setEditIndex(index);
    setIsDialogOpen(true);
  };

  // Delete a pricing tier
  const handleDeleteTier = (index: number, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Prevent event bubbling
    const newTiers = [...tiers];
    newTiers.splice(index, 1);
    onChange(newTiers);
  };

  // Save tier from dialog form
  const onSaveTier = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    
    // Validate form data
    tierForm.trigger().then(isValid => {
      if (!isValid) return;
      
      // Get current form values
      const formData = tierForm.getValues();
      
      let newTiers = [...tiers];
      
      // If tier is default, make sure all others are not default
      if (formData.isDefault) {
        newTiers = newTiers.map(tier => ({ ...tier, isDefault: false }));
      }
      
      if (editIndex !== null) {
        // Update existing tier
        newTiers[editIndex] = formData;
      } else {
        // Add new tier
        newTiers.push(formData);
      }
      
      // Apply the changes to parent form
      onChange(newTiers);
      
      // Close dialog
      setIsDialogOpen(false);
    });
  };

  // Generate a friendly name for display if not provided
  const getTierDisplayName = (tier: PricingTierInput) => {
    if (tier.name) return tier.name;
    return `${tier.hours} hour${tier.hours > 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
      <h3 className="text-lg font-medium text-foreground">Pricing Tiers</h3>  
        <Button 
          type="button" 
          onClick={handleAddTier}
          size="sm"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Pricing Tier
        </Button>
      </div>

      {tiers.length === 0 ? (
        <div className="text-center p-6 border border-dashed border-border rounded-xl bg-muted">
          <p className="text-muted-foreground">No pricing tiers added yet</p>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Add tiers to offer different duration options to customers
          </p>
          <Button 
            type="button" 
            onClick={handleAddTier} 
            variant="secondary"
            className="mt-3"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Tier
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tiers.map((tier, index) => (
            <Card key={index} className={`${!tier.isActive ? 'opacity-70' : ''}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium flex items-center">
                        {getTierDisplayName(tier)}
                        {tier.isDefault && (
                          <Badge variant="outline" className="ml-2 border-primary text-primary text-xs">
                            Default
                          </Badge>
                        )}
                        {!tier.isActive && (
                          <Badge variant="outline" className="ml-2 border-muted-foreground text-muted-foreground text-xs">
                            Inactive
                          </Badge>
                        )}
                      </h4>
                      {tier.description && <p className="text-sm text-muted-foreground">{tier.description}</p>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold mr-2 tabular-nums">
                      {formatCurrency(tier.price, currency)}
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => handleEditTier(tier, index, e)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => handleDeleteTier(index, e)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for adding/editing a pricing tier */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editIndex !== null ? "Edit Pricing Tier" : "Add Pricing Tier"}
            </DialogTitle>
            <DialogDescription>
              Define pricing options for different rental durations
            </DialogDescription>
          </DialogHeader>

          {/* Form fields without a Form wrapper */}
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel>Hours <span className="text-red-500">*</span></FormLabel>
                <Input 
                  type="number" 
                  min="1"
                  placeholder="Duration in hours"
                  {...tierForm.register("hours", {
                    setValueAs: (v) => v === "" ? undefined : parseInt(v) || 1
                  })}
                  onBlur={(e) => {
                    // On blur, ensure we have a valid number
                    const value = e.target.value;
                    if (value === "") {
                      tierForm.setValue("hours", 1);
                    }
                  }}
                />
                <p className="text-sm text-muted-foreground">Duration of this rental option</p>
                {tierForm.formState.errors.hours && (
                  <p className="text-sm text-red-500">{tierForm.formState.errors.hours.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <FormLabel>Price ({symbol}) <span className="text-red-500">*</span></FormLabel>
                <Input 
                  type="number"
                  min="0" 
                  step="0.01"
                  placeholder={`Price in ${currency.toUpperCase()}`}
                  {...tierForm.register("price", {
                    setValueAs: (v) => v === "" ? undefined : parseFloat(v) || 0
                  })}
                  onBlur={(e) => {
                    // On blur, ensure we have a valid number
                    const value = e.target.value;
                    if (value === "") {
                      tierForm.setValue("price", 0);
                    }
                  }}
                />
                <p className="text-sm text-muted-foreground">Total price for this duration</p>
                {tierForm.formState.errors.price && (
                  <p className="text-sm text-red-500">{tierForm.formState.errors.price.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <FormLabel>Name</FormLabel>
              <Input 
                placeholder="e.g. Half Day, Full Day, etc."
                {...tierForm.register("name")}
              />
              <p className="text-sm text-muted-foreground">Optional friendly name for this tier</p>
            </div>

            <div className="space-y-2">
              <FormLabel>Description</FormLabel>
              <Textarea 
                placeholder="Optional description"
                {...tierForm.register("description")}
              />
              <p className="text-sm text-muted-foreground">Additional details about this pricing option</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="isActive"
                  checked={tierForm.watch("isActive")}
                  onCheckedChange={(checked) => {
                    tierForm.setValue("isActive", checked === true);
                  }}
                />
                <label 
                  htmlFor="isActive"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Active
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="isDefault"
                  checked={tierForm.watch("isDefault")}
                  onCheckedChange={(checked) => {
                    tierForm.setValue("isDefault", checked === true);
                  }}
                />
                <label 
                  htmlFor="isDefault"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Default Option
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                setIsDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={onSaveTier}
              className="hover:bg-primary/90"
            >
              {editIndex !== null ? "Update" : "Add"} Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 