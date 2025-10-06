"use client";

import React from "react";

type Props = {
  action: string;
  method?: "post" | "get";
  className?: string;
  label?: string;
  confirmMessage?: string;
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
};

export default function DeleteFormButton({
  action,
  method = "post",
  className,
  label = "Delete",
  confirmMessage = "Delete this item?",
  buttonProps,
}: Props) {
  const onClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    // Confirm client-side before allowing form submit
    // If user cancels, prevent the submission
    // eslint-disable-next-line no-alert
    if (!confirm(confirmMessage)) {
      e.preventDefault();
    }
  };

  return (
    <form action={action} method={method}>
      <button type="submit" className={className} onClick={onClick} {...buttonProps}>
        {label}
      </button>
    </form>
  );
}
