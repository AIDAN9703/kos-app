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
import { parseRoles } from "@/shared/lib/auth/permissions";
import { InfoRow, YesNo } from "./InfoRow";

const SIGN_IN_METHOD_LABELS: Record<string, string> = {
  credential: "Email + password",
  google: "Google",
};

export function AdminUserAccountInfo({ user, signInMethods }: { user: User; signInMethods: string[] }) {
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
          <InfoRow label="Roles">
            <div className="flex flex-wrap gap-1">
              {parseRoles(user.role).map((role) => (
                <Badge key={role} variant="outline" className="text-xs capitalize">
                  {role}
                </Badge>
              ))}
            </div>
          </InfoRow>
          <InfoRow label="Joined" value={formatDate(user.createdAt)} />
          <InfoRow label="Sign-in methods">
            <div className="flex flex-wrap gap-1">
              {signInMethods.length > 0 ? (
                signInMethods.map((method) => (
                  <Badge key={method} variant="outline" className="text-xs">
                    {SIGN_IN_METHOD_LABELS[method] ?? method}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Texted code only</span>
              )}
            </div>
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
