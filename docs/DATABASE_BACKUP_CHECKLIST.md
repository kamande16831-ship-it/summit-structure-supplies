# Database Backup Checklist

Use this checklist before making risky database changes.

## Before Backup

- Confirm you are in the correct Supabase project.
- Confirm the project name is Summit Structure Supplies.
- Confirm you are not exposing customer data publicly.
- Confirm backups will not be committed to GitHub.

## Tables to Backup

Back up these public tables:

- orders
- materials
- payment_settings

## Security Configuration to Record

Before major changes, record:

- Row Level Security policies
- table grants
- validation constraints
- unique indexes
- authentication settings
- MFA settings
- rate-limit settings

## Manual Backup Naming Format

Use this format:

summit-structure-supplies-db-backup-YYYY-MM-DD

Example:

summit-structure-supplies-db-backup-2026-07-09

## Backup Storage Rule

Store backups outside the repository.

Allowed:

- private encrypted folder
- private cloud drive
- offline drive

Not allowed:

- public GitHub repository
- website folder
- Codespaces workspace as the only copy

## Restore Test Checklist

After restoring a backup into a test project, verify:

- orders table exists
- materials table exists
- payment_settings table exists
- RLS is enabled
- public users cannot read orders
- public users can read active materials only
- public users can read active payment method only
- administrator can manage orders
- administrator can manage materials
- administrator can manage payment settings
