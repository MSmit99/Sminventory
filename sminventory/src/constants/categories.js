// Default (locked) categories and locations — always present, cannot be removed by households
export const DEFAULT_CATEGORIES = ["Dairy", "Produce", "Meat", "Frozen", "Beverages", "Leftovers", "Pantry", "Other"];
export const DEFAULT_LOCATIONS  = ["Fridge", "Freezer", "Pantry", "Counter"];

// Legacy full lists used when no household customisation is set
export const CATEGORIES = ["All", ...DEFAULT_CATEGORIES];
export const LOCATIONS  = ["All", ...DEFAULT_LOCATIONS];

export const UNITS = ["pieces", "lbs", "oz", "kg", "g", "gallons", "liters", "bags", "bottles", "boxes", "cans"];

export const EMPTY_FORM = {
  name: "", category: "Dairy", quantity: "", unit: "pieces",
  expirationDate: "", location: "Fridge", brand: "", notes: "",
};