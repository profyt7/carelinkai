/**
 * @jest-environment jsdom
 *
 * OL-208 — a bottom bar publishes its height as --bottom-stack-offset on <body>;
 * bars add up; unmounting (or disabling) removes the property so widgets fall back to 0.
 */
import { useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useBottomStackOffset } from '@/hooks/useBottomStackOffset';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Bar({ id, height, enabled = true }: { id: string; height: number; enabled?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useBottomStackOffset(ref, id, enabled);
  return (
    <nav
      ref={(el) => {
        if (el) Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => height });
        (ref as { current: HTMLElement | null }).current = el;
      }}
    />
  );
}

const offset = () => document.body.style.getPropertyValue('--bottom-stack-offset');

describe('useBottomStackOffset', () => {
  let host: HTMLDivElement;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => host.remove());

  it('sets the bar height on body, sums bars, and clears on unmount', () => {
    const root = createRoot(host);
    act(() => root.render(<Bar id="tab" height={64} />));
    expect(offset()).toBe('64px');
    act(() => root.render(<><Bar id="tab" height={64} /><Bar id="cta" height={72} /></>));
    expect(offset()).toBe('136px');
    act(() => root.unmount());
    expect(offset()).toBe('');
  });

  it('a hidden (0px) or disabled bar leaves the property unset', () => {
    const root = createRoot(host);
    act(() => root.render(<Bar id="tab" height={0} />));
    expect(offset()).toBe('');
    act(() => root.render(<Bar id="tab" height={64} enabled={false} />));
    expect(offset()).toBe('');
    act(() => root.unmount());
  });
});
