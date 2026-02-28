export const CATEGORIES = ["All", "Dairy", "Produce", "Meat", "Frozen", "Beverages", "Leftovers", "Pantry", "Other"];
export const LOCATIONS  = ["All", "Fridge", "Freezer", "Pantry", "Counter"];
export const UNITS      = ["pieces", "lbs", "oz", "kg", "g", "gallons", "liters", "bags", "bottles", "boxes", "cans"];

export const CATEGORY_LABELS = {
  Dairy: "Dairy", Produce: "Produce", Meat: "Meat", Frozen: "Frozen",
  Beverages: "Beverages", Leftovers: "Leftovers", Pantry: "Pantry", Other: "Other",
};

export const LOCATION_LABELS = {
  Fridge: "Fridge", Freezer: "Freezer", Pantry: "Pantry", Counter: "Counter",
};

export const EMPTY_FORM = {
  name: "", category: "Dairy", quantity: "", unit: "pieces",
  expirationDate: "", location: "Fridge", brand: "", notes: "",
};
