'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { ADMIN_NAV_ITEMS } from '@/shared/lib/constants/navigation-data';
import { isUuid } from '@/shared/lib/utils/general-utils';

type BreadcrumbItem = {
  title: string;
  link: string;
};

function titleFromSegment(segment: string) {
  // A record id (a person, boat or booking) reads as "Details", not a uuid.
  if (isUuid(segment)) return 'Details';
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/admin': [{ title: 'Dashboard', link: '/admin' }]
};

const navLabelByPath = new Map(
  ADMIN_NAV_ITEMS.map((item) => [item.href, item.label])
);

export function useBreadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }

    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      const label = navLabelByPath.get(path) ?? titleFromSegment(segment);
      return {
        title: label,
        link: path
      };
    });
  }, [pathname]);

  return breadcrumbs;
}

