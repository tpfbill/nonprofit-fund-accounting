/**
 * direct-hierarchy-fix.js
 * A focused solution to fix the entity hierarchy visualization
 * Ensures funds are properly displayed under their parent entities
 */

(function() {
    // Store reference to the fix function in window for direct access
    window.rebuildEntityHierarchy = applyHierarchyFix;
    
    // Execute when document is fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[DirectHierarchyFix] Script loaded and ready');
        
        // Add a direct fix button to the entity hierarchy section
        const addFixButton = function() {
            const entityViz = document.getElementById('entity-relationship-viz');
            if (entityViz && !document.getElementById('rebuild-hierarchy-btn')) {
                const fixButton = document.createElement('button');
                fixButton.id = 'rebuild-hierarchy-btn';
                fixButton.textContent = 'Rebuild Hierarchy';
                fixButton.className = 'action-button';
                fixButton.style.marginBottom = '10px';
                fixButton.addEventListener('click', applyHierarchyFix);
                
                // Insert before the visualization
                entityViz.parentNode.insertBefore(fixButton, entityViz);
                console.log('[DirectHierarchyFix] Fix button added');
            }
        };
        
        // Add fix button when entities tab is shown in settings
        // Use a direct approach instead of mutation observer
        const entitiesTab = document.querySelector('.tab-item[data-tab="settings-entities"]');
        if (entitiesTab) {
            // Use the original click handler, don't override it
            const originalClickHandler = entitiesTab.onclick;
            entitiesTab.onclick = function(e) {
                // Call the original handler if it exists
                if (typeof originalClickHandler === 'function') {
                    originalClickHandler.call(this, e);
                }
                
                // Add our button after a slight delay
                setTimeout(function() {
                    addFixButton();
                    // Apply the fix automatically
                    setTimeout(applyHierarchyFix, 300);
                }, 100);
            };
        }
        
        // Check if we're already on the settings-entities tab
        if (document.getElementById('settings-page') && 
            document.getElementById('settings-page').classList.contains('active')) {
            const entitiesPanel = document.getElementById('settings-entities');
            if (entitiesPanel && entitiesPanel.classList.contains('active')) {
                // We're already on the entities tab, add the button
                setTimeout(function() {
                    addFixButton();
                    // Apply the fix automatically
                    setTimeout(applyHierarchyFix, 300);
                }, 500);
            }
        }
    });
    
    /**
     * Main function to fix the entity hierarchy visualization
     */
    function applyHierarchyFix() {
        console.log('[DirectHierarchyFix] Applying hierarchy fix...');
        
        // Get the visualization container
        const vizContainer = document.getElementById('entity-relationship-viz');
        if (!vizContainer) {
            console.error('[DirectHierarchyFix] Visualization container not found');
            return;
        }
        
        // Check if appState is available
        if (!window.appState) {
            console.error('[DirectHierarchyFix] appState not available');
            vizContainer.innerHTML = '<p>Error: Application state not available</p>';
            return;
        }
        
        // Check if entities and funds are loaded
        if (!window.appState.entities || !window.appState.funds) {
            console.error('[DirectHierarchyFix] Entities or funds not loaded');
            vizContainer.innerHTML = '<p>Error: Entity or fund data not loaded</p>';
            return;
        }
        
        console.log('[DirectHierarchyFix] Found', 
            window.appState.entities.length, 'entities and', 
            window.appState.funds.length, 'funds');
        
        // Clear existing content
        vizContainer.innerHTML = '';
        
        // Add custom styles for the visualization
        addCustomStyles();
        
        // Build entity map with stringified IDs for consistent comparison
        const entityMap = {};
        window.appState.entities.forEach(entity => {
            entityMap[String(entity.id)] = {
                ...entity,
                id: String(entity.id),
                children: []
            };
        });
        
        // Find root entity (TPF_PARENT or first top-level entity)
        const rootEntity = window.appState.entities.find(e => 
            e.parent_entity_id === null && 
            (e.name === 'The Principle Foundation' || e.code === 'TPF_PARENT')
        ) || window.appState.entities.find(e => e.parent_entity_id === null);
        
        if (!rootEntity) {
            console.error('[DirectHierarchyFix] No root entity found');
            vizContainer.innerHTML = '<p>Error: No root entity found</p>';
            return;
        }
        
        // Build parent-child relationships
        window.appState.entities.forEach(entity => {
            if (entity.parent_entity_id) {
                const parentId = String(entity.parent_entity_id);
                const childId = String(entity.id);
                
                if (entityMap[parentId]) {
                    entityMap[parentId].children.push(entityMap[childId]);
                }
            }
        });
        
        // Associate funds with their parent entities
        window.appState.funds.forEach(fund => {
            const entityId = String(fund.entity_id);
            
            if (entityMap[entityId]) {
                // Add fund to its parent entity's children
                entityMap[entityId].children.push({
                    ...fund,
                    id: String(fund.id),
                    isFund: true,  // Mark as fund for rendering
                    children: []   // Funds don't have children
                });
                
                console.log('[DirectHierarchyFix] Added fund', 
                    fund.name, 'to entity', entityMap[entityId].name);
            } else {
                console.warn('[DirectHierarchyFix] Fund', fund.name, 
                    'has unknown entity_id:', fund.entity_id);
            }
        });
        
        // Create the hierarchy container
        const hierarchyContainer = document.createElement('div');
        hierarchyContainer.className = 'direct-hierarchy-container';
        
        // Render the root entity and its children
        const rootNode = renderEntityNode(entityMap[String(rootEntity.id)]);
        hierarchyContainer.appendChild(rootNode);
        
        // Add to the visualization container
        vizContainer.appendChild(hierarchyContainer);
        
        console.log('[DirectHierarchyFix] Hierarchy visualization rebuilt successfully');
        
        // Log the counts of funds under each entity for debugging
        logFundCounts(entityMap, rootEntity);
    }
    
    /**
     * Render an entity node and its children
     */
    function renderEntityNode(entity) {
        // Create node container
        const nodeContainer = document.createElement('div');
        nodeContainer.className = entity.isFund ? 'direct-fund-node' : 'direct-entity-node';
        nodeContainer.dataset.id = entity.id;
        nodeContainer.dataset.code = entity.code;
        
        // Create node header
        const nodeHeader = document.createElement('div');
        nodeHeader.className = 'direct-node-header';
        
        // Create node title
        const nodeTitle = document.createElement('div');
        nodeTitle.className = 'direct-node-title';
        nodeTitle.textContent = `${entity.name} (${entity.code})`;
        
        // Add consolidated indicator if applicable
        if (!entity.isFund && entity.is_consolidated) {
            const consolidatedIndicator = document.createElement('span');
            consolidatedIndicator.className = 'direct-consolidated-indicator';
            consolidatedIndicator.textContent = ' [Consolidated]';
            nodeTitle.appendChild(consolidatedIndicator);
        }
        
        // Assemble the header
        nodeHeader.appendChild(nodeTitle);
        nodeContainer.appendChild(nodeHeader);
        
        // Add children if any
        if (entity.children && entity.children.length > 0) {
            // Create toggle button
            const toggleButton = document.createElement('button');
            toggleButton.className = 'direct-toggle-button';
            toggleButton.textContent = '▼';
            nodeHeader.insertBefore(toggleButton, nodeHeader.firstChild);
            
            // Create children container
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'direct-children-container';
            
            // Toggle functionality
            toggleButton.addEventListener('click', function(e) {
                // Stop event propagation to prevent conflicts with other handlers
                e.stopPropagation();
                childrenContainer.classList.toggle('collapsed');
                toggleButton.textContent = childrenContainer.classList.contains('collapsed') ? '►' : '▼';
            });
            
            // Sort children: entities first, then funds
            const entityChildren = entity.children.filter(child => !child.isFund);
            const fundChildren = entity.children.filter(child => child.isFund);
            
            // Log children counts
            console.log('[DirectHierarchyFix]', entity.name, 'has', 
                entityChildren.length, 'entity children and', 
                fundChildren.length, 'fund children');
            
            // Render entity children
            entityChildren.forEach(child => {
                const childNode = renderEntityNode(child);
                childrenContainer.appendChild(childNode);
            });
            
            // Render fund children
            fundChildren.forEach(fund => {
                const fundNode = renderEntityNode(fund);
                childrenContainer.appendChild(fundNode);
            });
            
            // Add children container to node
            nodeContainer.appendChild(childrenContainer);
        }
        
        return nodeContainer;
    }
    
    /**
     * Add custom styles for the direct hierarchy visualization
     */
    function addCustomStyles() {
        // Check if styles already exist
        if (document.getElementById('direct-hierarchy-styles')) {
            return;
        }
        
        // Create style element
        const styleElement = document.createElement('style');
        styleElement.id = 'direct-hierarchy-styles';
        
        // Define styles
        styleElement.textContent = `
            .direct-hierarchy-container {
                margin: 20px 0;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 5px;
                background-color: #f9f9f9;
                max-height: 600px;
                overflow: auto;
            }
            
            .direct-entity-node, .direct-fund-node {
                margin: 5px 0;
                border-radius: 4px;
            }
            
            .direct-node-header {
                display: flex;
                align-items: center;
                padding: 10px;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .direct-entity-node > .direct-node-header {
                background-color: #5bc0be;
                color: #1c2541;
                border-left: 5px solid #3a506b;
            }
            
            .direct-fund-node > .direct-node-header {
                background-color: #fff9e6;
                color: #5d4037;
                border-left: 5px solid #ffb74d;
                font-weight: 600;
                margin-left: 20px;
            }
            
            .direct-fund-node > .direct-node-header:hover {
                background-color: #fff3cd;
            }
            
            .direct-node-title {
                flex-grow: 1;
            }
            
            .direct-toggle-button {
                background: none;
                border: none;
                color: #333;
                cursor: pointer;
                font-size: 12px;
                margin-right: 8px;
                padding: 0;
            }
            
            .direct-children-container {
                margin-left: 25px;
                padding-left: 15px;
                border-left: 1px dashed #ccc;
                overflow: hidden;
            }
            
            .direct-children-container.collapsed {
                display: none;
            }
            
            .direct-consolidated-indicator {
                margin-left: 8px;
                font-size: 12px;
                padding: 2px 5px;
                background-color: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
            }
        `;
        
        // Add to document head
        document.head.appendChild(styleElement);
        console.log('[DirectHierarchyFix] Custom styles added');
    }
    
    /**
     * Log fund counts for each entity (for debugging)
     */
    function logFundCounts(entityMap, rootEntity) {
        console.log('[DirectHierarchyFix] Fund counts by entity:');
        
        // Get second-level entities
        const secondLevelEntities = window.appState.entities.filter(
            e => e.parent_entity_id === rootEntity.id
        );
        
        secondLevelEntities.forEach(entity => {
            const entityFunds = window.appState.funds.filter(
                f => f.entity_id === entity.id
            );
            
            console.log(`  - ${entity.name} (${entity.code}): ${entityFunds.length} funds`);
            
            if (entityFunds.length > 0) {
                console.log('    Funds:', entityFunds.map(f => f.name).join(', '));
                
                // Check if these funds appear in the entity's children
                const entityNode = entityMap[String(entity.id)];
                const fundChildren = entityNode.children.filter(c => c.isFund);
                
                console.log(`    In hierarchy: ${fundChildren.length} funds`);
                if (fundChildren.length > 0) {
                    console.log('    Hierarchy funds:', fundChildren.map(f => f.name).join(', '));
                }
            }
        });
    }
})();
