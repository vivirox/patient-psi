import { useEffect } from 'react';

export function useAutoResizeTextarea(
  textarea: HTMLTextAreaElement | null,
  value: string
) {
  useEffect(() => {
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      const maxHeight = 200; // 5 rows approximately
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
      
      // Show/hide scrollbar based on content height
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    };

    // Adjust on value change
    adjustHeight();

    // Adjust on window resize
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [textarea, value]);
}
