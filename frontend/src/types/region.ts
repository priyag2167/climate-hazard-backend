export interface BoundingBox {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
}

export interface Region {
  id: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  bounding_box?: BoundingBox;
}

export type RegionSelectionType = "preset" | "custom" | "box";
