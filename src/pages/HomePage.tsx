import { Link } from "react-router-dom"
import { appRoutes } from "../routes.ts"

const tools = appRoutes.filter((route) => route.path !== "/")

export function HomePage() {
  return (
    <section className="page">
      <h1>首页</h1>
      <p className="lead">
        用骰子、集合、词条、随机表和生成器跑团。数据留在这台浏览器里。
      </p>
      <div className="card-grid">
        {tools.map((tool) => (
          <Link key={tool.path} className="card" to={tool.path}>
            <h2>{tool.label}</h2>
            <p>{tool.description}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
