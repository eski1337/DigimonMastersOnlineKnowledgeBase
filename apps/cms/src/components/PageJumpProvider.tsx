import React, { useEffect, useCallback, useRef } from 'react';

const PAGE_JUMP_ID = 'dmo-page-jump';

const PageJumpProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const observerRef = useRef<MutationObserver | null>(null);

  const injectPageJump = useCallback(() => {
    const paginators = document.querySelectorAll('.paginator');

    paginators.forEach((paginator) => {
      // Skip if already injected
      if (paginator.querySelector(`#${PAGE_JUMP_ID}`)) return;

      // Find the total pages from the last Page button
      const pageButtons = paginator.querySelectorAll('.paginator__page');
      if (pageButtons.length === 0) return;

      const lastPageBtn = pageButtons[pageButtons.length - 1];
      const totalPages = parseInt(lastPageBtn?.textContent?.trim() || '0', 10);
      if (!totalPages || totalPages <= 1) return;

      // Find current page
      const currentBtn = paginator.querySelector('.paginator__page--is-current');
      const currentPage = parseInt(currentBtn?.textContent?.trim() || '1', 10);

      // Create the page jump container
      const container = document.createElement('div');
      container.id = PAGE_JUMP_ID;
      container.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-left:16px;';

      const label = document.createElement('span');
      label.textContent = 'Go to';
      label.style.cssText = 'font-size:12px;color:var(--theme-elevation-400);white-space:nowrap;';

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.max = String(totalPages);
      input.value = String(currentPage);
      input.style.cssText = [
        'width:60px',
        'padding:4px 8px',
        'font-size:13px',
        'text-align:center',
        'background:var(--theme-input-bg)',
        'color:var(--theme-text)',
        'border:1px solid var(--theme-elevation-150)',
        'border-radius:4px',
        'outline:none',
      ].join(';');

      const ofLabel = document.createElement('span');
      ofLabel.textContent = `of ${totalPages}`;
      ofLabel.style.cssText = 'font-size:12px;color:var(--theme-elevation-400);white-space:nowrap;';

      const goBtn = document.createElement('button');
      goBtn.textContent = 'Go';
      goBtn.type = 'button';
      goBtn.style.cssText = [
        'padding:4px 12px',
        'font-size:12px',
        'font-weight:600',
        'background:var(--dmo-accent, #ff7a18)',
        'color:var(--dmo-accent-fg, #0b0d12)',
        'border:none',
        'border-radius:4px',
        'cursor:pointer',
      ].join(';');

      const navigate = () => {
        const page = parseInt(input.value, 10);
        if (isNaN(page) || page < 1 || page > totalPages) return;
        // Update URL query param — Payload reads ?page=N
        const url = new URL(window.location.href);
        url.searchParams.set('page', String(page));
        window.history.pushState({}, '', url.toString());
        // Dispatch popstate to trigger react-router update
        window.dispatchEvent(new PopStateEvent('popstate'));
        // Fallback: if popstate doesn't work, reload
        setTimeout(() => {
          if (window.location.search.includes(`page=${page}`)) {
            // Check if the paginator updated
            const newCurrent = document.querySelector('.paginator .paginator__page--is-current');
            const newPage = parseInt(newCurrent?.textContent?.trim() || '0', 10);
            if (newPage !== page) {
              window.location.href = url.toString();
            }
          }
        }, 300);
      };

      goBtn.addEventListener('click', navigate);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          navigate();
        }
      });

      input.addEventListener('focus', () => {
        input.style.borderColor = 'var(--dmo-accent, #ff7a18)';
      });
      input.addEventListener('blur', () => {
        input.style.borderColor = 'var(--theme-elevation-150)';
      });

      container.appendChild(label);
      container.appendChild(input);
      container.appendChild(ofLabel);
      container.appendChild(goBtn);
      paginator.appendChild(container);
    });
  }, []);

  useEffect(() => {
    // Initial injection after a short delay for Payload to render
    const timer = setTimeout(injectPageJump, 200);

    // Watch for DOM changes (page navigation, list re-renders)
    observerRef.current = new MutationObserver(() => {
      requestAnimationFrame(injectPageJump);
    });
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [injectPageJump]);

  return <>{children}</>;
};

export default PageJumpProvider;
