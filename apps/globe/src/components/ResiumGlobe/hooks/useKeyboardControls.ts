import { useEffect } from 'react';
import { SELECTION_KEY_CODE } from '../utils/constants';

interface UseKeyboardControlsProps {
  onSelectionKeyPressed: () => void;
  isActivated: boolean;
}

/**
 * Hook to handle keyboard events for the globe component
 * Listens for the SPACE key to trigger area selection
 */
export const useKeyboardControls = ({
  onSelectionKeyPressed,
  isActivated,
}: UseKeyboardControlsProps) => {
  useEffect(() => {
    if (!isActivated) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the key is SPACE
      if (event.code === SELECTION_KEY_CODE || event.key === ' ') {
        // Prevent default behavior (page scrolling)
        event.preventDefault();

        // Trigger selection
        onSelectionKeyPressed();
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSelectionKeyPressed, isActivated]);
};
