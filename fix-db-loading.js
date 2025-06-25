/**
 * This script explicitly runs the app.init() function after a short delay to ensure
 * that all data is loaded properly.
 */
setTimeout(function() {
    console.log("Running delayed initialization to fix data loading...");
    if (window.ui && window.ui.refreshAllViews && window.app && window.app.getState) {
        try {
            window.ui.refreshAllViews(window.app.getState());
            console.log("Tables and views have been refreshed");
        } catch (err) {
            console.error("Error during refresh:", err);
        }
    } else {
        console.error("Required modules not available for refresh");
    }
}, 2000); // 2 second delay

// Add a button to manually refresh all views if needed
document.addEventListener("DOMContentLoaded", function() {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.right = "10px";
    container.style.bottom = "10px";
    container.style.zIndex = "9999";
    
    const refreshButton = document.createElement("button");
    refreshButton.textContent = "Refresh Data";
    refreshButton.style.padding = "5px 10px";
    refreshButton.style.backgroundColor = "#1976d2";
    refreshButton.style.color = "white";
    refreshButton.style.border = "none";
    refreshButton.style.borderRadius = "4px";
    refreshButton.style.cursor = "pointer";
    
    refreshButton.addEventListener("click", function() {
        if (window.ui && window.ui.refreshAllViews && window.app && window.app.getState) {
            window.ui.refreshAllViews(window.app.getState());
            console.log("Manual refresh triggered");
        }
    });
    
    container.appendChild(refreshButton);
    document.body.appendChild(container);
});
