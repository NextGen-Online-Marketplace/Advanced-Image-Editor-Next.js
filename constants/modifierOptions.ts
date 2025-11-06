export type ModifierFieldKey =
  | "sq_ft"
  | "sqm"
  | "age_of_home"
  | "year_built"
  | "zip_postal_code"
  | "county"
  | "foundation"
  | "miles_company"
  | "km_company"
  | "miles_inspector"
  | "km_inspector"
  | "vacant_occupied"
  | "utilities_on";

export const MODIFIER_FIELDS: Array<{
  key: ModifierFieldKey;
  label: string;
  supportsType: boolean;
  hasEqualsField: boolean;
  requiresRange: boolean;
  group?: "custom";
}> = [
  { key: "sq_ft", label: "Sq.Ft.", supportsType: true, hasEqualsField: false, requiresRange: false },
  { key: "sqm", label: "Square meters (m2)", supportsType: true, hasEqualsField: false, requiresRange: false },
  { key: "age_of_home", label: "Age of Home", supportsType: false, hasEqualsField: false, requiresRange: true },
  { key: "year_built", label: "Year Built", supportsType: false, hasEqualsField: false, requiresRange: true },
  { key: "zip_postal_code", label: "Zip/Postal Code", supportsType: false, hasEqualsField: true, requiresRange: false },
  { key: "county", label: "County", supportsType: false, hasEqualsField: true, requiresRange: false },
  { key: "foundation", label: "Foundation", supportsType: false, hasEqualsField: true, requiresRange: false },
  { key: "miles_company", label: "Miles away from company address", supportsType: true, hasEqualsField: false, requiresRange: false },
  { key: "km_company", label: "Kilometers away from company address", supportsType: true, hasEqualsField: false, requiresRange: false },
  { key: "miles_inspector", label: "Miles from inspector's home address", supportsType: true, hasEqualsField: false, requiresRange: false },
  { key: "km_inspector", label: "Kilometers from inspector's home address", supportsType: true, hasEqualsField: false, requiresRange: false },
  { key: "vacant_occupied", label: "Vacant or Occupied?", supportsType: false, hasEqualsField: true, requiresRange: false, group: "custom" },
  {
    key: "utilities_on",
    label: "Are all utilities on? If not, there is a return fee for anything that can't be inspected.",
    supportsType: false,
    hasEqualsField: true,
    requiresRange: false,
    group: "custom",
  },
];

export const MODIFIER_TYPES = [
  { key: "range", label: "Range" },
  { key: "per_unit", label: "Per Unit" },
  { key: "per_unit_over", label: "Per Unit Over" },
];

export function fieldSupportsType(field: ModifierFieldKey) {
  return MODIFIER_FIELDS.find((f) => f.key === field)?.supportsType ?? false;
}

export function fieldRequiresRangeInputs(field: ModifierFieldKey) {
  return MODIFIER_FIELDS.find((f) => f.key === field)?.requiresRange ?? false;
}

export function fieldHasEquals(field: ModifierFieldKey) {
  return MODIFIER_FIELDS.find((f) => f.key === field)?.hasEqualsField ?? false;
}


