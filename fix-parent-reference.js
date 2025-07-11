/**
 * @file fix-parent-reference.js
 * @description Fixes the self-reference in TPF_PARENT entity
 */

const { Client } = require('pg');
const { getDbConfig } = require('./src/db/db-config');

async function fixParentReference() {
  const client = new Client(getDbConfig());
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    
    console.log('Finding TPF_PARENT entity...');
    const findResult = await client.query(
      'SELECT id, code, name, parent_entity_id FROM entities WHERE code = $1',
      ['TPF_PARENT']
    );
    
    if (findResult.rows.length === 0) {
      console.error('TPF_PARENT entity not found!');
      return;
    }
    
    const tpfParent = findResult.rows[0];
    console.log('Found TPF_PARENT:', tpfParent);
    
    // Check if it has a self-reference
    if (tpfParent.parent_entity_id === tpfParent.id) {
      console.log('TPF_PARENT has a self-reference. Fixing...');
      
      // Fix the reference by setting parent to NULL
      await client.query(
        'UPDATE entities SET parent_entity_id = NULL WHERE id = $1',
        [tpfParent.id]
      );
      
      console.log('Self-reference fixed! TPF_PARENT now has no parent.');
    } else {
      console.log('TPF_PARENT does not have a self-reference. Current parent_entity_id:', tpfParent.parent_entity_id);
    }
    
    // Fix TPF, TPF-ES, and IFCSN entities to ensure they have TPF_PARENT as parent
    const childCodes = ['TPF', 'TPF-ES', 'IFCSN'];
    for (const code of childCodes) {
      const findChildResult = await client.query(
        'SELECT id, code, name, parent_entity_id FROM entities WHERE code = $1',
        [code]
      );
      
      if (findChildResult.rows.length === 0) {
        console.log(`${code} entity not found.`);
        continue;
      }
      
      const childEntity = findChildResult.rows[0];
      
      if (childEntity.parent_entity_id !== tpfParent.id) {
        console.log(`${code} has incorrect parent (${childEntity.parent_entity_id}). Setting to TPF_PARENT...`);
        
        await client.query(
          'UPDATE entities SET parent_entity_id = $1 WHERE id = $2',
          [tpfParent.id, childEntity.id]
        );
        
        console.log(`Fixed ${code} parent relationship.`);
      } else {
        console.log(`${code} already has TPF_PARENT as parent.`);
      }
    }
    
    // Verify the hierarchy
    const hierarchyResult = await client.query(`
      SELECT e.id, e.code, e.name, 
             p.id as parent_id, p.code as parent_code, p.name as parent_name
      FROM entities e
      LEFT JOIN entities p ON e.parent_entity_id = p.id
      WHERE e.code IN ('TPF_PARENT', 'TPF', 'TPF-ES', 'IFCSN')
      ORDER BY e.code
    `);
    
    console.log('\nVerified entity hierarchy:');
    console.table(hierarchyResult.rows);
    
    console.log('\nHierarchy fix complete!');
    
  } catch (error) {
    console.error('Error fixing entity references:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

fixParentReference().catch(console.error);
