import { User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { type User as UserType } from "@/database/types";
import { formatDate } from "@/shared/lib/utils/general-utils";
import { InfoRow } from "./InfoRow";

export function AdminUserPersonalInfo({ user }: { user: UserType }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-4 w-4" />
          Personal Information
        </CardTitle>
        <CardDescription>Basic profile details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <InfoRow
            label="Full Name"
            value={
              user.firstName || user.lastName
                ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                : "Not set"
            }
          />
          <InfoRow label="Username" value={user.username} />
          {user.birthday && (
            <InfoRow label="Birthday" value={formatDate(user.birthday)} />
          )}
          <InfoRow label="Email">
            <a
              href={`mailto:${user.email}`}
              className="text-sm font-medium text-primary-strong hover:text-primary-strong/80 transition-colors"
            >
              {user.email}
            </a>
          </InfoRow>
          {user.phoneNumber && (
            <InfoRow label="Phone">
              <a
                href={`tel:${user.phoneNumber}`}
                className="text-sm font-medium text-primary-strong hover:text-primary-strong/80 transition-colors"
              >
                {user.phoneNumber}
              </a>
            </InfoRow>
          )}
          {(user.address ||
            user.city ||
            user.state ||
            user.postalCode ||
            user.country) && (
            <InfoRow
              label="Address"
              value={[
                user.address,
                user.city,
                user.state,
                user.postalCode,
                user.country,
              ]
                .filter(Boolean)
                .join(", ")}
            />
          )}
        </div>
        {user.bio && (
          <div className="space-y-1 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Bio
            </p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {user.bio}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
