export function initCopyCodeButtons() {
  // Find all pre elements (code blocks)
  const preElements = document.querySelectorAll('pre');
  
  preElements.forEach((pre) => {
    // Skip if already processed
    if (pre.parentElement?.classList.contains('code-block-wrapper')) {
      return;
    }
    
    // Get the code content
    const code = pre.textContent || '';
    
    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper group';
    
    // Insert wrapper before pre element
    pre.parentNode?.insertBefore(wrapper, pre);
    
    // Move pre element into wrapper
    wrapper.appendChild(pre);
    
    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.innerHTML = `
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path>
        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path>
      </svg>
      Copy
    `;
    
    // Add click handler
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code);
        copyButton.innerHTML = `
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
          Copied!
        `;
        
        setTimeout(() => {
          copyButton.innerHTML = `
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path>
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path>
            </svg>
            Copy
          `;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
        copyButton.textContent = 'Failed';
        setTimeout(() => {
          copyButton.innerHTML = `
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path>
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path>
            </svg>
            Copy
          `;
        }, 2000);
      }
    });
    
    // Add button to wrapper
    wrapper.appendChild(copyButton);
  });
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', initCopyCodeButtons);

// Also initialize on navigation (for SPA-like behavior)
document.addEventListener('astro:page-load', initCopyCodeButtons);