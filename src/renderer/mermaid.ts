let mermaidModule: typeof import('mermaid').default | null = null;
let currentRenderToken = 0;

/**
 * Lazily loads the Mermaid.js library
 */
async function getMermaid() {
  if (!mermaidModule) {
    const imported = await import('mermaid');
    const mermaid = imported.default;
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif',
      themeVariables: {
        darkMode: true,
        background: '#0E1015',
        primaryColor: '#5E6AD2',
        primaryTextColor: '#F7F8F8',
        primaryBorderColor: '#5E6AD2',
        lineColor: '#8A8F98',
        secondaryColor: '#16181D',
        tertiaryColor: '#08090A',
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
      },
    });
    mermaidModule = mermaid;
  }
  return mermaidModule;
}

/**
 * Render all .mermaid-diagram elements within the container
 */
export async function renderMermaidDiagrams(container: HTMLElement): Promise<boolean> {
  const elements = container.querySelectorAll<HTMLElement>('.mermaid-diagram');
  if (elements.length === 0) {
    return true;
  }

  const token = ++currentRenderToken;
  let hasError = false;

  try {
    const mermaid = await getMermaid();
    if (token !== currentRenderToken) return true; // Discard outdated render

    for (let i = 0; i < elements.length; i++) {
      if (token !== currentRenderToken) return true;

      const element = elements[i];
      // Get raw code from data-raw attribute
      const rawCode = element.dataset.raw ? decodeURIComponent(element.dataset.raw) : element.textContent || '';

      if (!rawCode.trim()) continue;

      const uniqueId = `mermaid-svg-${Date.now()}-${i}`;

      try {
        // Validate syntax first if supported or directly render
        const { svg } = await mermaid.render(uniqueId, rawCode.trim());
        if (token !== currentRenderToken) return true;

        element.innerHTML = svg;
        element.classList.add('rendered');
      } catch (err: any) {
        if (token !== currentRenderToken) return true;
        hasError = true;
        
        // Clean up any stray error elements created by mermaid in body
        const strayError = document.getElementById('d' + uniqueId);
        if (strayError) strayError.remove();

        const errMsg = err?.message || '語法未完成或錯誤';
        element.innerHTML = `
          <div class="mermaid-error">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Mermaid 圖表解析中 (${errMsg.split('\n')[0]})</span>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('Failed to load or render Mermaid:', err);
    return false;
  }

  return !hasError;
}
