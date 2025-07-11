/**
 * @file refresh-entity-display.js
 * @description Rebuilds and injects the entity hierarchy display component directly into the main application
 */

// Immediately invoke this function to avoid polluting the global namespace
(async function refreshEntityDisplay() {
  console.log("=== Entity Display Refresher ===");
  console.log("Starting entity display refresh process");
  
  try {
    // 1. Fetch entities from API
    console.log("Fetching entities from API...");
    const entitiesResponse = await fetch('/api/entities');
    if (!entitiesResponse.ok) {
      throw new Error(`Failed to fetch entities: ${entitiesResponse.status}`);
    }
    const entities = await entitiesResponse.json();
    console.log(`Fetched ${entities.length} entities`);
    
    // 2. Fetch funds from API
    console.log("Fetching funds from API...");
    const fundsResponse = await fetch('/api/funds');
    if (!fundsResponse.ok) {
      throw new Error(`Failed to fetch funds: ${fundsResponse.status}`);
    }
    const funds = await fundsResponse.json();
    console.log(`Fetched ${funds.length} funds`);
    
    // 3. Update any global application state if it exists
    if (window.app && window.app._state) {
      console.log("Updating application state directly");
      window.app._state.entities = entities;
      window.app._state.funds = funds;
    }
    
    // 4. Rebuild entity hierarchy
    console.log("Building entity hierarchy data structure");
    const hierarchy = buildHierarchyData(entities, funds);
    
    // 5. Find or create the entity hierarchy container
    console.log("Locating entity hierarchy container");
    const container = document.getElementById('entity-relationship-viz') || 
                     document.querySelector('.entity-relationship-viz') ||
                     document.querySelector('[data-component="entity-hierarchy"]');
    
    if (!container) {
      console.log("Entity hierarchy container not found, creating one");
      createHierarchyContainer();
    } else {
      console.log("Entity hierarchy container found");
      
      // Clear existing content
      container.innerHTML = '';
      
      // Create visualization container
      const vizContainer = document.createElement('div');
      vizContainer.className = 'hierarchy-visualization';
      
      // Add hierarchy tree
      const hierarchyTree = createHierarchyTree(hierarchy);
      vizContainer.appendChild(hierarchyTree);
      
      // Add to container
      container.appendChild(vizContainer);
      
      console.log("Entity hierarchy visualization injected");
    }
    
    // 6. Update entity selector dropdown
    console.log("Updating entity selector dropdown");
    updateEntitySelector(hierarchy);
    
    // 7. Try to activate relevant UI components
    console.log("Activating UI components");
    activateUIComponents();
    
    console.log("Entity display refresh complete");
    return true;
  } catch (error) {
    console.error("Error refreshing entity display:", error);
    return false;
  }
})();

/**
 * Builds a structured hierarchy object from entities and funds
 * @param {Array} entities - List of entities
 * @param {Array} funds - List of funds
 * @returns {Object} Structured hierarchy data
 */
function buildHierarchyData(entities, funds) {
  if (!entities || !Array.isArray(entities)) {
    console.error('Invalid entities data provided');
    return { root: null, entities: {}, flatList: [] };
  }
  
  if (!funds || !Array.isArray(funds)) {
    console.warn('Invalid funds data provided');
    funds = [];
  }
  
  // Define entity types
  const entityTypes = {
    ROOT: 'root',
    ENTITY: 'entity',
    FUND: 'fund'
  };
  
  // Create a map for quick entity lookup
  const entityMap = {};
  entities.forEach(entity => {
    entityMap[entity.id] = {
      ...entity,
      type: entityTypes.ENTITY,
      children: []
    };
  });
  
  // Find the root entity (The Principle Foundation)
  let rootEntity = entities.find(entity => 
    entity.parent_entity_id === null && 
    (entity.name === 'The Principle Foundation' || entity.code === 'TPF_PARENT')
  );
  
  // If no root entity exists yet, use the first entity without a parent
  if (!rootEntity) {
    console.warn('No specific root entity found, using first entity without a parent');
    rootEntity = entities.find(entity => entity.parent_entity_id === null);
  }
  
  if (rootEntity) {
    console.log(`Root entity identified: ${rootEntity.name} (${rootEntity.code})`);
  } else {
    console.warn('No root entity found!');
  }
  
  // Build the entity hierarchy
  const hierarchy = {
    root: rootEntity ? entityMap[rootEntity.id] : null,
    entities: entityMap,
    flatList: entities,
    entityTypes: entityTypes
  };
  
  // Add child entities to their parents
  entities.forEach(entity => {
    if (entity.parent_entity_id && entityMap[entity.parent_entity_id]) {
      entityMap[entity.parent_entity_id].children.push(entityMap[entity.id]);
    }
  });
  
  // Add funds to their respective entities
  funds.forEach(fund => {
    const fundObj = {
      ...fund,
      type: entityTypes.FUND,
      children: []
    };
    
    if (entityMap[fund.entity_id]) {
      entityMap[fund.entity_id].children.push(fundObj);
    } else {
      console.warn(`Fund ${fund.name} (${fund.code}) has invalid entity_id: ${fund.entity_id}`);
    }
  });
  
  return hierarchy;
}

