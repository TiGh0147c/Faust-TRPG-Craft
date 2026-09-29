type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="page">
      <h1>{title}</h1>
      <p className="lead">{description}</p>
      <p className="note">这一页的功能会在后续步骤接入。</p>
    </section>
  )
}
