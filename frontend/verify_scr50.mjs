import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(8000);

const BASE = 'http://localhost:5173';
const SS = (name) => page.screenshot({ path: `/tmp/scr50_${name}.png`, fullPage: false });

// 1. ログイン
await page.goto(BASE + '/');
await page.fill('input[type="text"]', 'admin');
await page.fill('input[type="password"]', 'Admin1234!');
await page.click('button[type="submit"]');
await page.waitForURL('**/home');
console.log('✅ Login OK');

// 2. 設定ハブ → 管理者用設定リンクの確認
await page.goto(BASE + '/settings');
await page.waitForSelector('#item-admin');
await SS('01_settings_hub');
console.log('✅ SCR-40: 管理者用設定リンク表示');

// 3. 管理者ハブ
await page.click('#item-admin');
await page.waitForURL('**/settings/admin');
await SS('02_admin_hub');
const hubItems = await page.$$eval('.settings-menu-item', els => els.map(e => e.textContent?.trim()));
console.log('✅ 管理者ハブ items:', hubItems);

// 4. ユーザー一覧
await page.click('#item-users');
await page.waitForURL('**/settings/admin/users');
await page.waitForSelector('.admin-user-row', { timeout: 6000 });
await SS('03_user_list');
const rows = await page.$$('.admin-user-row');
console.log(`✅ ユーザー一覧: ${rows.length}件表示`);

// 5. アカウント作成フォーム
await page.click('#btn-new');
await page.waitForURL('**/settings/admin/users/new');
await SS('04_user_form');
console.log('✅ アカウント作成フォーム表示');

// バリデーション: 空のまま送信
await page.click('#btn-submit');
const err = await page.textContent('#form-error');
console.log('✅ バリデーション:', err);

// 戻る
await page.click('#btn-back');
await page.waitForURL('**/settings/admin/users');

// 6. グループ作成フォーム
await page.goto(BASE + '/settings/admin');
await page.click('#item-groups');
await page.waitForURL('**/settings/admin/groups/new');
await page.waitForSelector('.admin-group-input');
await SS('05_group_form');
const memberItems = await page.$$('.admin-group-member-row');
const emptyMsg = await page.$('.admin-group-empty');
console.log(`✅ グループ作成フォーム: メンバー${memberItems.length}件, 空メッセージ${emptyMsg ? 'あり' : 'なし'}`);

await browser.close();
console.log('\n全ステップ完了');
