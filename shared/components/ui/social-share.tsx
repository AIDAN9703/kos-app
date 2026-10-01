"use client";

import { Button } from "@/shared/components/ui/button";
import { Share2, Facebook, Twitter } from "lucide-react";
import { useToast } from "@/shared/lib/hooks/use-toast";

interface SocialShareProps {
  title: string;
  url?: string;
}

export default function SocialShare({ title, url }: SocialShareProps) {
  const { toast } = useToast();

  // Use current URL if not provided
  const shareUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, "_blank", "width=600,height=400");
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank", "width=600,height=400");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard.",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="border-t border-gray-200 pt-8 mb-12">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Share this post
      </h3>
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" onClick={handleFacebookShare}>
          <Facebook className="h-4 w-4 mr-2" />
          Facebook
        </Button>
        <Button variant="outline" size="sm" onClick={handleTwitterShare}>
          <Twitter className="h-4 w-4 mr-2" />
          Twitter
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          <Share2 className="h-4 w-4 mr-2" />
          Copy Link
        </Button>
      </div>
    </div>
  );
}
