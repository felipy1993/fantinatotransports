require('dotenv').config()
const PocketBase = require("pocketbase").default

const pb = new PocketBase(process.env.PB_URL || "https://sistemac.fs-sistema.cloud")

const schema = [
  {
    name: "drivers",
    listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
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
    listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
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
    listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
    fields: [
      { name: "plate", type: "text" },
      { name: "model", type: "text" },
      { name: "status", type: "text" }
    ]
  },
  {
    name: "admins",
    listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "passwordHash", type: "text" },
      { name: "salt", type: "text" }
    ]
  },
  {
    name: "fixedExpenses",
    listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
    fields: [
      { name: "vehicleId", type: "text" },
      { name: "description", type: "text" },
      { name: "category", type: "text" },
      { name: "totalAmount", type: "number" },
      { name: "installments", type: "number" },
      { name: "startDate", type: "text" },
      { name: "createdAt", type: "text" },
      { name: "payments", type: "json", options: { maxSize: 2000000 } }
    ]
  },
  {
    name: "workshopExpenses",
    listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
    fields: [
      { name: "vehicleId", type: "text" },
      { name: "description", type: "text" },
      { name: "serviceDate", type: "text" },
      { name: "firstPaymentDate", type: "text" },
      { name: "totalAmount", type: "number" },
      { name: "installments", type: "number" },
      { name: "createdAt", type: "text" },
      { name: "payments", type: "json", options: { maxSize: 2000000 } }
    ]
  },
  {
    name: "financialEntries",
    listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
    fields: [
      { name: "description", type: "text" },
      { name: "categoryId", type: "text" },
      { name: "amount", type: "number" },
      { name: "dueDate", type: "text" },
      { name: "createdAt", type: "text" },
      { name: "payments", type: "json", options: { maxSize: 2000000 } }
    ]
  },
  {
    name: "financialCategories",
    listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
    fields: [
      { name: "name", type: "text" },
      { name: "createdAt", type: "text" }
    ]
  }
]

async function login() {
  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be defined in .env");
  }

  const authData = await pb.send("/api/admins/auth-with-password", {
    method: "POST",
    body: {
      identity: email,
      password: password
    }
  });
  pb.authStore.save(authData.token, authData.admin);
}

async function ensureCollection(col) {
  try {
    const list = await pb.collections.getList(1, 1, {
      filter: `name = "${col.name}"`
    });
    
    if (list.items.length > 0) {
      console.log(`✔ Atualizando regras em ${col.name}`);
      await pb.collections.update(list.items[0].id, {
        listRule: col.listRule,
        viewRule: col.viewRule,
        createRule: col.createRule,
        updateRule: col.updateRule,
        deleteRule: col.deleteRule,
      });
      return;
    }

    console.log(`➕ Criando ${col.name}`);
    await pb.collections.create({
      name: col.name,
      type: "base",
      schema: col.fields,
      listRule: col.listRule,
      viewRule: col.viewRule,
      createRule: col.createRule,
      updateRule: col.updateRule,
      deleteRule: col.deleteRule,
    });
  } catch (error) {
    console.error(`❌ Erro em ${col.name}:`, error.response || error.message);
  }
}

async function run() {
  await login()
  for (const col of schema) {
    await ensureCollection(col)
  }
  console.log("✅ Schema sincronizado com sucesso")
}

run()