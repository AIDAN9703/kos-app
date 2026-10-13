"use client";

import { Ruler } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { NumberInput } from "@/features/boats/components/forms/FormHelpers";
import { MakePicker, ModelPicker } from "@/features/boat-catalog/components/CatalogPicker";
import type { CatalogMake } from "@/features/boat-catalog/boat-catalog.types";

export function SpecsSection({ catalog }: { catalog: CatalogMake[] }) {
  const form = useFormContext();
  const make = useWatch({ control: form.control, name: "make" }) ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Ruler className="h-4 w-4" />
          Specs
        </CardTitle>
        <CardDescription>Boat dimensions and capacity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="make"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Make</FormLabel>
                <FormControl>
                  <MakePicker
                    mode="add"
                    catalog={catalog}
                    value={field.value ?? ""}
                    onChange={(next) => {
                      // A new make starts its model over.
                      if (next !== field.value) form.setValue("model", "", { shouldDirty: true });
                      field.onChange(next);
                    }}
                    className="h-11 rounded-lg"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Model</FormLabel>
                <FormControl>
                  <ModelPicker
                    mode="add"
                    catalog={catalog}
                    make={make}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    className="h-11 rounded-lg"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <NumberInput name="yearBuilt" label="Year Built" placeholder="e.g., 2020" />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <NumberInput name="lengthFt" label="Length (ft)" placeholder="e.g., 24" required />
            <NumberInput name="capacity" label="Capacity" placeholder="e.g., 12" required />
            <NumberInput name="bathrooms" label="Bathrooms" placeholder="e.g., 1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
