import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
process.env.SHOP_TEST_DATABASE = `/tmp/aynetpremium-e2e-${randomUUID()}.sqlite`;
export default defineConfig({globalTeardown:'./tests/teardown.js',testDir:'./tests',testMatch:'*.spec.js',workers:1,reporter:'list',use:{baseURL:'http://127.0.0.1:3004',headless:true,launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']},trace:'retain-on-failure'},webServer:{cwd:fileURLToPath(new URL('..',import.meta.url)),command:'node ecommerce/server.js',url:'http://127.0.0.1:3004/shop-api/health',reuseExistingServer:false,env:{SHOP_HOST:'127.0.0.1',SHOP_PORT:'3004',SHOP_DATABASE_PATH:process.env.SHOP_TEST_DATABASE,SHOP_ADMIN_PASSWORD:'',SHOP_PUBLIC_URL:'',SHOP_DEMO:'true'}}});
