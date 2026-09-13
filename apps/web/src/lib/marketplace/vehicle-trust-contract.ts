export const BODY_PANELS = [
  "front_bumper", "rear_bumper", "hood", "roof", "trunk_lid",
  "front_left_fender", "front_right_fender", "rear_left_fender", "rear_right_fender",
  "front_left_door", "front_right_door", "rear_left_door", "rear_right_door"
] as const;

export const BODY_PANEL_CONDITIONS = ["original", "painted", "replaced"] as const;
export const SELLER_DAMAGE_DECLARATIONS = ["unknown", "no_known_damage", "damage_disclosed"] as const;
export const SELLER_SERVICE_DECLARATIONS = ["unknown", "regular_service_declared", "partial_records_declared", "no_records_declared"] as const;

export type BodyPanel = typeof BODY_PANELS[number];
export type BodyPanelCondition = typeof BODY_PANEL_CONDITIONS[number];
export type SellerDamageDeclaration = typeof SELLER_DAMAGE_DECLARATIONS[number];
export type SellerServiceDeclaration = typeof SELLER_SERVICE_DECLARATIONS[number];

export type SellerBodyPanelDeclaration = {
  panel: BodyPanel;
  condition: BodyPanelCondition;
  seller_evidence_note?: string | null;
};

export function serializeSellerBodyPanels(values: Partial<Record<BodyPanel, BodyPanelCondition | "">>) {
  return BODY_PANELS.flatMap((panel) => {
    const condition = values[panel];
    return condition ? [{ panel, condition }] : [];
  });
}
