import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AppLayout } from "./components/layout/AppLayout.tsx"
import { CatalogProvider } from "./features/storage/CatalogProvider.tsx"
import { CollectionsPage } from "./pages/CollectionsPage.tsx"
import { DicePage } from "./pages/DicePage.tsx"
import { EntriesPage } from "./pages/EntriesPage.tsx"
import { GeneratorsPage } from "./pages/GeneratorsPage.tsx"
import { HistoryPage } from "./pages/HistoryPage.tsx"
import { HomePage } from "./pages/HomePage.tsx"
import { SettingsPage } from "./pages/SettingsPage.tsx"
import { StoragePage } from "./pages/StoragePage.tsx"
import { TablesPage } from "./pages/TablesPage.tsx"

const basename = import.meta.env.BASE_URL.replace(/\/$/, "")

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <CatalogProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="dice" element={<DicePage />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="entries" element={<EntriesPage />} />
            <Route path="generators" element={<GeneratorsPage />} />
            <Route path="collections" element={<CollectionsPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="storage" element={<StoragePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </CatalogProvider>
    </BrowserRouter>
  )
}
