import { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const ConfirmContext = createContext(null);

/**
 * const confirm = useConfirm();
 * const ok = await confirm({ title, description, confirmText, destructive, input });
 *
 * Resolves to false when cancelled. With `input: { label, placeholder }` it
 * resolves to the typed text (possibly ''), otherwise to true.
 */
export const ConfirmProvider = ({ children }) => {
  const [options, setOptions] = useState(null);
  const [text, setText] = useState('');
  const resolver = useRef(null);

  const confirm = useCallback((opts) => {
    setText('');
    setOptions(opts);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={!!options} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description && (
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">{options.description}</div>
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          {options?.input && (
            <div className="space-y-2">
              <Label htmlFor="confirm-input">{options.input.label}</Label>
              <Textarea
                id="confirm-input"
                value={text}
                maxLength={500}
                placeholder={options.input.placeholder}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{options?.cancelText || 'Cancel'}</AlertDialogCancel>
            <Button
              variant={options?.destructive ? 'destructive' : 'default'}
              onClick={() => close(options?.input ? text.trim() : true)}
            >
              {options?.confirmText || 'Confirm'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
};
