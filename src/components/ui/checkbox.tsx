import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
      if (props.onChange) {
        props.onChange(e);
      }
    };

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          className="sr-only peer"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(
            'h-4 w-4 shrink-0 rounded-sm border border-slate-300 bg-white peer-focus:ring-2 peer-focus:ring-blue-600 peer-focus:ring-offset-2 peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            className
          )}
        >
          {checked && (
            <Check className="h-4 w-4 text-white" strokeWidth={3} />
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };