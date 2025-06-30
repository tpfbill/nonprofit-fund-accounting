/**
 * @file zoho-expense-integration.js
 * @description A comprehensive, standalone service to integrate Zoho Expense with the
 *              Non-Profit Fund Accounting PostgreSQL database.
 *
 * @features
 * - Connects to Zoho Expense API using OAuth 2.0 with automatic token refresh.
 * - Fetches approved expense reports ready for accounting.
 * - Maps Zoho Expense categories to the application's Chart of Accounts.
 * - Distinguishes between reimbursable and corporate card expenses, crediting the correct payable accounts.
 * - Automatically creates balanced, multi-line journal entries in the PostgreSQL database.
 * - Prevents duplicate imports by tracking processed reports.
 * - Supports both scheduled batch synchronization and real-time webhook processing.
 * - Includes a central, easy-to-edit configuration for all mappings.
 * - Provides detailed logging and robust error handling.
 *
 * @deployment
 * This script is designed to run as a separate Node.js process alongside the main application server.
 * It connects to the same PostgreSQL database.
 *
 * @setup
 * 1. Install dependencies: `npm install axios express pg`
 * 2. Create a `.env` file in the same directory with the following variables:
 *    ZOHO_CLIENT_ID=your_zoho_client_id
 *    ZOHO_CLIENT_SECRET=your_zoho_client_secret
 *    ZOHO_REFRESH_TOKEN=your_zoho_refresh_token
 *    ZOHO_ORGANIZATION_ID=your_zoho_organization_id
 *    PGHOST=localhost
 *    PGPORT=5432
 *    PGUSER=postgres
 *    PGPASSWORD=npfa123
 *    PGDATABASE=fund_accounting_db
 * 3. Run the service: `node zoho-expense-integration.js`
 */

require('dotenv').config();
const axios = require('axios');
const express = require('express');
const { Pool } = require('pg');

// --- Centralized Configuration ---

const ZOHO_API_BASE_URL = 'https://expense.zoho.com/api/v1';
const ZOHO_ACCOUNTS_URL = 'https://accounts.zoho.com/oauth/v2/token';

/**
 * Administrator-configurable mapping between Zoho Expense and the accounting system.
 * This object should be managed by a system administrator.
 */
const ZOHO_MAPPING_CONFIG = {
    // Maps Zoho Expense category names to our Chart of Accounts codes for debits.
    categoryToAccount: {
        'Travel': '5100',          // Travel Expense Account
        'Office Supplies': '5200',  // Office Supplies Expense Account
        'Meals & Entertainment': '5300', // Meals Expense Account
        'Software Subscription': '5400', // Software/IT Expense Account
        'Postage & Delivery': '5500', // Postage Expense Account
        'Default': '5999'           // Default/Uncategorized Expense Account
    },

    // Default liability account for employee-paid, reimbursable expenses.
    reimbursablePayableAccount: '2010', // e.g., 'Accounts Payable - Employees'

    // Maps corporate credit card names (from Zoho Wallet) to our liability accounts.
    corporateCardToAccount: {
        'Amex Corporate Card': '2020', // e.g., 'Amex Payable'
        'Chase Ink Business': '2021', // e.g., 'Chase Payable'
    },

    // Default fund and entity if not specified in the expense report.
    defaultFundCode: 'GEN',
    defaultEntityCode: 'TPF',
};

// --- Logger ---
const logger = {
    info: (message, data) => console.log(`[INFO] ${new Date().toISOString()}: ${message}`, data || ''),
    warn: (message, data) => console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, data || ''),
    error: (message, error) => console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error || ''),
};

// --- Database Client ---
const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});

/**
 * Manages Zoho API authentication and token lifecycle.
 */
class AuthHandler {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.accessToken;
        }
        logger.info('Access token is expired or missing. Refreshing...');
        return await this.refreshAccessToken();
    }

    async refreshAccessToken() {
        try {
            const params = new URLSearchParams();
            params.append('refresh_token', process.env.ZOHO_REFRESH_TOKEN);
            params.append('client_id', process.env.ZOHO_CLIENT_ID);
            params.append('client_secret', process.env.ZOHO_CLIENT_SECRET);
            params.append('grant_type', 'refresh_token');

            const response = await axios.post(ZOHO_ACCOUNTS_URL, params);
            const { access_token, expires_in } = response.data;

            if (!access_token) {
                throw new Error('Failed to refresh access token.');
            }

            this.accessToken = access_token;
            // Set expiry to 5 minutes before the actual expiry for safety
            this.tokenExpiry = new Date(new Date().getTime() + (expires_in - 300) * 1000);
            
            logger.info('Successfully refreshed Zoho access token.');
            return this.accessToken;
        } catch (error) {
            logger.error('Error refreshing Zoho access token:', error.response ? error.response.data : error.message);
            throw error;
        }
    }
}

