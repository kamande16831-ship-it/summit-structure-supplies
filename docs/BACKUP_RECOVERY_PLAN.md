# Summit Structure Supplies Backup and Recovery Plan

## Purpose

This document explains how to protect and restore the Summit Structure Supplies website and database.

## What Must Be Backed Up

### Website Code

The website code is stored in GitHub.

Important files include:

- HTML pages
- CSS files
- JavaScript files
- logo and image assets
- GitHub Actions workflow files
- security policy files

### Supabase Database

The Supabase database stores:

- customer orders
- construction materials and prices
- payment settings

### Sensitive Files

The following must never be committed to GitHub:

- database backups
- `.env` files
- Supabase secret keys
- service role keys
- private keys
- exported customer order data

These files are ignored by `.gitignore`.

## Backup Frequency

### During Development

Create a manual database backup before:

- changing database policies
- changing table constraints
- deleting records
- changing authentication settings
- merging large security changes

### Before Launch

Create at least one complete database backup and store it outside GitHub.

### After Launch

Recommended minimum schedule:

- database backup: daily
- code backup: every GitHub commit
- recovery test: once every quarter

## Backup Storage

Backups must be stored in a private location such as:

- encrypted external drive
- private cloud storage
- private organization storage

Backups must not be uploaded to the public GitHub repository.

## Recovery Procedure

If the website code breaks:

1. Open GitHub.
2. Identify the last working commit.
3. Restore or revert to that commit.
4. Test the website locally.
5. Push the fixed version.

If the Supabase database breaks:

1. Stop making further database changes.
2. Identify the latest clean database backup.
3. Restore the backup into a test Supabase project first.
4. Verify orders, materials, and payment settings.
5. Restore production only after the test restore works.

## Recovery Testing

A recovery test should confirm:

- website pages open correctly
- admin login works
- MFA works
- orders table is readable by admin only
- public order submission works
- public materials registry loads
- payment settings display correctly
- no Supabase service role key is exposed

## Emergency Contacts

Repository owner:

- kamande16831-ship-it

Database platform:

- Supabase

Code platform:

- GitHub
