import "@testing-library/jest-dom/vitest"
import { cleanup, configure } from "@testing-library/react"
import { afterEach } from "vitest"

// jsdom lacks these browser APIs; cmdk (command lists) uses them.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Element.prototype.scrollIntoView ??= function () {}
// No layout in jsdom: every media query is "narrow" unless a test overrides it.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }) as MediaQueryList

// The first render in a file can be slow on a busy machine (cold module
// transforms); 1 s, the default, made that first test flaky, and 3 s was
// still too short for pages that load in steps (reports: project, releases,
// then the report) during the full sequential run.
configure({ asyncUtilTimeout: 8000 })

afterEach(() => {
  cleanup()
})