/**
 * Creates a visual tree representation of the entity hierarchy
 * @param {Object} hierarchyData - The structured hierarchy data
 * @returns {HTMLElement} The hierarchy tree element
 */
function createHierarchyTree(hierarchyData) {
  const treeContainer = document.createElement('div');
  treeContainer.className = 'hierarchy-tree';
  
  try {
    // If we have a root entity, build the tree starting from there
    if (hierarchyData.root) {
      console.log(`Building tree from root: ${hierarchyData.root.name}`);
      const rootNode = createHierarchyNode(hierarchyData.root, hierarchyData);
      if (rootNode) {
        rootNode.classList.add('root-node'); // Special class for root node
        treeContainer.appendChild(rootNode);
      }
    } else {
      // Otherwise, show all top-level entities
      console.log('No root entity, showing all top-level entities');
      const entities = hierarchyData.flatList.filter(entity => entity.parent_entity_id === null);
      
      if (entities.length > 0) {
        console.log(`Found ${entities.length} top-level entities`);
        entities.forEach(entity => {
          const entityNode = createHierarchyNode(hierarchyData.entities[entity.id], hierarchyData);
          if (entityNode) {
            treeContainer.appendChild(entityNode);
          }
        });
      } else {
        // No entities exist yet
        console.log('No entities found');
        const noEntitiesMsg = document.createElement('p');
        noEntitiesMsg.textContent = 'No entities have been created yet. Use the "Add Entity" button to create your first entity.';
        treeContainer.appendChild(noEntitiesMsg);
      }
    }
  } catch (error) {
    console.error(`Error creating hierarchy tree: ${error.message}`);
    
    // Create error message
    const errorMsg = document.createElement('div');
    errorMsg.className = 'error-message';
    errorMsg.innerHTML = `<p>Error creating hierarchy tree: ${error.message}</p>`;
    treeContainer.appendChild(errorMsg);
  }
  
  return treeContainer;
}

/**
 * Creates a visual node for an entity or fund in the hierarchy
 * @param {Object} node - The entity or fund data
 * @param {Object} hierarchyData - Full hierarchy data for reference
 * @returns {HTMLElement} The node element
 */
