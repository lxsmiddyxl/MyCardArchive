/**
 * Scanning v2.5 — qualitative visual signals (collector-grade hints, not grading).
 */

export type ScanV25QualBand = "strong" | "likely" | "weak";

export type ScanV25HoloLabel = "Holo" | "Reverse Holo" | "Non-Holo";

export type ScanV25HoloFusion = {
  label: ScanV25HoloLabel;
  confidence_band: ScanV25QualBand;
  fusion: {
    model_weight: number;
    heuristic_weight: number;
    agreement: boolean;
    /** 0–1 specular / highlight density in art region. */
    specular_score?: number;
    /** 0–1 normalized luminance variance spike in center. */
    contrast_spike_score?: number;
    /** 0–1 clustered bright-pixel fraction (reflective proxy). */
    reflective_cluster_score?: number;
    notes?: string;
  };
};

export type ScanV25RarityLabel =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Double Rare"
  | "Ultra Rare"
  | "Illustration Rare"
  | "Special Illustration Rare"
  | "Hyper Rare"
  | "Secret Rare"
  | "Amazing Rare"
  | "Promo"
  | "Unknown";

export type ScanV25RaritySymbolHint = "circle" | "diamond" | "star" | "none" | "unknown";

export type ScanV25RarityFusion = {
  label: ScanV25RarityLabel;
  confidence_band: ScanV25QualBand;
  fusion: {
    catalog_rarity: string | null;
    vision_rarity: string | null;
    symbol_hint: ScanV25RaritySymbolHint;
    symbol_complexity: number;
    catalog_ambiguous: boolean;
    notes?: string;
  };
};

export type ScanV25CenteringLabel = "Well-Centered" | "Slightly Off-Center" | "Off-Center";

export type ScanV25CenteringFusion = {
  label: ScanV25CenteringLabel;
  confidence_band: ScanV25QualBand;
  fusion: {
    left_border_ratio: number;
    right_border_ratio: number;
    top_border_ratio: number;
    bottom_border_ratio: number;
    /** Combined asymmetry 0–1 (higher = more skew). */
    asymmetry_score: number;
    notes?: string;
  };
};

export type ScanV25SurfaceLabel = "Clean Surface" | "Minor Wear" | "Visible Wear";

export type ScanV25SurfaceFusion = {
  label: ScanV25SurfaceLabel;
  confidence_band: ScanV25QualBand;
  fusion: {
    /** Normalized high-frequency energy (full card). */
    gradient_energy: number;
    /** Corner high-frequency proxy (wear). */
    corner_edge_energy: number;
    /** Whitening proxy in outer ring (0–1). */
    whitening_score: number;
    notes?: string;
  };
};

export type ScanV25VisualIntel = {
  holo: ScanV25HoloFusion;
  rarity: ScanV25RarityFusion;
  centering: ScanV25CenteringFusion;
  surface: ScanV25SurfaceFusion;
};

export type ScanV25Pipeline = "scan_v2_5_hybrid" | "scan_v2_5_ocr_fallback";
