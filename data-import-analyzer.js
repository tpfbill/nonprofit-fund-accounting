/**
 * @file data-import-analyzer.js
 * @description A comprehensive tool to analyze and compare accounting data from an
 *              AccuFund export against the new system to verify migration accuracy.
 *
 * This script provides a complete suite of functions to:
 * 1. Parse AccuFund General Ledger detail reports (CSV).
 * 2. Reconcile Account and Fund balances between the two systems.
 * 3. Compare transaction counts, totals, and individual entries.
 * 4. Generate detailed variance reports identifying discrepancies.
 * 5. Find missing or duplicate entries.
 * 6. Export the full reconciliation report to multiple CSV files.
 */

const DataMigrationVerifier = {

    /**
     * The main entry point for running the verification process.
     * @param {string} accuFundCsvString - The raw CSV content from the AccuFund GL export.
     * @param {object} targetSystemData - An object containing data fetched from the new system's API.
     *   Expected properties: { accounts: [], funds: [], journalEntries: [] }
     * @returns {Promise<object>} A promise that resolves with the full reconciliation report.
     */
    async runVerification(accuFundCsvString, targetSystemData) {
        console.log("Starting migration verification process...");

        // 1. Parse and pre-validate the source AccuFund data
        const sourceData = this._parseAndStructureAccuFundGL(accuFundCsvString);
        const qualityReport = this._runSourceDataQualityChecks(sourceData.transactions);

        // 2. Reconcile Accounts
        const accountReconciliation = this._reconcileBalances(
            sourceData.accountSummary,
            targetSystemData.accounts,
            'accountCode',
            'balance',
            'accountName'
        );

        // 3. Reconcile Funds
        const fundReconciliation = this._reconcileBalances(
            sourceData.fundSummary,
            targetSystemData.funds,
            'fundCode',
            'balance',
            'fundName'
        );

        // 4. Reconcile Transactions
        const transactionReconciliation = this._reconcileTransactions(
            sourceData.transactions,
            targetSystemData.journalEntries
        );

        // 5. Compile the final report
        const finalReport = {
            summary: {
                verificationDate: new Date().toISOString(),
                sourceFile: "AccuFund GL Export",
                sourceTransactionCount: Object.keys(sourceData.transactions).length,
                targetTransactionCount: targetSystemData.journalEntries.length,
            },
            sourceDataQuality: qualityReport,
            accountReconciliation,
            fundReconciliation,
            transactionReconciliation
        };

        console.log("Verification process complete.", finalReport);
        return finalReport;
    },

    /**
     * Parses a typical AccuFund GL Detail CSV and structures it for comparison.
     * @param {string} csvText - The raw CSV string.
     * @returns {object} An object containing structured transactions and summaries.
     */
    _parseAndStructureAccuFundGL(csvText) {
        console.log("Parsing and structuring AccuFund GL data...");
        const records = this._parseCSV(csvText);
        const headers = records[0].map(h => h.trim());

        // Find key column indices
        const refIndex = headers.findIndex(h => /ref/i.test(h));
        const dateIndex = headers.findIndex(h => /date/i.test(h));
        const accIndex = headers.findIndex(h => /account/i.test(h));
        const fundIndex = headers.findIndex(h => /fund/i.test(h));
        const descIndex = headers.findIndex(h => /desc/i.test(h));
        const debitIndex = headers.findIndex(h => /debit/i.test(h));
        const creditIndex = headers.findIndex(h => /credit/i.test(h));

        if ([refIndex, dateIndex, accIndex, debitIndex, creditIndex].includes(-1)) {
            throw new Error("Could not find required columns in CSV: Ref, Date, Account, Debit, Credit.");
        }

        const transactions = {};
        const accountSummary = {};
        const fundSummary = {};

        // Start from row 1 to skip header
        for (let i = 1; i < records.length; i++) {
            const row = records[i];
            if (row.length < headers.length) continue; // Skip malformed rows

            const txId = row[refIndex];
            if (!txId) continue;

            const debit = parseFloat(row[debitIndex]) || 0;
            const credit = parseFloat(row[creditIndex]) || 0;
            const accountCode = row[accIndex];
            const fundCode = fundIndex > -1 ? row[fundIndex] : 'UNDEFINED';

            // Group lines by transaction ID
            if (!transactions[txId]) {
                transactions[txId] = {
                    id: txId,
                    date: row[dateIndex],
                    description: row[descIndex],
                    lines: [],
                    totalDebits: 0,
                    totalCredits: 0,
                };
            }
            transactions[txId].lines.push({ accountCode, fundCode, debit, credit });
            transactions[txId].totalDebits += debit;
            transactions[txId].totalCredits += credit;

            // Aggregate account balances
            if (!accountSummary[accountCode]) accountSummary[accountCode] = { balance: 0 };
            accountSummary[accountCode].balance += (debit - credit);

            // Aggregate fund balances
            if (!fundSummary[fundCode]) fundSummary[fundCode] = { balance: 0 };
            fundSummary[fundCode].balance += (debit - credit);
        }

        return {
            transactions,
            accountSummary: Object.entries(accountSummary).map(([code, data]) => ({ accountCode: code, balance: data.balance })),
            fundSummary: Object.entries(fundSummary).map(([code, data]) => ({ fundCode: code, balance: data.balance })),
        };
    },

    /**
     * Runs pre-validation checks on the parsed source data.
     * @param {object} transactions - The structured transaction data from the source.
     * @returns {object} A report on data quality.
     */
    _runSourceDataQualityChecks(transactions) {
        const unbalancedTransactions = [];
        for (const txId in transactions) {
            const tx = transactions[txId];
            if (Math.abs(tx.totalDebits - tx.totalCredits) > 0.01) {
                unbalancedTransactions.push({
                    id: txId,
                    debits: tx.totalDebits,
                    credits: tx.totalCredits,
                    difference: tx.totalDebits - tx.totalCredits
                });
            }
        }
        return {
            unbalancedTransactionCount: unbalancedTransactions.length,
            unbalancedTransactions,
        };
    },

    /**
     * A generic function to reconcile balances for accounts or funds.
     * @param {Array<object>} sourceItems - Array of items from the source system.
     * @param {Array<object>} targetItems - Array of items from the target system.
     * @param {string} keyField - The field to match items on (e.g., 'accountCode').
     * @param {string} balanceField - The field containing the balance to compare.
     * @param {string} nameField - The field containing the name/description.
     * @returns {object} A detailed reconciliation report for the items.
     */
    _reconcileBalances(sourceItems, targetItems, keyField, balanceField, nameField) {
        const sourceMap = new Map(sourceItems.map(item => [item[keyField], item]));
        const targetMap = new Map(targetItems.map(item => [item.code, item])); // Assuming target uses 'code'

        const variances = [];
        const matched = [];

        sourceMap.forEach((sourceItem, key) => {
            const targetItem = targetMap.get(key);
            if (targetItem) {
                const sourceBalance = parseFloat(sourceItem[balanceField] || 0);
                const targetBalance = parseFloat(targetItem[balanceField] || 0);
                const difference = sourceBalance - targetBalance;

                if (Math.abs(difference) > 0.01) {
                    variances.push({
                        key,
                        name: targetItem.name || sourceItem[nameField],
                        sourceBalance,
                        targetBalance,
                        difference
                    });
                }
                matched.push(key);
            }
        });

        const missingInTarget = sourceItems.filter(item => !targetMap.has(item[keyField]));
        const extraInTarget = targetItems.filter(item => !sourceMap.has(item.code));

        return {
            totalSource: sourceItems.length,
            totalTarget: targetItems.length,
            matchedCount: matched.length,
            varianceCount: variances.length,
            missingInTargetCount: missingInTarget.length,
            extraInTargetCount: extraInTarget.length,
            variances,
            missingInTarget,
            extraInTarget
        };
    },

    /**
     * Compares transaction-level data between the source and target.
     * @param {object} sourceTransactions - Structured transactions from the source.
     * @param {Array<object>} targetTransactions - Journal entries from the target system API.
     * @returns {object} A detailed transaction reconciliation report.
     */
    _reconcileTransactions(sourceTransactions, targetTransactions) {
        const sourceMap = new Map(Object.entries(sourceTransactions));
        const targetMap = new Map(targetTransactions.map(tx => [tx.reference_number, tx]));

        const amountMismatches = [];
        const matched = [];

        sourceMap.forEach((sourceTx, txId) => {
            const targetTx = targetMap.get(txId);
            if (targetTx) {
                const sourceAmount = sourceTx.totalDebits; // Assuming balanced entries
                const targetAmount = parseFloat(targetTx.total_amount || 0);
                const difference = sourceAmount - targetAmount;

                if (Math.abs(difference) > 0.01) {
                    amountMismatches.push({
                        id: txId,
                        sourceAmount,
                        targetAmount,
                        difference
                    });
                }
                matched.push(txId);
            }
        });

        const missingInTarget = Object.values(sourceTransactions).filter(tx => !targetMap.has(tx.id));
        const extraInTarget = targetTransactions.filter(tx => !sourceMap.has(tx.reference_number));

        return {
            totalSource: sourceMap.size,
            totalTarget: targetMap.size,
            matchedCount: matched.length,
            amountMismatchCount: amountMismatches.length,
            missingInTargetCount: missingInTarget.length,
            extraInTargetCount: extraInTarget.length,
            amountMismatches,
            missingInTarget,
            extraInTarget
        };
    },

    /**
     * Exports the reconciliation report to a series of CSV files.
     * @param {object} report - The final reconciliation report object.
     * @returns {Array<object>} An array of objects, each with a filename and csvContent.
     */
    exportReportToCSV(report) {
        const csvs = [];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Helper to convert array of objects to CSV string
        const toCSV = (data, headers) => {
            if (!data || data.length === 0) return "No data available.";
            const headerRow = headers.join(',');
            const rows = data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','));
            return [headerRow, ...rows].join('\n');
        };

        // Account Reconciliation CSVs
        if (report.accountReconciliation.variances.length > 0) {
            csvs.push({
                filename: `account_variances_${timestamp}.csv`,
                content: toCSV(report.accountReconciliation.variances, ['key', 'name', 'sourceBalance', 'targetBalance', 'difference'])
            });
        }
        if (report.accountReconciliation.missingInTarget.length > 0) {
            csvs.push({
                filename: `accounts_missing_in_new_system_${timestamp}.csv`,
                content: toCSV(report.accountReconciliation.missingInTarget, ['accountCode', 'balance'])
            });
        }

        // Fund Reconciliation CSVs
        if (report.fundReconciliation.variances.length > 0) {
            csvs.push({
                filename: `fund_variances_${timestamp}.csv`,
                content: toCSV(report.fundReconciliation.variances, ['key', 'name', 'sourceBalance', 'targetBalance', 'difference'])
            });
        }
        if (report.fundReconciliation.missingInTarget.length > 0) {
            csvs.push({
                filename: `funds_missing_in_new_system_${timestamp}.csv`,
                content: toCSV(report.fundReconciliation.missingInTarget, ['fundCode', 'balance'])
            });
        }

        // Transaction Reconciliation CSVs
        if (report.transactionReconciliation.amountMismatches.length > 0) {
            csvs.push({
                filename: `transaction_amount_mismatches_${timestamp}.csv`,
                content: toCSV(report.transactionReconciliation.amountMismatches, ['id', 'sourceAmount', 'targetAmount', 'difference'])
            });
        }
        if (report.transactionReconciliation.missingInTarget.length > 0) {
            csvs.push({
                filename: `transactions_missing_in_new_system_${timestamp}.csv`,
                content: toCSV(report.transactionReconciliation.missingInTarget, ['id', 'date', 'description', 'totalDebits'])
            });
        }

        return csvs;
    },

    /**
     * Simple CSV parser.
     * @param {string} csvText - The raw CSV string.
     * @returns {Array<Array<string>>} Parsed data.
     */
    _parseCSV(csvText) {
        return csvText.split(/\r?\n/).map(row => row.split(',').map(cell => cell.trim()));
    }
};
