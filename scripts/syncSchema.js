require('dotenv').config()
const PocketBase = require("pocketbase").default
const fs = require('fs')
const path = require('path')

const pb = new PocketBase(process.env.PB_URL || "https://sistemac.fs-sistema.cloud")

async function login() {
  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be defined in .env");
  }

  // Usando pb.send diretamente para compatibilidade com versões anteriores de admins (antes do v0.22)
  const authData = await pb.send("/api/admins/auth-with-password", {
    method: "POST",
    body: { identity: email, password: password }
  });
  pb.authStore.save(authData.token, authData.admin);
}

async function run() {
  try {
    await login()
    
    const schemaPath = path.join(__dirname, '..', 'pb_schema.json')
    const schemaData = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))
    
    console.log("📥 Importando coleções do pb_schema.json para o PocketBase...")
    
    // O segundo parâmetro do import decide se deleta coleções ausentes no JSON (padrão false)
    await pb.collections.import(schemaData, false)
    
    console.log("✅ Collections atualizadas e sincronizadas com sucesso!")
  } catch (error) {
    console.error("❌ Erro ao sincronizar:", error.response || error.message);
  }
}

run()