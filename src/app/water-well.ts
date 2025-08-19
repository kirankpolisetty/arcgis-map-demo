export interface WaterWell {
  rigId: string;
  location: string;
  classification: string; // e.g., "green", "red"
  lat: number; // Original latitude
  lng: number; // Original longitude
  latPos: number; // Offset latitude (-5 to 5)
  lngPos: number;
}
