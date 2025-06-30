# AccuFund Migration Verification Strategy (v8.5)

## 1. Introduction

This document outlines the comprehensive strategy for verifying the accuracy and completeness of financial data migrated from AccuFund into the new Non-Profit Fund Accounting System. The goal of this process is to build complete confidence in the new system before decommissioning AccuFund.

This guide is intended for project managers, accountants, and system administrators responsible for the migration. Following these steps will ensure data integrity, validate financial reporting, and mitigate risks associated with the transition.

---

## 2. Pre-Migration Preparation

Before extracting any data, perform these critical preparation steps in your existing AccuFund system.

*   **Define Scope**:
    *   [ ] Confirm the exact date range for the migration (e.g., January 1, 2020, to December 31, 2024).
    *   [ ] Identify all entities, funds, and accounts that are part of the migration.
*   **Data Cleanup in AccuFund**:
    *   [ ] Run a trial balance and resolve any outstanding reconciliation issues.
    *   [ ] Post all open batches and transactions within the migration period.
    *   [ ] Review and archive any inactive funds or accounts that are not needed in the new system.
    *   [ ] Ensure transaction reference numbers are unique and consistent.
*   **Setup New System Master Records**:
    *   [ ] Manually create or import the complete **Chart of Accounts** into the new system. Account codes and types must match AccuFund exactly.
    *   [ ] Manually create or import the complete **Fund List**. Fund codes must match AccuFund.
    *   [ ] Set up the **Entity Hierarchy** in `Settings > Entities` to mirror your organizational structure.

---

## 3. Data Extraction from AccuFund

Export the following reports from AccuFund for the defined migration period. **Export all reports in CSV format.**

1.  **General Ledger Detail Report**: This is the most critical file.
    *   **Date Range**: The full migration period (e.g., 01/01/2020 - 12/31/2024).
    *   **Required Columns**: Ensure the export includes, at a minimum:
        *   Transaction/Reference Number
        *   Entry Date
        *   Account Code
        *   Fund Code
        *   Debit Amount
        *   Credit Amount
        *   Description/Memo
2.  **Chart of Accounts Listing**: A full list of all accounts with their codes, names, and types.
3.  **Fund Listing**: A full list of all funds with their codes, names, and types (Unrestricted, Temporarily Restricted, etc.).
4.  **Trial Balance Reports**:
    *   Generate a trial balance as of the **day before** your migration start date (e.g., 12/31/2019). This will be used to verify opening balances.
    *   Generate a trial balance as of the **last day** of your migration period (e.g., 12/31/2024). This will be a key reconciliation report.

---

## 4. Step-by-Step Comparison Process

The verification will proceed in the following order:

1.  **Initial Import**: Use the **AccuFund Data Import Utility** to import the General Ledger Detail CSV into the new system.
2.  **Automated Verification**: Run the **Data Migration Verifier** script to perform a high-level, automated reconciliation of all data.
3.  **Manual Spot-Checks**: Perform targeted manual checks on specific transaction types and balances using the provided checklists.
4.  **Financial Report Reconciliation**: Generate key financial statements (Statement of Financial Position, Statement of Activities) from both AccuFund and the new system for the same period and compare them line-by-line.
5.  **Parallel Operations**: Run both systems side-by-side for one full accounting period (e.g., one month) to ensure ongoing transactions are handled identically.
6.  **Final Sign-Off**: Once all criteria are met, the finance team and key stakeholders formally sign off on the migration.

---

## 5. Automated Verification Tools Usage

The `DataMigrationVerifier` script provides the primary automated check of the migrated data.

### How to Run:
1.  Upload your AccuFund General Ledger Detail CSV file.
2.  The tool will automatically fetch the corresponding data from the new system's database via API.
3.  The script will run and generate a comprehensive reconciliation report.

### Interpreting the Output:
The verifier produces a report with four main sections. **Your goal is to have zero variances, mismatches, or missing items.**

*   **Source Data Quality**:
    *   **Unbalanced Transactions**: Lists any journal entries from your AccuFund export where debits do not equal credits. **These must be fixed in AccuFund and re-exported.**
*   **Account Reconciliation**:
    *   **Variances**: Lists accounts where the final balance in the new system does not match the calculated balance from AccuFund data.
    *   **Missing in New System**: Lists accounts present in your AccuFund data that were not set up in the new system's Chart of Accounts.
*   **Fund Reconciliation**:
    *   **Variances**: Lists funds where the final balance differs between the two systems.
    *   **Missing in New System**: Lists funds from AccuFund that were not created in the new system.
*   **Transaction Reconciliation**:
    *   **Amount Mismatches**: Lists transactions where the total amount differs between the two systems.
    *   **Missing in New System**: Lists transactions from AccuFund that did not get imported.
    *   **Extra in New System**: Lists transactions in the new system that were not in the AccuFund export (should be zero for a clean migration).

---

## 6. Manual Verification Checklists

Automation is powerful, but manual spot-checks are essential for confidence.