function createHierarchyNode(node, hierarchyData) {
  if (!node) {
    console.warn('Attempted to create node with null data');
    return null;
  }
  
  try {
    const nodeContainer = document.createElement('div');
    nodeContainer.className = `hierarchy-node ${node.type}-node`;
    nodeContainer.dataset.id = node.id;
    nodeContainer.dataset.type = node.type;
    
    // Create node header
    const nodeHeader = document.createElement('div');
    nodeHeader.className = 'node-header';
    
    // Create node title
    const nodeTitle = document.createElement('div');
    nodeTitle.className = 'node-title';
    nodeTitle.textContent = `${node.name} ${node.code ? `(${node.code})` : ''}`;
    
    // Create node actions
    const nodeActions = document.createElement('div');
    nodeActions.className = 'node-actions';
    
    // Add edit button for entities
    if (node.type === hierarchyData.entityTypes.ENTITY) {
      const editButton = document.createElement('button');
      editButton.className = 'btn-icon edit-entity';
      editButton.innerHTML = '<span class="icon">✏️</span>';
      editButton.title = 'Edit Entity';
      editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.modals && typeof window.modals.openEntity === 'function') {
          window.modals.openEntity(node.id);
        }
      });
      nodeActions.appendChild(editButton);
      
      // Add "Add Child" button for entities
      const addChildButton = document.createElement('button');
      addChildButton.className = 'btn-icon add-child';
      addChildButton.innerHTML = '<span class="icon">➕</span>';
      addChildButton.title = 'Add Child Entity';
      addChildButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.modals && typeof window.modals.openEntity === 'function') {
          window.modals.openEntity(null, node.id);
        }
      });
      nodeActions.appendChild(addChildButton);
      
      // Add "Delete" button for entities (except root)
      if (node.parent_entity_id) {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn-icon delete-entity';
        deleteButton.innerHTML = '<span class="icon">🗑️</span>';
        deleteButton.title = 'Delete Entity';
        deleteButton.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Are you sure you want to delete ${node.name}?`)) {
            if (window.entityHierarchy && typeof window.entityHierarchy.deleteEntity === 'function') {
              window.entityHierarchy.deleteEntity(node.id);
            }
          }
        });
        nodeActions.appendChild(deleteButton);
      }
    }
    
    // Add the consolidated indicator for entities that consolidate
    if (node.type === hierarchyData.entityTypes.ENTITY && node.is_consolidated) {
      const consolidatedIndicator = document.createElement('span');
      consolidatedIndicator.className = 'consolidated-indicator';
      consolidatedIndicator.title = 'This entity consolidates its children';
      consolidatedIndicator.textContent = '🔄';
      nodeHeader.appendChild(consolidatedIndicator);
    }
    
    // Assemble the node header
    nodeHeader.appendChild(nodeTitle);
    nodeHeader.appendChild(nodeActions);
    nodeContainer.appendChild(nodeHeader);
    
    // Create children container if this node has children
    if (node.children && node.children.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'node-children';
      
      // Create toggle button for expanding/collapsing children
      const toggleButton = document.createElement('button');
      toggleButton.className = 'toggle-children';
      toggleButton.textContent = '▼';
      toggleButton.addEventListener('click', () => {
        childrenContainer.classList.toggle('collapsed');
        toggleButton.textContent = childrenContainer.classList.contains('collapsed') ? '►' : '▼';
      });
      nodeHeader.insertBefore(toggleButton, nodeTitle);
      
      // Sort children: entities first, then funds
      const entityChildren = node.children.filter(child => child.type === hierarchyData.entityTypes.ENTITY);
      const fundChildren = node.children.filter(child => child.type === hierarchyData.entityTypes.FUND);
      
      // Add entity children
      entityChildren.forEach(child => {
        const childNode = createHierarchyNode(child, hierarchyData);
        if (childNode) {
          childrenContainer.appendChild(childNode);
        }
      });
      
      // Add fund children
      fundChildren.forEach(child => {
        const childNode = createHierarchyNode(child, hierarchyData);
        if (childNode) {
          childrenContainer.appendChild(childNode);
        }
      });
      
      nodeContainer.appendChild(childrenContainer);
    }
    
    return nodeContainer;
  } catch (error) {
    console.error(`Error creating node for ${node.name}: ${error.message}`);
    return null;
  }
}

/**
 * Creates a hierarchy container if one doesn't exist
 */
function createHierarchyContainer() {
  // Try to find the Settings > Entities tab
  const settingsEntitiesTab = document.querySelector('#settings-entities');
  if (!settingsEntitiesTab) {
    console.warn('Settings > Entities tab not found');
    return;
  }
  
  // Create container
  const container = document.createElement('div');
  container.id = 'entity-relationship-viz';
  container.className = 'entity-relationship-viz';
  
  // Find a good place to insert it
  const insertTarget = settingsEntitiesTab.querySelector('h4.mt-20') || 
                     settingsEntitiesTab.querySelector('table') ||
                     settingsEntitiesTab.firstElementChild;
  
  if (insertTarget) {
    settingsEntitiesTab.insertBefore(container, insertTarget.nextSibling);
  } else {
    settingsEntitiesTab.appendChild(container);
  }
  
  // Inject required styles if not already present
  injectStyles();
  
  return container;
}

/**
 * Updates the entity selector dropdown with the current hierarchy
 * @param {Object} hierarchy - The entity hierarchy data
 */
function updateEntitySelector(hierarchy) {
  const entitySelector = document.getElementById('entity-selector');
  if (!entitySelector) {
    console.warn('Entity selector element not found');
    return;
  }
  
  // Clear existing options
  entitySelector.innerHTML = '';
  
  // Add option for the top-level organization
  if (hierarchy.root) {
    const rootOption = document.createElement('option');
    rootOption.value = hierarchy.root.id;
    rootOption.textContent = `${hierarchy.root.name} (All Consolidated)`;
    entitySelector.appendChild(rootOption);
    console.log(`Added root entity to selector: ${hierarchy.root.name}`);
  }
  
  // Add options for second-level entities
  if (hierarchy.root && hierarchy.root.children) {
    hierarchy.root.children
      .filter(child => child.type === hierarchy.entityTypes.ENTITY)
      .forEach(entity => {
        const option = document.createElement('option');
        option.value = entity.id;
        option.textContent = entity.name;
        entitySelector.appendChild(option);
        console.log(`Added entity to selector: ${entity.name}`);
      });
  }
  
  // If no root entity exists yet, add all entities
  if (!hierarchy.root) {
    console.log('No root entity, adding all entities to selector');
    hierarchy.flatList.forEach(entity => {
      const option = document.createElement('option');
      option.value = entity.id;
      option.textContent = entity.name;
      entitySelector.appendChild(option);
    });
  }
  
  // Trigger change event
  const event = new Event('change');
  entitySelector.dispatchEvent(event);
}

/**
 * Activates UI components that might depend on the entity hierarchy
 */
function activateUIComponents() {
  // Try to activate Settings > Entities tab
  const settingsEntitiesTab = document.querySelector('.tab-item[data-tab="settings-entities"]');
  if (settingsEntitiesTab) {
    settingsEntitiesTab.click();
    console.log('Settings > Entities tab activated');
  }
  
  // Try to initialize entity visualization if entity hierarchy module exists
  if (window.entityHierarchy && typeof window.entityHierarchy.initializeHierarchyVisualization === 'function') {
    window.entityHierarchy.initializeHierarchyVisualization(true);
    console.log('Entity hierarchy visualization initialized');
  }
  
  // Trigger dashboard refresh if app module exists
  if (window.app && typeof window.app.refreshDashboard === 'function') {
    window.app.refreshDashboard();
    console.log('Dashboard refreshed');
  }
}

/**
 * Injects required CSS styles for the hierarchy visualization
 */
function injectStyles() {
  const styleId = 'entity-hierarchy-refresher-styles';
  
  // Don't add styles if they already exist
  if (document.getElementById(styleId)) {
    return;
  }
  
  console.log('Injecting hierarchy visualization styles');
  
  const css = `
    .hierarchy-visualization {
      min-height: 300px;
      max-height: 600px;
      overflow: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      margin: 15px 0;
      background-color: #f9f9f9;
    }
    
    .hierarchy-node {
      margin: 5px 0;
      padding: 5px;
      border-left: 3px solid #ccc;
    }
    
    .entity-node {
      border-left-color: #2196F3;
      background-color: #e3f2fd;
    }
    
    .fund-node {
      border-left-color: #4CAF50;
      background-color: #e8f5e9;
    }
    
    .node-header {
      display: flex;
      justify-content: space-between;
      padding: 5px;
      background-color: rgba(255,255,255,0.5);
      border-radius: 3px;
    }
    
    .node-children {
      margin-left: 20px;
      padding-left: 10px;
      border-left: 1px dashed #ccc;
    }
    
    .collapsed {
      display: none;
    }
    
    .toggle-children {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0 5px;
      margin-right: 5px;
    }
    
    .btn-icon {
      background: none;
      border: none;
      cursor: pointer;
      padding: 3px;
      margin: 0 2px;
    }
    
    .consolidated-indicator {
      margin-left: 5px;
      font-size: 12px;
    }
  `;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
}

// Expose the function globally so it can be called from the console
window.refreshEntityDisplay = refreshEntityDisplay;
