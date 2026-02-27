export const schemaV1 = [
  {
    name: "drivers",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "cnh", type: "text" },
      { name: "phone", type: "text" },
      { name: "status", type: "text" },
      { name: "passwordHash", type: "text" },
      { name: "salt", type: "text" },
      { name: "dailyRate", type: "number" }
    ]
  },
  {
    name: "trips",
    fields: [
      { name: "driverId", type: "text" },
      { name: "vehicleId", type: "text" },
      { name: "startDate", type: "text" },
      { name: "endDate", type: "text" },
      { name: "createdAt", type: "text" },
      { name: "monthlyTripNumber", type: "number" }
    ]
  },
  {
    name: "vehicles",
    fields: [
      { name: "plate", type: "text" },
      { name: "model", type: "text" },
      { name: "status", type: "text" }
    ]
  },
  {
    name: "admins",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "passwordHash", type: "text" },
      { name: "salt", type: "text" }
    ]
  },
  {
    name: "fixedExpenses",
    fields: [
      { name: "name", type: "text" },
      { name: "value", type: "number" },
      { name: "createdAt", type: "text" },
      { name: "payments", type: "json" }
    ]
  },
  {
    name: "workshopExpenses",
    fields: [
      { name: "description", type: "text" },
      { name: "value", type: "number" },
      { name: "createdAt", type: "text" },
      { name: "payments", type: "json" }
    ]
  },
  {
    name: "financialEntries",
    fields: [
      { name: "description", type: "text" },
      { name: "value", type: "number" },
      { name: "createdAt", type: "text" },
      { name: "payments", type: "json" }
    ]
  },
  {
    name: "financialCategories",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "createdAt", type: "text" }
    ]
  }
]