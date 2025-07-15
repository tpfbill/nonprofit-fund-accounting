/**
 * debug-save-button.js
 * 
 * This script helps diagnose issues with the entity save button functionality.
 * Paste this entire script into your browser console while on the application page.
 * 
 * It will:
 * 1. Check if the save button exists
 * 2. Check if event listeners are attached
 * 3. Test the saveEntity function directly
 * 4. Check for any JavaScript errors
 * 5. Test opening the modal and saving an entity
 * 6. Provide detailed logging of what's happening
 */

(async function() {
  console.clear();
  console.log('%c Entity Save Button Diagnostics', 'font-size: 16px; font-weight: bold; color: blue;');
  console.log('='.repeat(50));

  // Set up error tracking
  const originalConsoleError = console.error;
  console.error = function(...args) {
    console.log('%c ERROR DETECTED:', 'color: red; font-weight: bold;', ...args);
    originalConsoleError.apply(console, args);
  };

  window.addEventListener('error', function(e) {
    console.log('%c UNHANDLED ERROR:', 'color: red; font-weight: bold; background: yellow;', e.message);
  });

  // Step 1: Check if the save button exists
  console.log('Step 1: Checking if save button exists...');
  const saveButton = document.getElementById('btn-save-entity');
  
  if (!saveButton) {
    console.log('%c ❌ Save button not found in DOM!', 'color: red; font-weight: bold;');
    console.log('This could mean:');
    console.log('  - The button ID is different than expected');
    console.log('  - The modal has not been opened yet');
    console.log('  - The button is not in the DOM');
    
    // Try to find it with a different selector
    const possibleButtons = Array.from(document.querySelectorAll('button'))
      .filter(btn => btn.textContent.toLowerCase().includes('save') && btn.closest('#entity-modal'));
    
    if (possibleButtons.length > 0) {
      console.log('%c Found possible save buttons:', 'color: orange;');
      possibleButtons.forEach((btn, i) => {
        console.log(`  ${i+1}. ID: "${btn.id}", Text: "${btn.textContent.trim()}", Classes: "${btn.className}"`);
      });
    }
  } else {
    console.log('%c ✅ Save button found!', 'color: green;');
    console.log(`  ID: ${saveButton.id}`);
    console.log(`  Text: "${saveButton.textContent.trim()}"`);
    console.log(`  Classes: "${saveButton.className}"`);
    console.log(`  Visible: ${saveButton.offsetParent !== null}`);
    console.log(`  Disabled: ${saveButton.disabled}`);
    
    // Step 2: Check if event listeners are attached
    console.log('\nStep 2: Checking for event listeners...');
    
    // Unfortunately, there's no standard way to check for event listeners
    // We'll use a workaround by replacing the addEventListener method temporarily
    console.log('  Testing click event by directly triggering it...');
    
    // Create a flag to track if the click event is handled
    window.saveButtonClicked = false;
    
    // Create a wrapper function to detect clicks
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (this === saveButton && type === 'click') {
        console.log('%c ✅ Event listener being attached to save button now!', 'color: green;');
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    // Restore original method
    setTimeout(() => {
      EventTarget.prototype.addEventListener = originalAddEventListener;
    }, 1000);
    
    // Try to detect existing listeners by monkey-patching click method
    const originalClick = HTMLElement.prototype.click;
    HTMLElement.prototype.click = function() {
      if (this === saveButton) {
        console.log('%c Button.click() method called', 'color: blue;');
        window.saveButtonClicked = true;
      }
      return originalClick.call(this);
    };
    
    // Step 3: Test the saveEntity function directly
    console.log('\nStep 3: Testing saveEntity function directly...');
    
    if (typeof saveEntity === 'function') {
      console.log('%c ✅ saveEntity function exists', 'color: green;');
      
      try {
        // Backup current form values
        const backupEntityId = document.getElementById('entity-id-edit')?.value;
        const backupEntityName = document.getElementById('entity-name-input')?.value;
        const backupEntityCode = document.getElementById('entity-code-input')?.value;
        
        // Set test values
        if (document.getElementById('entity-id-edit')) document.getElementById('entity-id-edit').value = '';
        if (document.getElementById('entity-name-input')) document.getElementById('entity-name-input').value = 'Test Entity ' + new Date().toISOString();
        if (document.getElementById('entity-code-input')) document.getElementById('entity-code-input').value = 'TEST' + Math.floor(Math.random() * 1000);
        
        console.log('  Calling saveEntity() directly...');
        const result = await saveEntity();
        
        console.log('%c saveEntity() returned:', 'color: blue;', result);
        
        // Restore backup values
        if (document.getElementById('entity-id-edit')) document.getElementById('entity-id-edit').value = backupEntityId || '';
        if (document.getElementById('entity-name-input')) document.getElementById('entity-name-input').value = backupEntityName || '';
        if (document.getElementById('entity-code-input')) document.getElementById('entity-code-input').value = backupEntityCode || '';
        
      } catch (err) {
        console.log('%c ❌ Error calling saveEntity():', 'color: red;', err);
        console.log('  Error details:', err.message);
        console.log('  Stack trace:', err.stack);
      }
    } else {
      console.log('%c ❌ saveEntity function does not exist!', 'color: red; font-weight: bold;');
      console.log('  This could mean:');
      console.log('  - The function name is different than expected');
      console.log('  - The function is not in global scope');
      console.log('  - The function has not been defined yet');
      
      // Look for similar functions
      const globalFunctions = Object.keys(window).filter(key => typeof window[key] === 'function');
      const possibleSaveFunctions = globalFunctions.filter(name => 
        name.toLowerCase().includes('save') && name.toLowerCase().includes('entity')
      );
      
      if (possibleSaveFunctions.length > 0) {
        console.log('%c Found possible save entity functions:', 'color: orange;');
        possibleSaveFunctions.forEach(name => console.log(`  - ${name}`));
      }
    }
    
    // Step 4: Check for any JavaScript errors
    console.log('\nStep 4: Checking for JavaScript errors...');
    
    // Look for any error indicators in the console
    if (window.jsErrors && window.jsErrors.length > 0) {
      console.log('%c ❌ Found JavaScript errors:', 'color: red;');
      window.jsErrors.forEach((err, i) => {
        console.log(`  ${i+1}. ${err.message}`);
      });
    } else {
      console.log('%c ✅ No JavaScript errors detected in our tracker', 'color: green;');
    }
    
    // Step 5: Test opening the modal and saving an entity
    console.log('\nStep 5: Testing modal and save functionality...');
    
    // Check if modal exists
    const entityModal = document.getElementById('entity-modal');
    if (!entityModal) {
      console.log('%c ❌ Entity modal not found!', 'color: red;');
    } else {
      console.log('%c ✅ Entity modal found', 'color: green;');
      console.log(`  Visible: ${entityModal.style.display !== 'none' && !entityModal.classList.contains('hidden')}`);
      
      // Try to open the modal
      console.log('  Attempting to open modal...');
      if (typeof openEntityModal === 'function') {
        try {
          openEntityModal();
          console.log('%c ✅ openEntityModal() called successfully', 'color: green;');
          
          // Wait a bit and check if modal is visible
          setTimeout(() => {
            if (entityModal.style.display !== 'none' && !entityModal.classList.contains('hidden')) {
              console.log('%c ✅ Modal appears to be open', 'color: green;');
              
              // Now try clicking the save button
              console.log('  Attempting to click save button...');
              saveButton.click();
              
              setTimeout(() => {
                if (window.saveButtonClicked) {
                  console.log('%c ✅ Save button click was detected', 'color: green;');
                } else {
                  console.log('%c ❌ Save button click was not detected', 'color: red;');
                }
                
                // Check if modal closed
                if (entityModal.style.display === 'none' || entityModal.classList.contains('hidden')) {
                  console.log('%c ✅ Modal closed after save attempt', 'color: green;');
                } else {
                  console.log('%c ❌ Modal still open after save attempt', 'color: red;');
                }
                
                // Restore click method
                HTMLElement.prototype.click = originalClick;
                
                // Final summary
                console.log('\nStep 6: Debug Summary');
                console.log('='.repeat(50));
                if (!saveButton) {
                  console.log('%c Major Issue: Save button not found', 'color: red; font-weight: bold;');
                } else if (typeof saveEntity !== 'function') {
                  console.log('%c Major Issue: saveEntity function not found', 'color: red; font-weight: bold;');
                } else if (!window.saveButtonClicked) {
                  console.log('%c Major Issue: Save button click not handled', 'color: red; font-weight: bold;');
                  console.log('Possible solution: The event listener may not be attached correctly.');
                  console.log('Try adding this code to fix it:');
                  console.log(`
document.getElementById('btn-save-entity').addEventListener('click', async function() {
  console.log('Save button clicked!');
  try {
    await saveEntity();
  } catch (err) {
    console.error('Error in save entity:', err);
  }
});`);
                } else {
                  console.log('%c No major issues detected in button functionality', 'color: green;');
                  console.log('If problems persist, check network requests and server responses.');
                }
              }, 1000);
            } else {
              console.log('%c ❌ Modal did not open', 'color: red;');
            }
          }, 500);
        } catch (err) {
          console.log('%c ❌ Error opening modal:', 'color: red;', err);
        }
      } else {
        console.log('%c ❌ openEntityModal function not found', 'color: red;');
      }
    }
  }
})();
