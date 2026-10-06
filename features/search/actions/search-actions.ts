"use server";

import * as searchData from "@/features/search/search.data";

/** Categories with active boats, for the search filter modal. */
export async function getSearchCategories() {
  return searchData.getSearchCategories();
}