### Checklist 1: Master Data Setup
*   [ ] **Chart of Accounts**: Randomly select 10-15 accounts and verify their `Type` (Asset, Liability, etc.) is identical in both systems.
*   [ ] **Funds**: Randomly select 5-10 funds and verify their `Type` (Unrestricted, Temporarily Restricted) is identical.
*   [ ] **Entity Hierarchy**: In `Settings > Entities`, confirm the organizational structure exactly matches your real-world structure.

### Checklist 2: Transaction Spot-Checks
Select 5-10 of each of the following transaction types and verify them line-by-line in both systems:
*   [ ] A complex journal entry with many lines.
*   [ ] An entry involving multiple funds (if applicable).
*   [ ] The first transaction of the migration period.
*   [ ] The last transaction of the migration period.
*   [ ] A transaction with a large dollar amount.

---

## 7. Report Comparison Procedures

This is the ultimate test of the migration's success.

1.  **Select a Key Date**: Choose the end date of a fiscal year within your migration period (e.g., 12/31/2023).
2.  **Generate Reports in AccuFund**:
    *   Statement of Financial Position as of the key date.
    *   Statement of Activities for the fiscal year ending on the key date.
3.  **Generate Reports in New System**:
    *   Navigate to `Fund Reports`.
    *   Generate the same two reports for the same date/period.
    *   Ensure the "Consolidated View" is enabled and the top-level entity is selected.
4.  **Compare Line-by-Line**:
    *   Print both sets of reports.
    *   Use a ruler and highlighter to compare every single line item.
    *   **Every number must match exactly.**

| Report | Key Figures to Match | Tolerance |
| :--- | :--- | :--- |
| **Statement of Financial Position** | Total Assets, Total Liabilities, Total Net Assets, individual line items. | **$0.00** |
| **Statement of Activities** | Total Revenue, Total Expenses, Change in Net Assets, individual line items. | **$0.00** |

---

## 8. Parallel Operation Strategy

To ensure the new system behaves identically with live data, run both systems in parallel for one full accounting period (e.g., one month).

1.  **Dual Data Entry**: For one month, all new transactions must be entered into **both** AccuFund and the new system.
2.  **Reconciliation**: At the end of the month, perform the following checks:
    *   [ ] Run a Trial Balance from both systems. The ending balances for all accounts must match.
    *   [ ] Run a Statement of Activities from both systems for that month. The reports must be identical.
3.  **User Feedback**: Gather feedback from the finance team on the new system's workflow, usability, and performance compared to AccuFund.

---

## 9. Sign-Off Criteria and Approval Process

The migration is considered successful and ready for final sign-off when all of the following criteria are met:

*   [ ] The Automated Verification report shows **zero** variances, mismatches, or missing items.
*   [ ] All items on the Manual Verification Checklists have been completed and verified.
*   [ ] The line-by-line Financial Report Reconciliation for at least one fiscal year-end shows **zero discrepancies**.
*   [ ] The Parallel Operation trial for one month results in **identical financial reports** from both systems.
*   [ ] The finance team formally approves the new system's functionality and data accuracy.

A formal sign-off document should be signed by the project manager, head of finance, and executive director.

---

## 10. Troubleshooting Common Discrepancies

| Discrepancy | Likely Cause | Solution |
| :--- | :--- | :--- |
| **Account/Fund Balance Mismatch** | 1. Unbalanced transaction in source data. <br> 2. An AccuFund transaction was missed in the export. <br> 3. Opening balances were not handled correctly. | 1. Run the Source Data Quality check to find unbalanced JEs. <br> 2. Re-run the GL Detail export from AccuFund with the correct date range. <br> 3. Verify the opening trial balance matches. |
| **Transaction Missing in New System** | The transaction was filtered out during import, or the import process failed partway through. | Check the import logs for errors. Re-run the import for the specific date range of the missing transaction. |
| **Report Totals Don't Match** | The report's date range is different, or the "Consolidated View" is not enabled in the new system. | Verify the date range and filters are identical for both reports. Ensure the top-level entity is selected and "Consolidated View" is on. |
| **"Account/Fund Not Found" Error During Import** | The Chart of Accounts or Fund List was not set up in the new system before the transaction import was run. | Pause the import. Add the missing master records in `Settings > Chart of Accounts` or `Funds`, then resume the import. |

---

## 11. Sample Timeline and Milestones

| Phase | Duration | Key Activities | Milestone |
| :--- | :--- | :--- | :--- |
| **1. Preparation** | 1 Week | Data cleanup in AccuFund, master record setup in new system. | All master records created. |
| **2. Test Migration** | 1 Week | Import one month of data, run all verification checks. | Test month reconciles perfectly. |
| **3. Full Migration** | 1-2 Weeks | Import all 5 years of data, run automated verification. | Automated verification is clean. |
| **4. Manual Verification** | 1 Week | Perform all manual spot-checks and report comparisons. | Key reports match exactly. |
| **5. Parallel Run** | 1 Month | Dual data entry in both systems. | Parallel month reports match. |
| **6. Go-Live & Sign-Off** | 1 Week | Decommission AccuFund, final training, formal sign-off. | Migration officially complete. |

This structured verification process will ensure a smooth, accurate, and low-risk transition from AccuFund to your new, modern fund accounting system.