import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react"

export function cardClass(selected: boolean, dragging: boolean): string {
  return ["compare-card", selected ? "is-selected" : "", dragging ? "is-dragging" : ""].filter(Boolean).join(" ")
}

export function moveListItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items]
  const next = [...items]
  const [item] = next.splice(from, 1)
  if (item === undefined) return [...items]
  next.splice(to, 0, item)
  return next
}

export function movedSelection(selected: number, from: number, to: number): number {
  if (selected === from) return to
  if (from < selected && to >= selected) return selected - 1
  if (from > selected && to <= selected) return selected + 1
  return selected
}

export function useListFlip(containerRef: RefObject<HTMLElement | null>) {
  const previous = useRef<Map<string, number> | null>(null)
  const signature = useRef("")

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) {
      previous.current = null
      signature.current = ""
      return
    }
    const cards = [...container.querySelectorAll<HTMLElement>("[data-card-key]")]
    for (const card of cards) card.getAnimations().forEach((animation) => animation.cancel())
    const current = new Map<string, number>()
    const keys: string[] = []
    for (const card of cards) {
      const key = card.dataset.cardKey
      if (!key) continue
      keys.push(key)
      current.set(key, card.offsetLeft)
    }
    const nextSignature = keys.join("|")
    if (previous.current && signature.current !== nextSignature) {
      for (const card of cards) {
        const key = card.dataset.cardKey
        const before = key ? previous.current.get(key) : undefined
        const after = key ? current.get(key) : undefined
        if (before === undefined || after === undefined) continue
        const dx = before - after
        if (Math.abs(dx) < 1) continue
        card.animate([{ transform: `translateX(${dx}px)` }, { transform: "translateX(0)" }], {
          duration: 180,
          easing: "ease",
        })
      }
    }
    signature.current = nextSignature
    previous.current = current
  })
}

export function useRevealRowEnd(containerRef: RefObject<HTMLElement | null>, count: number) {
  const previous = useRef(count)

  useLayoutEffect(() => {
    if (count > previous.current) {
      const container = containerRef.current
      if (container) container.scrollLeft = container.scrollWidth
    }
    previous.current = count
  }, [containerRef, count])
}

function insertionIndex(container: HTMLElement, pointer: number, from: number): number | null {
  const cards = [...container.querySelectorAll<HTMLElement>("[data-card-index]")]
  let next = from
  for (const card of cards) {
    const index = Number(card.dataset.cardIndex)
    if (!Number.isInteger(index) || index === from) continue
    const mid = card.offsetLeft + card.offsetWidth / 2
    if (from < index && pointer >= mid) next = index
    if (from > index && pointer < mid) return index
  }
  return next
}

export function useCardReorder(onMove: (from: number, to: number) => void) {
  const [dragging, setDragging] = useState<number | null>(null)
  const fromRef = useRef<number | null>(null)
  const movedRef = useRef(false)
  const ghostRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    return () => {
      ghostRef.current?.remove()
      ghostRef.current = null
    }
  }, [])

  function onPointerDown(index: number, event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return
    const target = event.target
    if (target instanceof Element && target.closest(".compare-card-remove, .compare-card-add")) return
    const card = event.currentTarget
    const startX = event.clientX
    const startY = event.clientY
    const pointerId = event.pointerId
    fromRef.current = index
    movedRef.current = false

    function onMovePointer(ev: PointerEvent) {
      if (ev.pointerId !== pointerId || fromRef.current === null) return
      if (!movedRef.current && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 8) return
      const container = card.parentElement
      if (!movedRef.current) {
        movedRef.current = true
        const rect = card.getBoundingClientRect()
        const ghost = card.cloneNode(true)
        if (!(ghost instanceof HTMLElement)) return
        ghost.classList.remove("is-dragging")
        ghost.classList.add("compare-card-ghost")
        ghost.style.width = `${rect.width}px`
        ghost.style.left = `${rect.left}px`
        ghost.style.top = `${rect.top}px`
        document.body.appendChild(ghost)
        ghostRef.current = ghost
        ghost.dataset.offsetX = String(ev.clientX - rect.left)
        ghost.dataset.offsetY = String(ev.clientY - rect.top)
        setDragging(fromRef.current)
      }
      const ghost = ghostRef.current
      if (ghost) {
        const offsetX = Number(ghost.dataset.offsetX)
        const offsetY = Number(ghost.dataset.offsetY)
        ghost.style.left = `${ev.clientX - offsetX}px`
        ghost.style.top = `${ev.clientY - offsetY}px`
      }
      if (!container) return
      const bounds = container.getBoundingClientRect()
      if (ev.clientX > bounds.right - 36) container.scrollLeft += 14
      if (ev.clientX < bounds.left + 36) container.scrollLeft -= 14
      const pointer = ev.clientX - bounds.left + container.scrollLeft
      const to = insertionIndex(container, pointer, fromRef.current)
      if (to !== null && to !== fromRef.current) {
        const from = fromRef.current
        fromRef.current = to
        setDragging(to)
        onMove(from, to)
      }
      if (ghost) {
        const indexLabel = ghost.querySelector(".compare-card-index")
        if (indexLabel && fromRef.current !== null) indexLabel.textContent = `${fromRef.current + 1}.`
      }
    }

    function onUp(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return
      window.removeEventListener("pointermove", onMovePointer)
      window.removeEventListener("pointerup", onUp)
      ghostRef.current?.remove()
      ghostRef.current = null
      if (movedRef.current) {
        const suppress = (click: Event) => {
          click.preventDefault()
          click.stopPropagation()
          window.removeEventListener("click", suppress, true)
        }
        window.addEventListener("click", suppress, true)
      }
      fromRef.current = null
      movedRef.current = false
      setDragging(null)
    }

    window.addEventListener("pointermove", onMovePointer)
    window.addEventListener("pointerup", onUp)
  }

  return { dragging, onPointerDown }
}
