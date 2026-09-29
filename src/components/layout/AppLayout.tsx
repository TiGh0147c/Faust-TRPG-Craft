import { NavLink, Outlet } from "react-router-dom"
import { useCatalog } from "../../features/storage/useCatalog.ts"
import { appRoutes } from "../../routes.ts"

export function AppLayout() {
  const catalog = useCatalog()
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink to="/" className="brand" end>
            Faust TRPG Craft
            <small>轻量跑团工具</small>
          </NavLink>
          <nav className="nav" aria-label="主导航">
            {appRoutes.map((route) => (
              <NavLink key={route.path} to={route.path} end={route.end}>
                {route.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main>
        {catalog.storageError ? (
          <p className="form-error storage-banner" role="alert">
            {catalog.storageError}
          </p>
        ) : null}
        <Outlet />
      </main>
    </div>
  )
}
