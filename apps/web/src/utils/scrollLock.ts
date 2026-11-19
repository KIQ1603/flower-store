let lockCount = 0;

/** Locks page scroll; nested overlays are reference-counted. */
export function lockScroll() {
  lockCount += 1;
  document.body.style.overflow = "hidden";
}

export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = "";
  }
}
