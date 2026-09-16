"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { ImageUpload } from "@/shared/components/ui/image-upload";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { DefaultUserAvatarFallback } from "@/shared/lib/utils/user-utils";
import { updateAccountDetails } from "../../actions/account.actions";

/** Upload / remove the account photo. Uploads go to ImageKit under the user's own folder. */
export function ProfilePhotoField({ imageUrl }: { imageUrl: string | null }) {
  const { toast } = useToast();
  const [removing, setRemoving] = useState(false);

  const setImage = async (url: string | "") => {
    const result = await updateAccountDetails({ profileImage: url });
    if (!result.success) {
      toast({ title: "Couldn't update photo", description: result.error, variant: "destructive" });
    }
    return result.success;
  };

  const remove = async () => {
    setRemoving(true);
    const ok = await setImage("");
    setRemoving(false);
    if (ok) toast({ title: "Photo removed" });
  };

  return (
    <div className="flex items-center gap-5">
      <Avatar className="h-20 w-20 border border-gray-200">
        <AvatarImage src={imageUrl || undefined} alt="" />
        <DefaultUserAvatarFallback size="lg" />
      </Avatar>
      <div className="flex flex-wrap items-center gap-2">
        <ImageUpload
          type="profile"
          variant="outline"
          buttonText={imageUrl ? "Change photo" : "Upload photo"}
          onUploadComplete={(url) => void setImage(url)}
        />
        {imageUrl ? (
          <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={removing}>
            {removing ? <Loader2 className="animate-spin" /> : null}
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
