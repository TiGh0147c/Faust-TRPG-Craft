import { useContext } from "react"
import { CatalogContext, type CatalogValue } from "./catalogContext.ts"

export function useCatalog(): CatalogValue {
  const catalog = useContext(CatalogContext)
  if (!catalog) throw new Error("useCatalog 必须在 CatalogProvider 内使用。")
  return catalog
}
