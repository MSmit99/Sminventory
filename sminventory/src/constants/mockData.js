function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export const MOCK_ITEMS = [
  { id: 1,  name: "Whole Milk",      category: "Dairy",     quantity: 1,   unit: "gallons", expirationDate: addDays(2),  location: "Fridge",  brand: "Horizon",    notes: "",                   addedBy: "Mom",  dateAdded: new Date().toISOString() },
  { id: 2,  name: "Chicken Breast",  category: "Meat",      quantity: 2.5, unit: "lbs",     expirationDate: addDays(1),  location: "Fridge",  brand: "",           notes: "Marinated",          addedBy: "Dad",  dateAdded: new Date().toISOString() },
  { id: 3,  name: "Spinach",         category: "Produce",   quantity: 1,   unit: "bags",    expirationDate: addDays(5),  location: "Fridge",  brand: "Earthbound", notes: "",                   addedBy: "Mom",  dateAdded: new Date().toISOString() },
  { id: 4,  name: "Greek Yogurt",    category: "Dairy",     quantity: 3,   unit: "pieces",  expirationDate: addDays(10), location: "Fridge",  brand: "Chobani",    notes: "",                   addedBy: "Mom",  dateAdded: new Date().toISOString() },
  { id: 5,  name: "Frozen Pizza",    category: "Frozen",    quantity: 2,   unit: "boxes",   expirationDate: addDays(60), location: "Freezer", brand: "DiGiorno",   notes: "",                   addedBy: "Teen", dateAdded: new Date().toISOString() },
  { id: 6,  name: "Orange Juice",    category: "Beverages", quantity: 1,   unit: "liters",  expirationDate: addDays(-1), location: "Fridge",  brand: "Tropicana",  notes: "Opened",             addedBy: "Dad",  dateAdded: new Date().toISOString() },
  { id: 7,  name: "Cheddar Cheese",  category: "Dairy",     quantity: 8,   unit: "oz",      expirationDate: addDays(14), location: "Fridge",  brand: "Tillamook",  notes: "",                   addedBy: "Mom",  dateAdded: new Date().toISOString() },
  { id: 8,  name: "Leftover Pasta",  category: "Leftovers", quantity: 2,   unit: "pieces",  expirationDate: addDays(2),  location: "Fridge",  brand: "",           notes: "From Sunday dinner", addedBy: "Mom",  dateAdded: new Date().toISOString() },
  { id: 9,  name: "Almond Butter",   category: "Pantry",    quantity: 1,   unit: "bottles", expirationDate: addDays(90), location: "Pantry",  brand: "Justin's",   notes: "",                   addedBy: "Mom",  dateAdded: new Date().toISOString() },
  { id: 10, name: "Ground Beef",     category: "Meat",      quantity: 1,   unit: "lbs",     expirationDate: addDays(3),  location: "Fridge",  brand: "",           notes: "",                   addedBy: "Dad",  dateAdded: new Date().toISOString() },
];
