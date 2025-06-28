/**
 * @file direct-ui-fix.js
 * @description Aggressive script to force the main UI to display correct entity data,
 *              specifically targeting issues where entity IDs are displayed instead of names.
 *              Designed to be pasted directly into the browser console.
 */

(async function directUiFix() {
  console.log("=== Direct UI Fix Script Started ===");
  console.log("Attempting to force UI to display correct entity data...");

  const TPF_PARENT_ID = "26023d1c-b833-4215-a94e-20d806ed9c64"; // Known ID for TPF_PARENT

  try {
    // 1. Fetch all entities directly from the API
    console.log("Fetching entities from /api/entities...");
    const entitiesResponse = await fetch('/api/entities');
    if (!entitiesResponse.ok) {
      throw new Error(`API Error fetching entities: ${entitiesResponse.status} ${entitiesResponse.statusText}`);
    }
    const entities = await entitiesResponse.json();
    console.log(`Fetched ${entities.length} entities.`);

    // Find the TPF_PARENT entity
    const tpfParentEntity = entities.find(e => e.id === TPF_PARENT_ID);
    if (!tpfParentEntity) {
      console.error(`Error: TPF_PARENT entity with ID ${TPF_PARENT_ID} not found in fetched data.`);
      alert("Direct UI Fix: TPF_PARENT entity not found. Cannot proceed.");
      return;
    }
    const TPF_PARENT_NAME = tpfParentEntity.name;
    console.log(`Identified TPF_PARENT: "${TPF_PARENT_NAME}" (ID: ${TPF_PARENT_ID})`);

    // 2. Fetch all funds directly from the API
    console.log("Fetching funds from /api/funds...");
    const fundsResponse = await fetch('/api/funds');
    if (!fundsResponse.ok) {
      throw new Error(`API Error fetching funds: ${fundsResponse.status} ${fundsResponse.statusText}`);
    }
    const funds = await fundsResponse.json();
    console.log(`Fetched ${funds.length} funds.`);

    // 3. Update global application state (if available)
    if (window.app && window.app._state) {
      console.log("Updating window.app._state with fresh data...");
      window.app._state.entities = entities;
      window.app._state.funds = funds;
      // Ensure selected entity is set to TPF_PARENT for consolidated view if applicable
      window.app._state.selectedEntity = TPF_PARENT_ID;
      window.app._state.isConsolidatedViewActive = true;
      console.log("window.app._state updated.");
    } else {
      console.warn("window.app or window.app._state not found. Skipping direct state update.");
    }

    // 4. Update entity hierarchy module's data (if available)
    if (window.entityHierarchy) {
      console.log("Updating window.entityHierarchy data...");
      // Simulate loadHierarchyData's internal logic to update its state
      window.entityHierarchy._state = window.entityHierarchy._state || {};
      window.entityHierarchy._state.hierarchyData = (function() {
        const entityMap = {};
        entities.forEach(entity => {
          entityMap[entity.id] = { ...entity, type: 'entity', children: [] };
        });

        const hierarchy = {
          root: entityMap[TPF_PARENT_ID],
          entities: entityMap,
          flatList: entities,
          entityTypes: { ROOT: 'root', ENTITY: 'entity', FUND: 'fund' }
        };

        entities.forEach(entity => {
          if (entity.parent_entity_id && entityMap[entity.parent_entity_id]) {
            entityMap[entity.parent_entity_id].children.push(entityMap[entity.id]);
          }
        });

        funds.forEach(fund => {
          if (entityMap[fund.entity_id]) {
            entityMap[fund.entity_id].children.push({ ...fund, type: 'fund', children: [] });
          }
        });
        return hierarchy;
      })();
      console.log("window.entityHierarchy.hierarchyData updated.");
    } else {
      console.warn("window.entityHierarchy not found. Skipping hierarchy data update.");
    }

    // 5. Force re-render of dashboard and UI elements
    console.log("Attempting to force UI re-render...");

    // Try to call app's refresh methods
    if (window.app) {
      if (typeof window.app.loadEntityData === 'function') {
        console.log("Calling app.loadEntityData()...");
        await window.app.loadEntityData();
      }
      if (typeof window.app.loadDashboardData === 'function') {
        console.log("Calling app.loadDashboardData(true)...");
        await window.app.loadDashboardData(true); // Force consolidated view
      }
      if (typeof window.app.refreshDashboard === 'function') {
        console.log("Calling app.refreshDashboard(true)...");
        window.app.refreshDashboard(true);
      }
      if (typeof window.app.render === 'function') {
        console.log("Calling app.render()...");
        window.app.render();
      }
    }

    // Try to call entityHierarchy's refresh methods
    if (window.entityHierarchy) {
      if (typeof window.entityHierarchy.loadHierarchyData === 'function') {
        console.log("Calling entityHierarchy.loadHierarchyData(true)...");
        await window.entityHierarchy.loadHierarchyData(true);
      }
      if (typeof window.entityHierarchy.initializeHierarchyVisualization === 'function') {
        console.log("Calling entityHierarchy.initializeHierarchyVisualization(true)...");
        window.entityHierarchy.initializeHierarchyVisualization(true);
      }
    }

    // 6. Directly manipulate DOM elements to replace IDs with names
    console.log("Searching for and replacing ID displays with entity names...");
    const elements = document.querySelectorAll('*'); // Select all elements
    let replacedCount = 0;

    elements.forEach(el => {
      // Check text content
      if (el.textContent && el.textContent.includes(TPF_PARENT_ID)) {
        const originalText = el.textContent;
        el.textContent = originalText.replace(new RegExp(TPF_PARENT_ID, 'g'), TPF_PARENT_NAME);
        if (originalText !== el.textContent) {
          console.log(`Replaced ID in text content for element:`, el);
          replacedCount++;
        }
      }

      // Check value attribute for inputs/selects
      if (el.value && el.value.includes(TPF_PARENT_ID)) {
        const originalValue = el.value;
        el.value = originalValue.replace(new RegExp(TPF_PARENT_ID, 'g'), TPF_PARENT_NAME);
        if (originalValue !== el.value) {
          console.log(`Replaced ID in value attribute for element:`, el);
          replacedCount++;
        }
      }

      // Check data-id attributes or similar if they might be displaying IDs
      if (el.dataset.id === TPF_PARENT_ID) {
        console.log(`Found element with data-id matching TPF_PARENT_ID:`, el);
        // Attempt to update visible text if it's a common display element
        if (el.tagName === 'OPTION' || el.tagName === 'SPAN' || el.tagName === 'DIV') {
          el.textContent = TPF_PARENT_NAME;
          replacedCount++;
        }
      }
    });
    console.log(`Replaced ${replacedCount} instances of TPF_PARENT_ID with its name.`);

    // 7. Update entity selector dropdown specifically
    const entitySelector = document.getElementById('entity-selector');
    if (entitySelector) {
      console.log("Re-populating and selecting TPF_PARENT in entity selector...");
      entitySelector.innerHTML = ''; // Clear existing options

      // Add TPF_PARENT as the first option and select it
      const rootOption = document.createElement('option');
      rootOption.value = TPF_PARENT_ID;
      rootOption.textContent = `${TPF_PARENT_NAME} (Consolidated)`;
      entitySelector.appendChild(rootOption);

      // Add other entities
      entities.filter(e => e.id !== TPF_PARENT_ID).forEach(entity => {
        const option = document.createElement('option');
        option.value = entity.id;
        option.textContent = entity.name;
        entitySelector.appendChild(option);
      });

      entitySelector.value = TPF_PARENT_ID; // Ensure TPF_PARENT is selected

      // Trigger change event to ensure UI reacts
      const event = new Event('change', { bubbles: true });
      entitySelector.dispatchEvent(event);
      if (window.jQuery) { // If jQuery is present, trigger its change event too
        window.jQuery(entitySelector).change();
      }
      if (typeof entitySelector.onchange === 'function') { // Direct call if handler exists
        entitySelector.onchange();
      }
      console.log("Entity selector updated and change event triggered.");
    } else {
      console.warn("Entity selector (#entity-selector) not found.");
    }

    // Final check and message
    console.log("Direct UI Fix: Attempted all known fixes.");
    alert("Direct UI Fix: Completed. Please check the UI now. You might need to navigate to Settings > Entities or refresh the dashboard.");

  } catch (error) {
    console.error("Direct UI Fix: An error occurred:", error);
    alert(`Direct UI Fix: Failed to apply fix. Error: ${error.message}`);
  }
  console.log("=== Direct UI Fix Script Finished ===");
})();

// Expose globally for re-execution if needed
window.directUiFix = directUiFix;
