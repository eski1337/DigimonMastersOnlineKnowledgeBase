// Inject Import Digimon button next to Create New
(function() {
  function addImportButton() {
    // Check if we're on the Digimon collection page
    if (!window.location.pathname.includes('/admin/collections/digimon')) {
      return;
    }

    // Check if button already exists
    if (document.querySelector('.import-digimon-btn')) {
      return;
    }

    // Find the "Create New" button
    const createButton = document.querySelector('.collection-list__header .btn');
    
    if (createButton) {
      // Create the import button
      const importButton = document.createElement('a');
      importButton.href = '/import-digimon';
      importButton.target = '_blank';
      importButton.className = 'import-digimon-btn';
      importButton.textContent = 'Import from DMO Wiki';
      
      // Insert after the Create New button
      const container = document.createElement('span');
      container.className = 'import-btn-container';
      container.appendChild(importButton);
      
      createButton.parentNode.insertBefore(container, createButton.nextSibling);
    }
  }

  // Try to add button when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addImportButton);
  } else {
    addImportButton();
  }

  // Also try after a short delay (for React rendering)
  setTimeout(addImportButton, 500);
  setTimeout(addImportButton, 1000);
  setTimeout(addImportButton, 2000);

  // Watch for URL changes (SPA navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(addImportButton, 500);
    }
  }).observe(document, {subtree: true, childList: true});
})();
