export const cx = (...c: (string | false | null | undefined)[]): string =>
  c.filter(Boolean).join(' ')

export const inputClass =
  'h-8 w-full rounded-md border border-control bg-surface px-2.5 placeholder:text-faint focus:border-transparent focus:outline-2 focus:outline-solid focus:-outline-offset-1 focus:outline-accent'
