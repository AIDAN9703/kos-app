"use client";

import { useFormContext } from "react-hook-form";
import { List, Eye, Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { boatCategoryEnum } from "@/database/schema";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/shared/components/ui/form";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { TextInput, NumberInput, CheckboxGroup } from "@/features/boats/components/forms/FormHelpers";

export function BasicInfoSection() {
  const form = useFormContext();
  const featured = form.watch("featured");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <List className="h-4 w-4" />
          Listing Details
        </CardTitle>
        <CardDescription>Basic boat information and visibility settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TextInput name="name" label="Boat Name" placeholder="Enter boat name" required />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Category <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-lg">
                    {boatCategoryEnum.enumValues.map((c) => (
                      <SelectItem 
                        key={c} 
                        value={c}
                        className="hover:bg-muted focus:bg-muted"
                      >
                        {c.replace('_',' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TextInput name="displayTitle" label="Display Title" placeholder="Optional display title" />
          <div />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Description</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  value={field.value || ""} 
                  placeholder="Describe your boat's unique features and amenities..." 
                  className="min-h-[120px] resize-none" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Visibility Settings
          </h3>
          <CheckboxGroup 
            fields={[
              { name: 'active', label: 'Active', description: 'Boat is visible and available to guests' },
              { name: 'featured', label: 'Featured', description: 'Show in featured listings and homepage' }
            ]}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          />
        </div>

        {featured && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Star className="h-4 w-4" />
              Featured Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberInput name="featuredOrder" label="Featured Order" placeholder="1 (appears first)" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



