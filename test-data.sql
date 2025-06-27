-- =============================================================================
-- test-data.sql
--
-- Description:
-- This script populates the database with a rich set of test data for the
-- three-level entity hierarchy. It is designed to be idempotent, meaning it
-- can be run multiple times without creating duplicate data.
--
-- It performs the following actions within a single transaction:
-- 1. Ensures a standard chart of accounts exists for the TPF, TPF-ES, and IFCSN entities.
-- 2. Inserts a series of journal entries and their corresponding lines to
--    simulate financial activity within each entity and its funds.
-- =============================================================================

BEGIN;

DO $$
DECLARE
    -- Entity IDs
    tpf_id UUID;
    tpf_es_id UUID;
    ifcsn_id UUID;

    -- Account IDs (temporary holders within the loop)
    cash_account_id UUID;
    grant_revenue_account_id UUID;
    donation_revenue_account_id UUID;
    program_grants_account_id UUID;
    salaries_account_id UUID;
    lobbying_account_id UUID;
    capital_exp_account_id UUID;
    ap_account_id UUID;

    -- Fund IDs
    tpf_gen_fund_id UUID;
    tpf_sch_fund_id UUID;
    es_grnt_fund_id UUID;
    es_adv_fund_id UUID;
    ifcsn_com_fund_id UUID;
    ifcsn_sp_fund_id UUID;

    -- Journal Entry ID
    je_id UUID;
