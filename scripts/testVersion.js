const PocketBase = require("pocketbase").default;
const pb = new PocketBase("https://sistemac.fs-sistema.cloud");

async function test() {
    try {
        const health = await pb.health.check();
        console.log("Health:", health);
    } catch (e) {
        console.log("Health check failed, trying simple fetch");
    }
    
    try {
        // Try old admin login endpoint
        const resp = await fetch("https://sistemac.fs-sistema.cloud/api/admins/auth-with-password", {
            method: "POST"
        });
        console.log("Legacy Admin Endpoint status:", resp.status);
    } catch (e) {
        console.log("Legacy test failed");
    }

    try {
        // Try new superuser login endpoint
        const resp = await fetch("https://sistemac.fs-sistema.cloud/api/collections/_superusers/auth-with-password", {
            method: "POST"
        });
        console.log("New Superuser Endpoint status:", resp.status);
    } catch (e) {
        console.log("New test failed");
    }
}

test();
