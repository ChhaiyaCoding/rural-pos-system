/* Where a shop owner gets help. Set in the Vercel project settings (not
   secret): NEXT_PUBLIC_SUPPORT_TELEGRAM = Telegram username without "@",
   NEXT_PUBLIC_SUPPORT_PHONE = phone number. Empty = the help card is hidden. */
export const SUPPORT = {
  telegram: (process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM ?? '').replace(/^@/, ''),
  phone:    process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? '',
}

/** Short build id shown to the shop, so support knows which version they run */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'dev'