/**
 * A client for interacting with the Zoho Expense API.
 */
class ZohoApiClient {
    constructor(authHandler) {
        this.authHandler = authHandler;
    }

    async _makeRequest(method, endpoint, params = {}, data = null) {
        const accessToken = await this.authHandler.getAccessToken();
        const headers = {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'X-ZOHO-ORGANIZATION-ID': process.env.ZOHO_ORGANIZATION_ID,
        };

        try {
            const response = await axios({
                method,
                url: `${ZOHO_API_BASE_URL}${endpoint}`,
                headers,
                params,
                data
            });
            return response.data;
        } catch (error) {
            logger.error(`Zoho API request to ${endpoint} failed:`, error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async getApprovedReports(lastSyncDate) {
        logger.info(`Fetching approved expense reports since ${lastSyncDate || 'the beginning'}`);
        const params = {
            status: 'APPROVED',
            sort_by: 'CreatedDate',
            order: 'ascending',
        };
        if (lastSyncDate) {
            params.last_modified_time = lastSyncDate;
        }
        
        // Note: Implement pagination for production environments with many reports
        const response = await this._makeRequest('get', '/expensereports', params);
        return response.expense_reports || [];
    }
}

/**
 * Handles the creation of journal entries in the accounting system.
 */
class JournalEntryCreator {
    async createJournalEntryFromReport(report) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { entityId, fundId, creditAccountCode, total, reportId, reportDate, reportName } = await this._prepareReportData(report);

            // 1. Create the main Journal Entry record
            const jeResult = await client.query(
                `INSERT INTO journal_entries (entity_id, entry_date, reference_number, description, total_amount, status, created_by)
                 VALUES ($1, $2, $3, $4, $5, 'Posted', 'Zoho Expense Sync') RETURNING id`,
                [entityId, reportDate, `ZOHO-${reportId}`, `Expense report: ${reportName}`, total]
            );
            const journalEntryId = jeResult.rows[0].id;

            // 2. Create Debit lines for each expense
            for (const expense of report.expenses) {
                const debitAccountCode = ZOHO_MAPPING_CONFIG.categoryToAccount[expense.category_name] || ZOHO_MAPPING_CONFIG.categoryToAccount['Default'];
                const debitAccountId = await this._getAccountId(client, debitAccountCode, entityId);
                
                await client.query(
                    `INSERT INTO journal_entry_lines (journal_entry_id, account_id, fund_id, debit_amount, description)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [journalEntryId, debitAccountId, fundId, expense.amount, expense.description || `Expense: ${expense.merchant}`]
                );
            }

            // 3. Create the balancing Credit line
            const creditAccountId = await this._getAccountId(client, creditAccountCode, entityId);
            await client.query(
                `INSERT INTO journal_entry_lines (journal_entry_id, account_id, fund_id, credit_amount, description)
                 VALUES ($1, $2, $3, $4, $5)`,
                [journalEntryId, creditAccountId, fundId, total, `Credit for expense report ${report.report_name}`]
            );

            await client.query('COMMIT');
            logger.info(`Successfully created journal entry for Zoho report ID: ${report.report_id}`);
            return journalEntryId;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Failed to create journal entry for Zoho report ID: ${report.report_id}`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    async _prepareReportData(report) {
        const entityCode = this._getCustomFieldValue(report, 'Entity') || ZOHO_MAPPING_CONFIG.defaultEntityCode;
        const fundCode = this._getCustomFieldValue(report, 'Fund') || ZOHO_MAPPING_CONFIG.defaultFundCode;
        
        const client = await pool.connect();
        try {
            const entityId = await this._getRecordId(client, 'entities', 'code', entityCode);
            const fundId = await this._getRecordId(client, 'funds', 'code', fundCode);
            
            const creditAccountCode = report.source_of_funds === 'reimbursable'
                ? ZOHO_MAPPING_CONFIG.reimbursablePayableAccount
                : ZOHO_MAPPING_CONFIG.corporateCardToAccount[report.card_name] || ZOHO_MAPPING_CONFIG.reimbursablePayableAccount;

            return {
                entityId,
                fundId,
                creditAccountCode,
                total: report.total,
                reportId: report.report_id,
                reportDate: report.report_date,
                reportName: report.report_name
            };
        } finally {
            client.release();
        }
    }

    _getCustomFieldValue(report, fieldName) {
        const customField = (report.custom_fields || []).find(cf => cf.label === fieldName);
        return customField ? customField.value : null;
    }

    async _getAccountId(client, code, entityId) {
        return this._getRecordId(client, 'accounts', 'code', code, { entity_id: entityId });
    }

    async _getRecordId(client, table, field, value, extraConditions = {}) {
        let query = `SELECT id FROM ${table} WHERE ${field} = $1`;
        const params = [value];
        let paramIndex = 2;
        for (const [key, val] of Object.entries(extraConditions)) {
            query += ` AND ${key} = $${paramIndex++}`;
            params.push(val);
        }
        query += ' LIMIT 1';

        const result = await client.query(query, params);
        if (result.rows.length === 0) {
            throw new Error(`Record not found in table "${table}" for ${field} "${value}" with conditions ${JSON.stringify(extraConditions)}.`);
        }
        return result.rows[0].id;
    }
}

/**
 * Main service for handling the synchronization logic.
 */
class SyncService {
    constructor() {
        this.authHandler = new AuthHandler();
        this.apiClient = new ZohoApiClient(this.authHandler);
        this.jeCreator = new JournalEntryCreator();
    }

    async runBatchSync() {
        logger.info('--- Starting Zoho Expense Batch Sync ---');
        try {
            await this._ensureImportedReportsTable();
            const lastSyncDate = await this._getLastSyncDate();
            const reports = await this.apiClient.getApprovedReports(lastSyncDate);

            if (reports.length === 0) {
                logger.info('No new approved reports to sync.');
                return;
            }

            logger.info(`Found ${reports.length} new reports to process.`);

            for (const report of reports) {
                const isImported = await this._isReportImported(report.report_id);
                if (isImported) {
                    logger.info(`Skipping already imported report ID: ${report.report_id}`);
                    continue;
                }

                try {
                    await this.jeCreator.createJournalEntryFromReport(report);
                    await this._markReportAsImported(report.report_id, report.last_modified_time);
                } catch (error) {
                    logger.error(`Could not process report ${report.report_id}: ${error.message}`);
                    // Continue to next report
                }
            }
            logger.info('--- Zoho Expense Batch Sync Finished ---');
        } catch (error) {
            logger.error('A critical error occurred during the batch sync process.', error);
        }
    }

    async _ensureImportedReportsTable() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS imported_reports (
                zoho_report_id VARCHAR(255) PRIMARY KEY,
                journal_entry_id UUID,
                imported_at TIMESTAMPTZ DEFAULT NOW(),
                last_modified_time TIMESTAMPTZ
            );
        `);
    }

    async _isReportImported(reportId) {
        const result = await pool.query('SELECT 1 FROM imported_reports WHERE zoho_report_id = $1', [reportId]);
        return result.rows.length > 0;
    }

    async _markReportAsImported(reportId, lastModifiedTime) {
        await pool.query(
            'INSERT INTO imported_reports (zoho_report_id, last_modified_time) VALUES ($1, $2) ON CONFLICT (zoho_report_id) DO NOTHING',
            [reportId, lastModifiedTime]
        );
    }

    async _getLastSyncDate() {
        const result = await pool.query('SELECT MAX(last_modified_time) as last_sync FROM imported_reports');
        return result.rows[0].last_sync ? new Date(result.rows[0].last_sync).toISOString() : null;
    }
}


// --- Main Execution ---

const syncService = new SyncService();

// Run batch sync every hour
setInterval(() => {
    syncService.runBatchSync();
}, 3600 * 1000);

// Initial run on startup
syncService.runBatchSync();

// --- Webhook Server for Real-Time Sync ---
const app = express();
const webhookPort = process.env.WEBHOOK_PORT || 3002;

app.post('/webhook/zoho', express.json(), (req, res) => {
    logger.info('Received Zoho webhook');
    const { body } = req;
    
    // Basic validation of webhook payload
    if (body && body.expensereport && body.expensereport.status === 'APPROVED') {
        const report = body.expensereport;
        logger.info(`Processing approved report from webhook: ${report.report_id}`);
        
        // Asynchronously process the report to respond quickly to Zoho
        syncService.jeCreator.createJournalEntryFromReport(report)
            .then(() => syncService._markReportAsImported(report.report_id, new Date().toISOString()))
            .catch(err => logger.error(`Webhook processing failed for report ${report.report_id}`, err));
            
        res.status(200).send('Webhook received and processing initiated.');
    } else {
        logger.warn('Received webhook with non-approved status or invalid payload.');
        res.status(200).send('Webhook received, but no action taken.');
    }
});

app.listen(webhookPort, () => {
    logger.info(`Zoho Expense webhook listener running on http://localhost:${webhookPort}`);
});
