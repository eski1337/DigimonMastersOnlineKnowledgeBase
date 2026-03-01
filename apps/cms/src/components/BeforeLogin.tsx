import React, { useEffect } from 'react';

const BeforeLogin: React.FC = () => {
  useEffect(() => {
    const patchLoginForm = () => {
      // 1. Add novalidate to ALL forms — prevents browser email validation
      //    even if React re-renders reset input type back to "email".
      //    This is the critical fix: novalidate is not React-controlled.
      document.querySelectorAll('form').forEach((form) => {
        form.setAttribute('novalidate', 'true');
      });

      // 2. Change email inputs to text (best-effort, may be overwritten by React)
      document.querySelectorAll('input[type="email"]').forEach((input) => {
        const el = input as HTMLInputElement;
        el.setAttribute('type', 'text');
        el.placeholder = 'Username or Email';
        el.autocomplete = 'username';
      });

      // 3. Update label text
      document.querySelectorAll('label').forEach((label) => {
        const text = label.textContent?.trim().toLowerCase();
        if (text === 'email' || text === 'email *' || text === 'email address') {
          label.textContent = 'Email or Username';
        }
      });

      // 4. Add formnovalidate to submit buttons
      document.querySelectorAll('button[type="submit"], input[type="submit"]').forEach((btn) => {
        btn.setAttribute('formnovalidate', 'true');
      });
    };

    // Run immediately + after short delay (Payload renders async)
    patchLoginForm();
    setTimeout(patchLoginForm, 100);
    setTimeout(patchLoginForm, 500);
    setTimeout(patchLoginForm, 1500);

    // MutationObserver for ongoing React re-renders
    const observer = new MutationObserver(() => {
      requestAnimationFrame(patchLoginForm);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Polling fallback
    const interval = setInterval(patchLoginForm, 1000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return null;
};

export default BeforeLogin;
