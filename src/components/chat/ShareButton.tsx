import { useState } from 'react';
import { Button } from '../ui/button';
import { Share } from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonProps {
  chatId: string;
}

export function ShareButton({ chatId }: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const shareChat = async () => {
    setIsSharing(true);
    try {
      const response = await fetch('/api/chat/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: chatId }),
      });

      if (!response.ok) {
        throw new Error('Failed to share chat');
      }

      const { sharePath } = await response.json();
      const shareUrl = `${window.location.origin}/share/${chatId}`;
      
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch (error) {
      console.error('Error sharing chat:', error);
      toast.error('Failed to share chat');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={shareChat}
      disabled={isSharing}
    >
      <Share className="h-4 w-4" />
      <span className="sr-only">Share chat</span>
    </Button>
  );
}
