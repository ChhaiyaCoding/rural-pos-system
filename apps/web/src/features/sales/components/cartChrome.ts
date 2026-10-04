import { createContext, useContext } from 'react'

/** How the cart is presented: the phone sheet (light, header provided by the
 *  Sheet) or the iPad sidebar (dark, own header). Presentational only. */
export interface CartChrome {
  tone:   'light' | 'dark'
  header: boolean
}

export const CartChromeContext = createContext<CartChrome>({ tone: 'light', header: true })

export function useCartChrome(): CartChrome {
  return useContext(CartChromeContext)
}
