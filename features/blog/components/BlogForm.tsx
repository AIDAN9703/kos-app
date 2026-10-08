"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Upload, X, Star, Image as ImageIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { BLOG_CATEGORY_LABELS } from "@/features/blog/blog.constants";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { createBlogPost, updateBlogPost } from "@/features/blog/actions/admin-blog-actions";
import type { BlogPostInput } from "@/features/blog/blog.validation";
import type { BlogDetails } from "@/features/blog/blog.types";
import { useToast } from "@/shared/lib/hooks/use-toast";
import Image from "next/image";

// Validation schema
const blogFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be under 200 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100, "Slug must be under 100 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must only contain lowercase letters, numbers, and hyphens",
    ),
  excerpt: z
    .string()
    .min(1, "Excerpt is required")
    .max(500, "Excerpt must be under 500 characters"),
  content: z.string().min(1, "Content is required"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "SCHEDULED"]),
  category: z.enum([
    "FLEET_NEWS",
    "CONSERVATION",
    "TIPS_ADVICE",
    "CASE_STUDY",
    "COMPANY_NEWS",
    "SAFETY",
    "EVENTS",
  ]),
  author: z
    .string()
    .min(1, "Author is required")
    .max(100, "Author name must be under 100 characters"),
  isFeatured: z.boolean(),
  featuredImage: z.string().optional(),
  imageAlt: z.string().optional(),
  metaTitle: z
    .string()
    .max(60, "Meta title should be under 60 characters")
    .optional(),
  metaDescription: z
    .string()
    .max(160, "Meta description should be under 160 characters")
    .optional(),
  publishedAt: z.string().optional(),
  scheduledFor: z.string().optional(),
});

type BlogFormData = z.infer<typeof blogFormSchema>;

interface BlogFormProps {
  mode: "create" | "edit";
  initialData?: BlogDetails;
}

const categoryOptions = Object.entries(BLOG_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

export default function BlogForm({ mode, initialData }: BlogFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const form = useForm<BlogFormData>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      slug: initialData?.slug || "",
      excerpt: initialData?.excerpt || "",
      content: initialData?.content || "",
      status: initialData?.status || "DRAFT",
      category: initialData?.category || "COMPANY_NEWS",
      author: initialData?.author || "KOS Team",
      isFeatured: initialData?.isFeatured || false,
      featuredImage: initialData?.featuredImage || "",
      imageAlt: initialData?.imageAlt || "",
      metaTitle: initialData?.metaTitle || "",
      metaDescription: initialData?.metaDescription || "",
      publishedAt: initialData?.publishedAt
        ? new Date(initialData.publishedAt).toISOString().slice(0, 16)
        : "",
      scheduledFor: initialData?.scheduledFor
        ? new Date(initialData.scheduledFor).toISOString().slice(0, 16)
        : "",
    },
  });

  const watchedStatus = form.watch("status");

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "blog");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      form.setValue("featuredImage", result.url);

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setImageUploading(false);
    }
  };

  // Handle form submission
  const onSubmit = async (data: BlogFormData) => {
    setIsSubmitting(true);
    try {
      const submitData: BlogPostInput = {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        status: data.status,
        category: data.category,
        author: data.author,
        isFeatured: data.isFeatured,
        featuredImage: data.featuredImage || undefined,
        imageAlt: data.imageAlt || undefined,
        metaTitle: data.metaTitle || undefined,
        metaDescription: data.metaDescription || undefined,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
        scheduledFor: data.scheduledFor
          ? new Date(data.scheduledFor)
          : undefined,
      };

      let result;
      if (mode === "create") {
        result = await createBlogPost(submitData);
      } else {
        result = await updateBlogPost({
          id: initialData!.id,
          ...submitData,
        });
      }

      if (result.success) {
        toast({
          title: "Success",
          description: `Blog post ${mode === "create" ? "created" : "updated"} successfully`,
        });
        router.push("/admin/blog");
      } else {
        throw new Error(result.error);
      }
    } catch {
      toast({
        title: "Error",
        description: `Failed to ${mode} blog post. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-6">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter blog post title..."
                        className="text-lg font-medium"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Slug */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Slug *</FormLabel>
                    <FormControl>
                      <Input placeholder="url-friendy-slug" {...field} />
                    </FormControl>
                    <FormDescription>
                      URL-friendly slug (lowercase letters, numbers, and hyphens
                      only)
                      <br />
                      This will be used in the URL: /news/
                      {field.value || "your-slug-here"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Excerpt */}
              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of the blog post..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This will be shown in blog post previews (
                      {field.value?.length || 0}/500 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Featured Image */}
              <div className="space-y-4">
                <Label>Featured Image</Label>
                <div className="flex items-start space-x-4">
                  {form.watch("featuredImage") ? (
                    <div className="relative">
                      <Image
                        src={form.watch("featuredImage")!}
                        alt="Featured image preview"
                        width={200}
                        height={120}
                        className="rounded-lg object-cover border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2"
                        onClick={() => form.setValue("featuredImage", "")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-48 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          No image selected
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={imageUploading}
                        asChild
                      >
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {imageUploading ? "Uploading..." : "Upload Image"}
                        </span>
                      </Button>
                    </label>

                    {form.watch("featuredImage") && (
                      <FormField
                        control={form.control}
                        name="imageAlt"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Image alt text for accessibility..."
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write your blog post content here... (Rich text editor will be integrated later)"
                        rows={15}
                        className="font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="PUBLISHED">Published</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
                          <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Author */}
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Author *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter author name..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Name of the person who wrote this post
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Featured Post */}
              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center">
                        <Star className="h-4 w-4 mr-2" />
                        Featured Post
                      </FormLabel>
                      <FormDescription>
                        Featured posts appear prominently on the news page
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Publish Date (if published) */}
              {watchedStatus === "PUBLISHED" && (
                <FormField
                  control={form.control}
                  name="publishedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publish Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave empty to use current date/time
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Schedule Date (if scheduled) */}
              {watchedStatus === "SCHEDULED" && (
                <FormField
                  control={form.control}
                  name="scheduledFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule For</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormDescription>
                        When should this post be automatically published?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </TabsContent>

            {/* SEO Tab */}
            <TabsContent value="seo" className="space-y-6">
              <FormField
                control={form.control}
                name="metaTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SEO title for search engines..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Recommended: 50-60 characters ({field.value?.length || 0}
                      /60)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="SEO description for search engines..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Recommended: 150-160 characters (
                      {field.value?.length || 0}/160)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              type="button"
              variant="destructive"
              onClick={() => router.push("/admin/blog")}
            >
              Cancel
            </Button>

            <div className="flex items-center space-x-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting
                  ? `${mode === "create" ? "Creating" : "Updating"}...`
                  : `${mode === "create" ? "Create" : "Update"} Post`}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
