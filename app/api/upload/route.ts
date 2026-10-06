import { NextResponse } from 'next/server';
import { getSession } from '@/shared/lib/utils/auth-utils';
import { getImageKit } from '@/shared/lib/services/imagekit-server';

type UploadType = 'profile' | 'boat' | 'misc' | 'blog';

export async function POST(request: Request) {
  try {
    // Check authentication (non-interactive API safe)
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as UploadType;
    const entityId = formData.get('entityId') as string;
    const entityName = formData.get('entityName') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size should be less than 10MB' }, { status: 400 });
    }

    // Convert file to buffer
    // Convert to a Buffer once
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Determine folder path based on type and entity
    let folder = '';
    const tags: string[] = [type];

    switch (type) {
      case 'profile':
        folder = `/users/${session.user.id}/profile`;
        tags.push(`user_${session.user.id}`);
        break;
      case 'boat':
        // Boat and blog assets are managed through the admin UI only.
        if (!session.user.isAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        if (!entityId || !entityName) {
          return NextResponse.json({ error: 'Boat ID and name are required for boat images' }, { status: 400 });
        }
        // Create a URL-friendly version of the boat name
        const safeBoatName = entityName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        folder = `/boats/${entityId}-${safeBoatName}`;
        tags.push(`boat_${entityId}`);
        break;
      case 'misc':
        folder = `/misc/${session.user.id}`;
        tags.push(`user_${session.user.id}`);
        break;
      case 'blog':
        if (!session.user.isAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        folder = `/blog/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        tags.push('blog_content');
        tags.push(`user_${session.user.id}`);
        break;
      default:
        return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }
    
    // Upload to ImageKit with sane defaults (auto format/quality on CDN side)
    const result = await getImageKit().upload({
      file: buffer,
      fileName: `${type}_${Date.now()}.${file.name.split('.').pop()}`,
      folder,
      useUniqueFileName: true,
      tags,
      responseFields: ['tags', 'metadata']
    });
    
    // Normalize URL endpoint if needed (support multiple endpoints)
    return NextResponse.json({
      url: result.url,
      fileId: result.fileId,
      thumbnailUrl: result.thumbnailUrl,
      tags: result.tags,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
} 