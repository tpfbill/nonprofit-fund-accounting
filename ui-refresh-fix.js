/**
 * @file ui-refresh-fix.js
 * @description Script to diagnose and fix UI data display issues
 */

const { Client } = require('pg');
const { getDbConfig } = require('./src/db/db-config');

async function fixUIIssues() {
  const client = new Client(getDbConfig());
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database');
    
    console.log('\n=== Checking TPF Hierarchy Entities ===');
    const entityResult = await client.query(`
      SELECT e.id, e.code, e.name, 
             p.code as parent_code, p.name as parent_name,
             e.is_consolidated
      FROM entities e
      LEFT JOIN entities p ON e.parent_entity_id = p.id
      WHERE e.code IN ('TPF_PARENT', 'TPF', 'TPF-ES', 'IFCSN')
      ORDER BY e.code
    `);
    
    if (entityResult.rows.length === 0) {
      console.error('Error: TPF hierarchy entities not found in the database!');
      return;
    } else {
      console.log(`Found ${entityResult.rows.length} TPF hierarchy entities:`);
      console.table(entityResult.rows);
    }
    
    console.log('\n=== Checking Funds for TPF Hierarchy ===');
    const fundResult = await client.query(`
      SELECT f.id, f.code, f.name, f.balance,
             e.code as entity_code, e.name as entity_name
      FROM funds f
      JOIN entities e ON f.entity_id = e.id
      WHERE e.code IN ('TPF', 'TPF-ES', 'IFCSN')
      ORDER BY e.code, f.code
    `);
    
    if (fundResult.rows.length === 0) {
      console.error('Error: No funds found for TPF hierarchy entities!');
      return;
    } else {
      console.log(`Found ${fundResult.rows.length} funds for TPF hierarchy entities:`);
      console.table(fundResult.rows);
    }
    
    console.log('\n=== Checking Journal Entries for TPF Hierarchy ===');
    const jeResult = await client.query(`
      SELECT je.id, je.reference_number, je.entry_date, je.description, je.total_amount,
             e.code as entity_code, e.name as entity_name
      FROM journal_entries je
      JOIN entities e ON je.entity_id = e.id
      WHERE e.code IN ('TPF', 'TPF-ES', 'IFCSN')
      ORDER BY je.entry_date DESC
      LIMIT 10
    `);
    
    if (jeResult.rows.length === 0) {
      console.error('Error: No journal entries found for TPF hierarchy entities!');
      return;
    } else {
      console.log(`Found ${jeResult.rows.length} journal entries for TPF hierarchy entities:`);
      console.table(jeResult.rows);
    }
    
    // If all looks good, ensure TPF_PARENT has proper relationships
    console.log('\n=== Ensuring TPF_PARENT is properly set up ===');
    
    // 1. Find TPF_PARENT entity
    const tpfParentResult = await client.query("SELECT id FROM entities WHERE code = 'TPF_PARENT'");
    
    if (tpfParentResult.rows.length === 0) {
      console.error('Error: TPF_PARENT entity not found!');
      return;
    }
    
    const tpfParentId = tpfParentResult.rows[0].id;
    console.log(`Found TPF_PARENT with ID: ${tpfParentId}`);
    
    // 2. Check self-reference
    const selfRefResult = await client.query(
      'SELECT parent_entity_id FROM entities WHERE id = $1',
      [tpfParentId]
    );
    
    if (selfRefResult.rows[0].parent_entity_id === tpfParentId) {
      console.log('Found self-reference in TPF_PARENT. Fixing...');
      
      await client.query(
        'UPDATE entities SET parent_entity_id = NULL WHERE id = $1',
        [tpfParentId]
      );
      
      console.log('Fixed TPF_PARENT self-reference');
    } else if (selfRefResult.rows[0].parent_entity_id !== null) {
      console.log('TPF_PARENT has a non-null parent. Setting to NULL...');
      
      await client.query(
        'UPDATE entities SET parent_entity_id = NULL WHERE id = $1',
        [tpfParentId]
      );
      
      console.log('Fixed TPF_PARENT parent reference');
    } else {
      console.log('TPF_PARENT parent reference is correctly set to NULL');
    }
    
    // 3. Check TPF_PARENT has is_consolidated set to true
    const consolidatedResult = await client.query(
      'SELECT is_consolidated FROM entities WHERE id = $1',
      [tpfParentId]
    );
    
    if (!consolidatedResult.rows[0].is_consolidated) {
      console.log('TPF_PARENT is not set as consolidated. Fixing...');
      
      await client.query(
        'UPDATE entities SET is_consolidated = TRUE WHERE id = $1',
        [tpfParentId]
      );
      
      console.log('Set TPF_PARENT as consolidated');
    } else {
      console.log('TPF_PARENT is correctly set as consolidated');
    }
    
    // 4. Check child entities have TPF_PARENT as parent
    const childEntities = ['TPF', 'TPF-ES', 'IFCSN'];
    for (const code of childEntities) {
      const entityResult = await client.query(
        'SELECT id, parent_entity_id FROM entities WHERE code = $1',
        [code]
      );
      
      if (entityResult.rows.length === 0) {
        console.log(`Entity ${code} not found`);
        continue;
      }
      
      const entity = entityResult.rows[0];
      
      if (entity.parent_entity_id !== tpfParentId) {
        console.log(`${code} has incorrect parent. Fixing...`);
        
        await client.query(
          'UPDATE entities SET parent_entity_id = $1 WHERE id = $2',
          [tpfParentId, entity.id]
        );
        
        console.log(`Fixed ${code} parent relationship`);
      } else {
        console.log(`${code} already has TPF_PARENT as parent`);
      }
    }
    
    console.log('\n=== Fix Complete ===');
    console.log('The TPF hierarchy has been verified and fixed. The UI should now display the data correctly.');
    console.log('Please restart the server to ensure the changes take effect.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the script
fixUIIssues().catch(console.error);
