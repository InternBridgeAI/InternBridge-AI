import { expect, type Page } from '@playwright/test';

const sharedPassword = process.env.E2E_TEST_PASSWORD || 'InternBridge123!';

export const qaAccounts = {
    student: {
        email: process.env.E2E_STUDENT_EMAIL || 'qa.student@internbridge.ai',
        password: process.env.E2E_STUDENT_PASSWORD || sharedPassword,
        path: '/student',
    },
    company: {
        email: process.env.E2E_COMPANY_EMAIL || 'qa.company@internbridge.ai',
        password: process.env.E2E_COMPANY_PASSWORD || sharedPassword,
        path: '/company',
    },
    tpo: {
        email: process.env.E2E_TPO_EMAIL || 'qa.tpo@internbridge.ai',
        password: process.env.E2E_TPO_PASSWORD || sharedPassword,
        path: '/tpo',
    },
    admin: {
        email: process.env.E2E_ADMIN_EMAIL || 'qa.admin@internbridge.ai',
        password: process.env.E2E_ADMIN_PASSWORD || sharedPassword,
        path: '/admin',
    },
} as const;

export async function loginAs(page: Page, account: keyof typeof qaAccounts) {
    const credentials = qaAccounts[account];
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill(credentials.email);
    await page.getByPlaceholder('••••••••').fill(credentials.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(`**${credentials.path}`);
    await expect(page).toHaveURL(new RegExp(`${credentials.path}`));
}
