-- add_top_level_organization.sql
-- Add The Principle Foundation as top-level organization and restructure entity hierarchy

-- First, declare a variable to store the UUID for the new top-level entity
DO $$
DECLARE
    tpf_parent_id UUID;
BEGIN
    -- Generate a UUID for the new top-level entity
    tpf_parent_id := gen_random_uuid();
    
    -- Insert The Principle Foundation as the top-level organization
    INSERT INTO entities (
        id, 
        name, 
        code, 
        parent_entity_id, 
        is_consolidated, 
        fiscal_year_start, 
        base_currency, 
        status
    ) VALUES (
        tpf_parent_id,
        'The Principle Foundation',
        'TPF_PARENT',
        NULL, -- No parent (this is the top level)
        TRUE, -- Enable consolidation at the top level
        '01-01', -- Fiscal year starts January 1
        'USD', -- Base currency is USD
        'Active'
    );
    
    -- Update existing entities to set The Principle Foundation as their parent
    -- This assumes the entities TPF, TPF-ES, and IFCSN already exist
    UPDATE entities 
    SET parent_entity_id = tpf_parent_id,
        is_consolidated = FALSE -- Child entities don't consolidate by default
    WHERE code IN ('TPF', 'TPF-ES', 'IFCSN') 
       OR name IN ('The Principle Foundation', 'TPF', 'TPF-ES', 'IFCSN')
       AND parent_entity_id IS NULL; -- Only update entities that don't already have a parent
    
    -- Set the middle-tier entities to consolidate their funds
    UPDATE entities
    SET is_consolidated = TRUE
    WHERE parent_entity_id = tpf_parent_id;
    
    -- Output the changes made
    RAISE NOTICE 'Added The Principle Foundation as top-level entity with ID: %', tpf_parent_id;
    RAISE NOTICE 'Updated child entities to reference the new parent entity';
END $$;

-- Verify the hierarchy structure
SELECT 
    e1.id as entity_id,
    e1.name as entity_name,
    e1.code as entity_code,
    e1.is_consolidated as consolidates_children,
    e2.name as parent_name
FROM 
    entities e1
LEFT JOIN 
    entities e2 ON e1.parent_entity_id = e2.id
ORDER BY 
    CASE WHEN e1.parent_entity_id IS NULL THEN 0 ELSE 1 END,
    e1.name;
