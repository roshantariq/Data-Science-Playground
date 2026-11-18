import { useState } from 'react'

/**
 * Phones only: parts marked with `extra` stay hidden until "Show more" is
 * pressed. On wider screens everything shows and the button is hidden (CSS).
 */
export function useShowMore() {
  const [open, setOpen] = useState(false)
  return {
    extra: open ? undefined : 'phone-hidden',
    button: (
      <button
        type="button"
        className="show-more"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Show less' : 'Show more'}
      </button>
    ),
  }
}
