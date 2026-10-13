/** A make and its models, as the make and model pickers list them. */
export interface CatalogMake {
  id: string;
  name: string;
  models: CatalogModel[];
}

export interface CatalogModel {
  id: string;
  name: string;
}
