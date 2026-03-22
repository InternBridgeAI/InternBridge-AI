import { expect, test } from '@playwright/test';

import { loginAs } from './utils/auth';

test('student can open the internship detail AI copilot', async ({ page }) => {
    await loginAs(page, 'student');
    await page.goto('/student/internships');
    await expect(page.getByRole('heading', { name: 'Recommended Internships' })).toBeVisible();
    await page.getByRole('link', { name: 'View Details' }).first().click();
    await expect(page.getByText('AI Role Copilot')).toBeVisible();
    await expect(page.getByText('Apply Decision')).toBeVisible();
});

test('company can access recruiter interview kit', async ({ page }) => {
    await loginAs(page, 'company');
    await page.goto('/company/candidates');
    await expect(page.getByRole('heading', { name: 'Candidate Discovery' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'AI Interview Kit' }).first()).toBeVisible();
});

test('tpo can access placement dashboard', async ({ page }) => {
    await loginAs(page, 'tpo');
    await expect(page.getByRole('heading', { name: 'Placement Office Portal' })).toBeVisible();
    await page.goto('/tpo/approvals');
    await expect(page).toHaveURL(/\/tpo\/approvals/);
});

test('admin can view AI governance audit', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page.getByRole('heading', { name: 'System Administration' })).toBeVisible();
    await expect(page.getByText('AI Governance')).toBeVisible();
    await expect(page.getByText('Prompt Versions')).toBeVisible();
});
