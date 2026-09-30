import { Link } from "react-router-dom"
import { appRoutes } from "../routes.ts"

const tools = appRoutes.filter((route) => route.path !== "/")

export function HomePage() {
  return (
    <section className="page">
      <h1>首页</h1>
      <p className="lead">
        在浏览器里使用骰子、集合、词条、随机表和生成器。数据留在本机，线上从 faustknowsall.cc 打开。
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