BEGIN
    RAISE NOTICE '--- Starting Test Data Seeding Script ---';

    -- =========================================================================
    -- Step 1: Fetch IDs for all required Entities and Funds
    -- =========================================================================
    RAISE NOTICE 'Fetching required IDs for entities and funds...';

    SELECT id INTO tpf_id FROM entities WHERE code = 'TPF';
    SELECT id INTO tpf_es_id FROM entities WHERE code = 'TPF-ES';
    SELECT id INTO ifcsn_id FROM entities WHERE code = 'IFCSN';

    SELECT id INTO tpf_gen_fund_id FROM funds WHERE code = 'TPF-GEN' AND entity_id = tpf_id;
    SELECT id INTO tpf_sch_fund_id FROM funds WHERE code = 'TPF-SCH' AND entity_id = tpf_id;
    SELECT id INTO es_grnt_fund_id FROM funds WHERE code = 'ES-GRNT' AND entity_id = tpf_es_id;
    SELECT id INTO es_adv_fund_id FROM funds WHERE code = 'ES-ADV' AND entity_id = tpf_es_id;
    SELECT id INTO ifcsn_com_fund_id FROM funds WHERE code = 'IFCSN-COM' AND entity_id = ifcsn_id;
    SELECT id INTO ifcsn_sp_fund_id FROM funds WHERE code = 'IFCSN-SP' AND entity_id = ifcsn_id;

    IF tpf_id IS NULL OR tpf_es_id IS NULL OR ifcsn_id IS NULL THEN
        RAISE EXCEPTION 'One or more required entities (TPF, TPF-ES, IFCSN) were not found.';
    END IF;
    RAISE NOTICE 'Successfully fetched entity IDs.';

    -- =========================================================================
    -- Step 2: Ensure a standard Chart of Accounts exists for each entity
    -- =========================================================================
    RAISE NOTICE 'Ensuring standard Chart of Accounts exists for all entities...';

    -- Accounts for TPF
    INSERT INTO accounts (entity_id, code, name, type, status) VALUES
        (tpf_id , '1010', 'Cash and Bank',             'Asset'    , 'Active'),
        (tpf_id , '2010', 'Accounts Payable',          'Liability', 'Active'),
        (tpf_id , '4010', 'Grant Revenue',             'Revenue'  , 'Active'),
        (tpf_id , '4020', 'Donation Revenue',          'Revenue'  , 'Active'),
        (tpf_id , '5010', 'Programmatic Grants',       'Expense'  , 'Active'),
        (tpf_id , '5020', 'Salaries and Wages',        'Expense'  , 'Active'),
        (tpf_id , '5030', 'Lobbying & Advocacy',       'Expense'  , 'Active'),
        (tpf_id , '5040', 'Capital Expenditures',      'Expense'  , 'Active')
    ON CONFLICT (entity_id, code) DO NOTHING;

    -- Accounts for TPF-ES
    INSERT INTO accounts (entity_id, code, name, type, status) VALUES
        (tpf_es_id , '1010', 'Cash and Bank',             'Asset'    , 'Active'),
        (tpf_es_id , '2010', 'Accounts Payable',          'Liability', 'Active'),
        (tpf_es_id , '4010', 'Grant Revenue',             'Revenue'  , 'Active'),
        (tpf_es_id , '4020', 'Donation Revenue',          'Revenue'  , 'Active'),
        (tpf_es_id , '5010', 'Programmatic Grants',       'Expense'  , 'Active'),
        (tpf_es_id , '5020', 'Salaries and Wages',        'Expense'  , 'Active'),
        (tpf_es_id , '5030', 'Lobbying & Advocacy',       'Expense'  , 'Active'),
        (tpf_es_id , '5040', 'Capital Expenditures',      'Expense'  , 'Active')
    ON CONFLICT (entity_id, code) DO NOTHING;

    -- Accounts for IFCSN
    INSERT INTO accounts (entity_id, code, name, type, status) VALUES
        (ifcsn_id , '1010', 'Cash and Bank',             'Asset'    , 'Active'),
        (ifcsn_id , '2010', 'Accounts Payable',          'Liability', 'Active'),
        (ifcsn_id , '4010', 'Grant Revenue',             'Revenue'  , 'Active'),
        (ifcsn_id , '4020', 'Donation Revenue',          'Revenue'  , 'Active'),
        (ifcsn_id , '5010', 'Programmatic Grants',       'Expense'  , 'Active'),
        (ifcsn_id , '5020', 'Salaries and Wages',        'Expense'  , 'Active'),
        (ifcsn_id , '5030', 'Lobbying & Advocacy',       'Expense'  , 'Active'),
        (ifcsn_id , '5040', 'Capital Expenditures',      'Expense'  , 'Active')
    ON CONFLICT (entity_id, code) DO NOTHING;

    RAISE NOTICE 'Standard accounts verified for all entities.';

    -- =========================================================================
    -- Step 3: Insert Journal Entries and Lines
    -- =========================================================================
    RAISE NOTICE 'Inserting test journal entries...';

    -- --- TPF Transactions ---
    INSERT INTO journal_entries (entity_id, entry_date, description, reference_number, status, total_amount, created_by)
    VALUES (tpf_id, '2025-02-15', 'Received annual grant from XYZ Foundation', 'TPF-JE-001', 'Posted', 100000, 'Admin')
    ON CONFLICT (reference_number) DO NOTHING RETURNING id INTO je_id;
    IF je_id IS NOT NULL THEN
        SELECT id INTO cash_account_id FROM accounts WHERE entity_id = tpf_id AND code = '1010';
        SELECT id INTO grant_revenue_account_id FROM accounts WHERE entity_id = tpf_id AND code = '4010';
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, fund_id, debit_amount, credit_amount, description) VALUES
            (je_id, cash_account_id, tpf_gen_fund_id, 100000, 0, 'Cash received'),
            (je_id, grant_revenue_account_id, tpf_gen_fund_id, 0, 100000, 'Grant revenue recognized');
        RAISE NOTICE '  -> Created JE: TPF-JE-001';
    END IF;

    INSERT INTO journal_entries (entity_id, entry_date, description, reference_number, status, total_amount, created_by)
    VALUES (tpf_id, '2025-03-01', 'Pay out scholarship awards', 'TPF-JE-002', 'Posted', 25000, 'Admin')
    ON CONFLICT (reference_number) DO NOTHING RETURNING id INTO je_id;
    IF je_id IS NOT NULL THEN
        SELECT id INTO program_grants_account_id FROM accounts WHERE entity_id = tpf_id AND code = '5010';
        SELECT id INTO cash_account_id FROM accounts WHERE entity_id = tpf_id AND code = '1010';
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, fund_id, debit_amount, credit_amount, description) VALUES
            (je_id, program_grants_account_id, tpf_sch_fund_id, 25000, 0, 'Scholarship grant expense'),
            (je_id, cash_account_id, tpf_sch_fund_id, 0, 25000, 'Cash payment for scholarships');
        RAISE NOTICE '  -> Created JE: TPF-JE-002';
    END IF;

    -- --- TPF-ES Transactions ---
    INSERT INTO journal_entries (entity_id, entry_date, description, reference_number, status, total_amount, created_by)
    VALUES (tpf_es_id, '2025-01-20', 'Major donor contribution for environmental projects', 'ES-JE-001', 'Posted', 150000, 'Admin')
    ON CONFLICT (reference_number) DO NOTHING RETURNING id INTO je_id;
    IF je_id IS NOT NULL THEN
        SELECT id INTO cash_account_id FROM accounts WHERE entity_id = tpf_es_id AND code = '1010';
        SELECT id INTO donation_revenue_account_id FROM accounts WHERE entity_id = tpf_es_id AND code = '4020';
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, fund_id, debit_amount, credit_amount, description) VALUES
            (je_id, cash_account_id, es_grnt_fund_id, 150000, 0, 'Cash received'),
            (je_id, donation_revenue_account_id, es_grnt_fund_id, 0, 150000, 'Donor contribution recognized');
        RAISE NOTICE '  -> Created JE: ES-JE-001';
    END IF;

    INSERT INTO journal_entries (entity_id, entry_date, description, reference_number, status, total_amount, created_by)
    VALUES (tpf_es_id, '2025-04-10', 'Lobbying expenses for Q1', 'ES-JE-003', 'Posted', 15000, 'Admin')
    ON CONFLICT (reference_number) DO NOTHING RETURNING id INTO je_id;
    IF je_id IS NOT NULL THEN
        SELECT id INTO lobbying_account_id FROM accounts WHERE entity_id = tpf_es_id AND code = '5030';
        SELECT id INTO ap_account_id FROM accounts WHERE entity_id = tpf_es_id AND code = '2010';
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, fund_id, debit_amount, credit_amount, description) VALUES
            (je_id, lobbying_account_id, es_adv_fund_id, 15000, 0, 'Advocacy expense'),
            (je_id, ap_account_id, es_adv_fund_id, 0, 15000, 'AP to advocacy firm');
        RAISE NOTICE '  -> Created JE: ES-JE-003';
    END IF;

    -- --- IFCSN Transactions ---
    INSERT INTO journal_entries (entity_id, entry_date, description, reference_number, status, total_amount, created_by)
    VALUES (ifcsn_id, '2025-02-05', 'Fundraising gala net income', 'IFCSN-JE-001', 'Posted', 55000, 'Admin')
    ON CONFLICT (reference_number) DO NOTHING RETURNING id INTO je_id;
    IF je_id IS NOT NULL THEN
        SELECT id INTO cash_account_id FROM accounts WHERE entity_id = ifcsn_id AND code = '1010';
        SELECT id INTO donation_revenue_account_id FROM accounts WHERE entity_id = ifcsn_id AND code = '4020';
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, fund_id, debit_amount, credit_amount, description) VALUES
            (je_id, cash_account_id, ifcsn_com_fund_id, 55000, 0, 'Cash received'),
            (je_id, donation_revenue_account_id, ifcsn_com_fund_id, 0, 55000, 'Fundraising gala proceeds');
        RAISE NOTICE '  -> Created JE: IFCSN-JE-001';
    END IF;

    INSERT INTO journal_entries (entity_id, entry_date, description, reference_number, status, total_amount, created_by)
    VALUES (ifcsn_id, '2025-04-20', 'Purchase of new van for community outreach', 'IFCSN-JE-002', 'Posted', 45000, 'Admin')
    ON CONFLICT (reference_number) DO NOTHING RETURNING id INTO je_id;
    IF je_id IS NOT NULL THEN
        SELECT id INTO capital_exp_account_id FROM accounts WHERE entity_id = ifcsn_id AND code = '5040';
        SELECT id INTO cash_account_id FROM accounts WHERE entity_id = ifcsn_id AND code = '1010';
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, fund_id, debit_amount, credit_amount, description) VALUES
            (je_id, capital_exp_account_id, ifcsn_sp_fund_id, 45000, 0, 'Capital expense'),
            (je_id, cash_account_id, ifcsn_sp_fund_id, 0, 45000, 'Cash payment for van purchase');
        RAISE NOTICE '  -> Created JE: IFCSN-JE-002';
    END IF;

    RAISE NOTICE '--- Test Data Seeding Script Finished ---';

END $$;

COMMIT;
