

interface UsePaginationProps {
  currentPage: number;
  totalPages: number;
}

interface UsePaginationReturn {
  pages: number[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Custom hook to calculate pagination range
 * @param currentPage Current active page
 * @param totalPages Total number of pages
 * @returns Array of page numbers and ellipsis to display
 */
export function usePagination({
  currentPage,
  totalPages,
}: UsePaginationProps): UsePaginationReturn {
  // Generate array of page numbers
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  // Calculate if we have next/previous pages
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return {
    pages,
    hasNextPage,
    hasPreviousPage,
  };
} 