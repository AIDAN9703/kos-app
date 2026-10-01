import { Key } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { type User } from "@/database/types";
import { formatDate } from "@/shared/lib/utils/general-utils";
import { InfoRow, YesNo } from "./InfoRow";

export function AdminUserAccountInfo({ user }: { user: User }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="h-4 w-4" />
          Account Information
        </CardTitle>
        <CardDescription>
          Account status, verification, and payment details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <InfoRow label="Status">
            <Badge
              variant={
                user.status === "ACTIVE"
                  ? "default"
                  : user.status === "INACTIVE"
                    ? "secondary"
                    : "destructive"
              }
            >
              {user.status || "Unknown"}
            </Badge>
          </InfoRow>
          <InfoRow label="Admin Access">
            <YesNo value={Boolean(user.isAdmin)} />
          </InfoRow>
          <InfoRow label="Joined" value={formatDate(user.createdAt)} />
          <InfoRow label="Auth Provider">
            <Badge variant="outline" className="text-xs">
              {user.authProvider || "EMAIL"}
            </Badge>
          </InfoRow>
          <InfoRow label="Email Verified">
            <YesNo value={Boolean(user.emailVerified)} />
          </InfoRow>
          <InfoRow label="Phone Verified">
            <YesNo value={Boolean(user.phoneVerified)} />
          </InfoRow>
          <InfoRow label="Identity Verified">
            <YesNo value={Boolean(user.identityVerified)} />
          </InfoRow>
          {user.identityVerificationType && (
            <InfoRow
              label="Identity Verification Type"
              value={user.identityVerificationType}
            />
          )}
        </div>

        {user.stripeCustomerId && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Payment Information
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Stripe and payment details
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow label="Stripe Customer ID">
                <code className="text-xs bg-muted px-2 py-1 rounded text-foreground">
                  {user.stripeCustomerId}
                </code>
              </InfoRow>
              {user.defaultPaymentMethodId && (
                <InfoRow label="Default Payment Method">
                  <code className="text-xs bg-muted px-2 py-1 rounded text-foreground">
                    {user.defaultPaymentMethodId}
                  </code>
                </InfoRow>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
