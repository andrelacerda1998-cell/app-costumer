import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DialogContextProps {
  isOpen: boolean;
  openDialog: (content: ContentProps) => void;
  closeDialog: () => void;
  content: ContentProps | null;
}

interface ContentProps {
  icon?: ReactNode;
  title?: string;
  subtitle?: string;
  successButtonText?: string;
  cancelButtonText?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  customContent?: ReactNode;
  closeOnClickOutside?: boolean;
  animationType?: 'none' | 'slide' | 'fade';
  closeAfterMSeconds?: number;
  onClose?: () => void;
}

const DialogContext = createContext<DialogContextProps | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<ContentProps | null>(null);

  const openDialog = (content: ContentProps) => {
    setContent(content);
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setContent(null);
    if (content?.onClose) content.onClose();
  };

  return (
    <DialogContext.Provider value={{ isOpen, openDialog, closeDialog, content }}>
      {children}
    </DialogContext.Provider>
  );
};

export const useDialog = (): DialogContextProps => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};